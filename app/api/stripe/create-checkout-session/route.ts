import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedClient, getDashboardSession } from '@/lib/client-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const publicCheckoutSchema = z.object({
  orgId: z.string().optional(),
  scanId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(120).optional()
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      ctx = { orgId, email: publicData.email || null };
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
