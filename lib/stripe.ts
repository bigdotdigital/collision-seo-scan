import { prisma } from '@/lib/prisma';

export type StripeWebhookEvent = {
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

export function getStripeCustomerPortalUrl(customerId?: string | null): string {
  const base = process.env.STRIPE_CUSTOMER_PORTAL_URL;
  if (!base) return '#';
  if (!customerId) return base;

  const u = new URL(base);
  u.searchParams.set('prefilled_customer', customerId);
  return u.toString();
}

export async function syncSubscriptionFromEvent(event: StripeWebhookEvent) {
  const object = event.data?.object || {};
  const customerId = String(object.customer || '');
  const subscriptionId = String(object.id || object.subscription || '');

  if (!customerId) {
    return { ok: false as const, reason: 'missing_customer' as const };
  }

  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { stripeCustomerId: customerId },
        { stripeSubscriptionId: subscriptionId || undefined }
      ]
    },
    select: { id: true }
  });
  if (!org) return { ok: false as const, reason: 'org_not_found' as const };

  const status = String(object.status || 'trialing');
  const planTier = String((object as { metadata?: { plan_tier?: string } }).metadata?.plan_tier || 'monitor');

  await prisma.subscription.upsert({
    where: { orgId: org.id },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId || undefined,
      status,
      planTier
    },
    create: {
      orgId: org.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId || undefined,
      status,
      planTier
    }
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId || undefined,
      planTier
    }
  });

  return { ok: true as const, orgId: org.id };
}

