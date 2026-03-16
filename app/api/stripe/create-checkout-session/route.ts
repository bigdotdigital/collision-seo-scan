import { NextResponse } from 'next/server';
import {
  ensureSelfServeOrg,
  ensureStripeCustomer,
  ensureUserMembershipForOrg,
  existingBillingPortalUrl,
  loadCheckoutOrg,
  loadRequestedScan,
  resolveOrgContext,
  seedOrgFromRequestedScan
} from '@/lib/billing-checkout';
import { consumeRequestThrottle } from '@/lib/request-throttle';
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

function requestIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
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
    const throttle = consumeRequestThrottle({
      bucket: 'checkout-start',
      keyParts: [publicData.email, requestIp(req), publicData.orgId, publicData.scanId],
      limit: 8,
      windowMs: 15 * 60 * 1000
    });
    if (!throttle.ok) {
      return NextResponse.json(
        {
          error: `Too many checkout attempts. Please wait about ${throttle.retryAfterSeconds} seconds and try again.`
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(throttle.retryAfterSeconds)
          }
        }
      );
    }

    let requestedOrgId = '';
    let requestedScan = null;

    if (publicData.scanId) {
      requestedScan = await loadRequestedScan(publicData.scanId);
      if (!requestedScan?.organizationId) {
        return NextResponse.json({ error: 'Invalid scan context for trial checkout.' }, { status: 400 });
      }
      if (requestedOrgId && requestedOrgId !== requestedScan.organizationId) {
        return NextResponse.json({ error: 'Mismatched org context.' }, { status: 400 });
      }
      requestedOrgId = requestedScan.organizationId;
    }
    if (!requestedOrgId && publicData.orgId && sessionCtx?.orgId === publicData.orgId) {
      requestedOrgId = publicData.orgId;
    }

    let ctx = sessionCtx;
    if (requestedOrgId) {
      ctx = {
        orgId: requestedOrgId,
        email: publicData.email || sessionCtx?.email || requestedScan?.email || null
      };
    }

    if (!ctx) {
      let orgId = requestedOrgId;
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
          name: publicData.name,
          shopId: requestedScan?.shopId || null
        });
        if (!created.ok) {
          return NextResponse.json(
            {
              error:
                created.reason === 'weak_password'
                  ? created.message || 'Use a stronger password to create your account.'
                  : 'Invalid password for existing account. Please log in first.'
            },
            { status: created.reason === 'weak_password' ? 400 : 401 }
          );
        }
        orgId = created.orgId;
      }
      ctx = { orgId, email: publicData.email || null };
    }

    if (
      requestedOrgId &&
      sessionCtx?.orgId !== requestedOrgId &&
      (!publicData.email || !publicData.password)
    ) {
      return NextResponse.json(
        { error: 'Confirm your email + password to continue with this scan workspace.' },
        { status: 401 }
      );
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
          {
            error:
              linked.reason === 'weak_password'
                ? linked.message || 'Use a stronger password to create your account.'
                : 'Invalid password for existing account. Please log in first.'
          },
          { status: linked.reason === 'weak_password' ? 400 : 401 }
        );
      }
    }

    if (requestedScan && requestedScan.organizationId === ctx.orgId) {
      const seeded = await seedOrgFromRequestedScan(ctx.orgId, requestedScan);
      if (seeded?.ok === false && seeded.conflict) {
        return NextResponse.json(
          { error: 'This workspace is already linked to a different shop record. Contact support before using this scan to start billing.' },
          { status: 409 }
        );
      }
    }

    const checkoutOrg = await loadCheckoutOrg(ctx.orgId);
    if (!checkoutOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const { org, subscription } = checkoutOrg;

    if (subscription && ['trialing', 'active', 'past_due', 'incomplete'].includes(subscription.status)) {
      const portalUrl = await existingBillingPortalUrl(org.stripeCustomerId);
      return NextResponse.json(
        {
          error: 'This organization already has billing set up. Use Manage Billing instead.',
          portalUrl: portalUrl || '/api/stripe/create-portal-session?returnTo=/dashboard/billing'
        },
        { status: 409 }
      );
    }

    const customerId = await ensureStripeCustomer({
      orgId: org.id,
      orgName: publicData.name || org.name || 'Shop SEO Scan Client',
      email: ctx.email,
      stripeCustomerId: org.stripeCustomerId,
      stripePost
    });
    if (typeof customerId !== 'string') {
      return NextResponse.json({ error: customerId.error || 'Unable to create billing profile' }, { status: 502 });
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
    form.set('success_url', withBase('/dashboard/onboarding?checkout=success'));
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
