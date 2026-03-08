import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getAuthedClient,
  getDashboardSession,
  hashPortalPassword,
  setDashboardSession,
  verifyPortalPassword
} from '@/lib/client-auth';
import { getStripeCustomerPortalUrl } from '@/lib/stripe';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const publicCheckoutSchema = z.object({
  orgId: z.string().optional(),
  scanId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8).max(120).optional()
});

type StripeResponse = {
  id?: string;
  url?: string;
  email?: string;
  error?: {
    message?: string;
  };
};

function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

async function stripePost(path: string, form: URLSearchParams): Promise<StripeResponse> {
  const key = process.env.STRIPE_SECRET_KEY || '';
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: form.toString(),
    cache: 'no-store'
  });

  const data = (await res.json().catch(() => null)) as StripeResponse | null;
  if (!res.ok) {
    return {
      error: {
        message: data?.error?.message || 'Stripe request failed'
      }
    };
  }
  return data || {};
}

async function resolveOrgContext() {
  const session = await getDashboardSession();
  if (session?.orgId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true }
    });
    return { orgId: session.orgId, email: user?.email || null };
  }

  const client = await getAuthedClient();
  if (!client) return null;
  const scan = await prisma.scan.findFirst({
    where: { clientId: client.id, organizationId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true }
  });
  if (!scan?.organizationId) return null;
  return { orgId: scan.organizationId, email: client.ownerEmail || null };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

async function ensureSelfServeOrg(input: { email: string; name?: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    }
  });

  if (existingUser) {
    if (!verifyPortalPassword(input.password, existingUser.passwordHash)) {
      return { ok: false as const, reason: 'invalid_password' as const };
    }
    const existingMembership = existingUser.memberships[0];
    if (existingMembership) {
      setDashboardSession({
        userId: existingUser.id,
        orgId: existingMembership.orgId,
        membershipRole: existingMembership.role
      });
      return { ok: true as const, orgId: existingMembership.orgId, email };
    }
  }

  const orgName = input.name?.trim() || `${email.split('@')[0]} Collision`;
  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug: `${slugify(orgName) || 'shop'}-${Math.random().toString(36).slice(2, 8)}`
    }
  });

  const user =
    existingUser ||
    (await prisma.user.create({
      data: {
        email,
        passwordHash: hashPortalPassword(input.password),
        name: input.name?.trim() || orgName,
        isActive: true
      }
    }));

  const membership = await prisma.orgMembership.create({
    data: {
      orgId: org.id,
      userId: user.id,
      role: 'owner',
      status: 'active'
    }
  });

  await prisma.location.create({
    data: {
      orgId: org.id,
      isPrimary: true,
      name: orgName
    }
  });

  await prisma.alertPreference.upsert({
    where: { orgId: org.id },
    update: {},
    create: { orgId: org.id, digestEmail: email }
  });

  setDashboardSession({
    userId: user.id,
    orgId: org.id,
    membershipRole: membership.role
  });

  return { ok: true as const, orgId: org.id, email };
}

async function ensureUserMembershipForOrg(input: {
  orgId: string;
  email: string;
  password: string;
  name?: string;
}) {
  const email = input.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (!verifyPortalPassword(input.password, user.passwordHash)) {
      return { ok: false as const, reason: 'invalid_password' as const };
    }
  } else {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPortalPassword(input.password),
        name: input.name?.trim() || email.split('@')[0],
        isActive: true
      }
    });
  }

  const membership = await prisma.orgMembership.upsert({
    where: {
      orgId_userId: {
        orgId: input.orgId,
        userId: user.id
      }
    },
    update: {
      role: 'owner',
      status: 'active'
    },
    create: {
      orgId: input.orgId,
      userId: user.id,
      role: 'owner',
      status: 'active'
    }
  });

  setDashboardSession({
    userId: user.id,
    orgId: input.orgId,
    membershipRole: membership.role
  });

  return { ok: true as const };
}

export async function POST(req: Request) {
  try {
    const priceId = process.env.STRIPE_PRICE_MONTHLY_ID || '';
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!priceId || !stripeKey) {
      return NextResponse.json(
        { error: 'Billing is not configured yet. Please book a setup call.' },
        { status: 503 }
      );
    }

    const sessionCtx = await resolveOrgContext();
    const reqBody = (await req.json().catch(() => ({}))) as unknown;

    const input = publicCheckoutSchema.safeParse(reqBody);
    const publicData = input.success ? input.data : {};

    let ctx = sessionCtx;
    if (!ctx) {
      let orgId = publicData.orgId || '';
      if (publicData.scanId) {
        const scan = await prisma.scan.findUnique({
          where: { id: publicData.scanId },
          select: { organizationId: true, email: true, shopName: true }
        });
        if (!scan?.organizationId) {
          return NextResponse.json({ error: 'Invalid scan context for trial checkout.' }, { status: 400 });
        }
        if (orgId && orgId !== scan.organizationId) {
          return NextResponse.json({ error: 'Mismatched org context.' }, { status: 400 });
        }
        orgId = scan.organizationId;
      }
      if (!orgId) {
        if (!publicData.email || !publicData.password) {
          return NextResponse.json(
            { error: 'Enter email + password to create your monitoring account.' },
            { status: 401 }
          );
        }
        const created = await ensureSelfServeOrg({
          email: publicData.email,
          password: publicData.password,
          name: publicData.name
        });
        if (!created.ok) {
          return NextResponse.json(
            { error: 'Invalid password for existing account. Please log in first.' },
            { status: 401 }
          );
        }
        orgId = created.orgId;
      }
      ctx = { orgId, email: publicData.email || null };
    }

    if (publicData.email && publicData.password && ctx?.orgId) {
      const linked = await ensureUserMembershipForOrg({
        orgId: ctx.orgId,
        email: publicData.email,
        password: publicData.password,
        name: publicData.name
      });
      if (!linked.ok) {
        return NextResponse.json(
          { error: 'Invalid password for existing account. Please log in first.' },
          { status: 401 }
        );
      }
    }

    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true
      }
    });
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const existingSub = await prisma.subscription.findUnique({
      where: { orgId: org.id },
      select: { status: true }
    });
    if (existingSub && ['trialing', 'active', 'past_due', 'incomplete'].includes(existingSub.status)) {
      return NextResponse.json(
        {
          error: 'This organization already has billing set up. Use Manage Billing instead.',
          portalUrl: getStripeCustomerPortalUrl(org.stripeCustomerId)
        },
        { status: 409 }
      );
    }

    let customerId = org.stripeCustomerId || '';
    if (!customerId) {
      const customerForm = new URLSearchParams();
      customerForm.set('name', publicData.name || org.name || 'Shop SEO Scan Client');
      if (ctx.email) customerForm.set('email', ctx.email);
      customerForm.set('metadata[org_id]', org.id);
      const customer = await stripePost('customers', customerForm);
      if (!customer.id) {
        return NextResponse.json(
          { error: customer.error?.message || 'Unable to create billing profile' },
          { status: 502 }
        );
      }
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const form = new URLSearchParams();
    form.set('mode', 'subscription');
    form.set('customer', customerId);
    form.set('line_items[0][price]', priceId);
    form.set('line_items[0][quantity]', '1');
    form.set('subscription_data[trial_period_days]', '30');
    form.set('subscription_data[metadata][plan_tier]', 'monitor');
    form.set('subscription_data[metadata][org_id]', org.id);
    if (publicData.scanId) form.set('subscription_data[metadata][scan_id]', publicData.scanId);
    form.set('allow_promotion_codes', 'true');
    form.set('success_url', withBase('/dashboard/billing?checkout=success'));
    form.set('cancel_url', withBase('/dashboard/billing?checkout=cancel'));

    const session = await stripePost('checkout/sessions', form);
    if (!session.url) {
      return NextResponse.json(
        { error: session.error?.message || 'Unable to start checkout' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error('[stripe:create-checkout-session:error]', error);
    return NextResponse.json(
      { error: 'Unable to start billing checkout right now.' },
      { status: 500 }
    );
  }
}
