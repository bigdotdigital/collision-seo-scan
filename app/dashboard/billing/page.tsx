import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { BillingCard } from '@/components/billing-card';
import { getStripeCustomerPortalUrl } from '@/lib/stripe';
import { BillingActions } from '@/components/billing-actions';

export const dynamic = 'force-dynamic';

export default async function DashboardBillingPage() {
  const ctx = await requireDashboardContext();
  const bookCallUrl = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';

  const [subscription, invoices] = await Promise.all([
    prisma.subscription.findUnique({
      where: { orgId: ctx.orgId }
    }),
    prisma.invoice.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { invoiceDate: 'desc' },
      take: 12
    })
  ]);

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Choose self-serve trial or book a setup call. We can onboard and tailor your dashboard either way."
      />

      <BillingActions
        hasSubscription={Boolean(subscription)}
        portalUrl={getStripeCustomerPortalUrl(subscription?.stripeCustomerId)}
        bookCallUrl={bookCallUrl}
      />

      <BillingCard
        plan={subscription?.planTier || 'monitor'}
        status={subscription?.status || 'trialing'}
        trialEndsAt={subscription?.trialEndsAt?.toLocaleDateString() || null}
        nextBillingDate={subscription?.currentPeriodEnd?.toLocaleDateString() || null}
        portalUrl={getStripeCustomerPortalUrl(subscription?.stripeCustomerId)}
      />

      <article className="card mt-4 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Invoice History</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {invoices.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">No synced invoices yet.</p>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{invoice.invoiceDate.toLocaleDateString()}</span>
                <span>{(invoice.amountCents / 100).toFixed(2)} USD</span>
                <span className="capitalize text-slate-600">{invoice.status}</span>
              </div>
            ))
          )}
        </div>
      </article>
    </div>
  );
}
