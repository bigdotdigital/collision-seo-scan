import { prisma } from '@/lib/prisma';

export type StripeWebhookEvent = {
  type: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

function fromUnix(value: unknown): Date | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

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
  const isSubscriptionEvent = event.type.startsWith('customer.subscription.');
  const isInvoiceEvent = event.type.startsWith('invoice.');

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

  if (isSubscriptionEvent) {
    const status = String(object.status || 'trialing');
    const planTier = String(
      (object as { metadata?: { plan_tier?: string } }).metadata?.plan_tier || 'monitor'
    );
    const currentPeriodStart = fromUnix((object as { current_period_start?: unknown }).current_period_start);
    const currentPeriodEnd = fromUnix((object as { current_period_end?: unknown }).current_period_end);
    const trialEndsAt = fromUnix((object as { trial_end?: unknown }).trial_end);
    const cancelAtPeriodEnd = Boolean(
      (object as { cancel_at_period_end?: unknown }).cancel_at_period_end || false
    );

    await prisma.subscription.upsert({
      where: { orgId: org.id },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || undefined,
        status,
        planTier,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt,
        cancelAtPeriodEnd
      },
      create: {
        orgId: org.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || undefined,
        status,
        planTier,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt,
        cancelAtPeriodEnd
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
  }

  if (isInvoiceEvent) {
    const invoiceId = String((object as { id?: unknown }).id || '');
    const invoiceSubscriptionId = String((object as { subscription?: unknown }).subscription || subscriptionId || '');
    const linePeriodStart = fromUnix(
      (object as { lines?: { data?: Array<{ period?: { start?: unknown } }> } }).lines?.data?.[0]?.period?.start
    );
    const linePeriodEnd = fromUnix(
      (object as { lines?: { data?: Array<{ period?: { end?: unknown } }> } }).lines?.data?.[0]?.period?.end
    );

    if (invoiceSubscriptionId || linePeriodStart || linePeriodEnd) {
      await prisma.subscription.upsert({
        where: { orgId: org.id },
        update: {
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: invoiceSubscriptionId || undefined,
          currentPeriodStart: linePeriodStart || undefined,
          currentPeriodEnd: linePeriodEnd || undefined
        },
        create: {
          orgId: org.id,
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: invoiceSubscriptionId || undefined,
          currentPeriodStart: linePeriodStart || undefined,
          currentPeriodEnd: linePeriodEnd || undefined
        }
      });

      await prisma.organization.update({
        where: { id: org.id },
        data: {
          stripeCustomerId: customerId || undefined,
          stripeSubscriptionId: invoiceSubscriptionId || undefined
        }
      });
    }

    if (invoiceId) {
      const amountCents = Number(
        (object as { amount_paid?: unknown; amount_due?: unknown }).amount_paid ||
          (object as { amount_due?: unknown }).amount_due ||
          0
      );
      const currency = String((object as { currency?: unknown }).currency || 'usd');
      const invoiceDate =
        fromUnix((object as { status_transitions?: { paid_at?: unknown } }).status_transitions?.paid_at) ||
        fromUnix((object as { created?: unknown }).created) ||
        new Date();
      const hostedInvoiceUrl = String(
        (object as { hosted_invoice_url?: unknown }).hosted_invoice_url || ''
      );
      const pdfUrl = String((object as { invoice_pdf?: unknown }).invoice_pdf || '');
      const invoiceStatus = String((object as { status?: unknown }).status || 'open');

      await prisma.invoice.upsert({
        where: { stripeInvoiceId: invoiceId },
        update: {
          amountCents: Number.isFinite(amountCents) ? amountCents : 0,
          currency,
          status: invoiceStatus,
          invoiceDate,
          hostedInvoiceUrl: hostedInvoiceUrl || null,
          pdfUrl: pdfUrl || null
        },
        create: {
          orgId: org.id,
          stripeInvoiceId: invoiceId,
          amountCents: Number.isFinite(amountCents) ? amountCents : 0,
          currency,
          status: invoiceStatus,
          invoiceDate,
          hostedInvoiceUrl: hostedInvoiceUrl || null,
          pdfUrl: pdfUrl || null
        }
      });
    }
  }

  return { ok: true as const, orgId: org.id };
}
