import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { DashboardKpiCard } from '@/components/dashboard-kpi-card';
import { reconcileStripeStateForOrg } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export default async function DashboardBillingPage({
  searchParams
}: {
  searchParams?: { checkout?: string; portal?: string };
}) {
  const ctx = await requireDashboardContext();

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { stripeCustomerId: true, stripeSubscriptionId: true }
  });

  if (org?.stripeCustomerId && (searchParams?.checkout === 'success' || !org.stripeSubscriptionId)) {
    await reconcileStripeStateForOrg(ctx.orgId).catch(() => undefined);
  }

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

  const plan = subscription?.planTier || 'monitor';
  const status = subscription?.status || 'trialing';
  const portalUrl = '/api/stripe/create-portal-session?returnTo=/dashboard/billing';
  const bookCallUrl = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';
  const portalState = searchParams?.portal || '';
  const displayInvoices =
    status === 'trialing'
      ? invoices
          .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())
          .filter((invoice, idx, arr) => {
            if (idx === 0) return true;
            const first = arr[0];
            const sameDay = first.invoiceDate.toDateString() === invoice.invoiceDate.toDateString();
            return !(sameDay && first.amountCents === invoice.amountCents && first.status === invoice.status);
          })
      : invoices;

  return (
    <div className="dashboard-main-inner">
      <PageHeader
        title="Plans & Billing"
        subtitle="Stripe-backed billing state is preserved. This page only reworks the presentation around the existing subscription and invoice records."
        eyebrow="Organization Settings"
        badges={[
          {
            label: `Subscription ${subscription ? 'live' : 'unavailable'}`,
            tone: subscription ? 'live' : 'unknown',
            title: 'Billing state comes from the synced subscription record.'
          },
          {
            label: `Invoices ${displayInvoices.length > 0 ? 'cached' : 'unavailable'}`,
            tone: displayInvoices.length > 0 ? 'cached' : 'unknown',
            title: 'Invoice rows come from synced invoice records already saved in the database.'
          }
        ]}
      />

      {portalState === 'missing-customer' ? (
        <div className="dashboard-panel dashboard-panel-warning mb-4">
          <p className="dashboard-section-title">Billing profile not linked yet</p>
          <p className="dashboard-body-sm mt-1">Start your trial first or use “Add payment method now” from monitoring.</p>
        </div>
      ) : null}
      {portalState === 'error' ? (
        <div className="dashboard-panel dashboard-panel-warning mb-4">
          <p className="dashboard-section-title">Stripe portal unavailable</p>
          <p className="dashboard-body-sm mt-1">Could not open Stripe billing portal right now. Please retry in a minute.</p>
        </div>
      ) : null}

      <section className="mb-5 grid gap-3 lg:grid-cols-4">
        <DashboardKpiCard label="Plan" value={plan === 'monitor' ? 'Monitor' : plan} detail="Current plan tier from the subscription record." tone="accent" />
        <DashboardKpiCard label="Status" value={status} detail="Subscription lifecycle state synced from Stripe." />
        <DashboardKpiCard
          label="Next billing date"
          value={subscription?.currentPeriodEnd?.toLocaleDateString() || 'Pending'}
          detail="Pending means no current period end was saved yet."
        />
        <DashboardKpiCard label="Invoices" value={displayInvoices.length} detail="Deduped invoice rows shown below." />
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="dashboard-panel dashboard-panel-accent">
          <p className="dashboard-label">Current subscription</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--dashboard-text)]">
                {plan === 'monitor' ? 'Monitor Plan' : plan}
              </p>
              <p className="mt-2 text-xl text-[var(--dashboard-text-muted)]">
                $49.00 <span className="text-base">/ month</span>
              </p>
            </div>
            <a href={portalUrl} className="dashboard-button">
              Manage billing
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="dashboard-subpanel rounded-[20px] p-4">
              <p className="dashboard-label">Next billing date</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--dashboard-text)]">
                {subscription?.currentPeriodEnd?.toLocaleDateString() || 'Pending'}
              </p>
            </div>
            <div className="dashboard-subpanel rounded-[20px] p-4">
              <p className="dashboard-label">Status</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-[var(--dashboard-text)]">{status}</p>
            </div>
          </div>
        </article>

        <article className="dashboard-panel">
          <p className="dashboard-label">Available upgrade</p>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--dashboard-text)]">Pro Agency</p>
          <p className="dashboard-body mt-3">Unlock daily refreshes and white-label reporting.</p>
          <p className="mt-8 text-4xl font-semibold text-[var(--dashboard-text)]">
            $199 <span className="text-lg text-[var(--dashboard-text-muted)]">/ mo</span>
          </p>
          <a
            href={bookCallUrl}
            target="_blank"
            rel="noreferrer"
            className="dashboard-button-primary mt-6 w-full"
          >
            Upgrade to Pro
          </a>
        </article>
      </section>

      <section className="dashboard-panel overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--dashboard-border-strong)] px-5 py-4">
          <div>
            <h2 className="dashboard-section-title">Invoice history</h2>
            <p className="dashboard-body-sm mt-1">Rows below come directly from synced invoice records. Missing PDFs stay marked unavailable.</p>
          </div>
          <span className="dashboard-chip">Latest 12</span>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="dashboard-table w-full min-w-[760px] text-sm">
            <thead>
              <tr>
                <th className="py-3 text-left">Invoice ID</th>
                <th className="py-3 text-left">Date</th>
                <th className="py-3 text-left">Amount</th>
                <th className="py-3 text-left">Status</th>
                <th className="py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody>
              {displayInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-5 text-[var(--dashboard-text-muted)]">
                    No synced invoices yet.
                  </td>
                </tr>
              ) : (
                displayInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-4 text-base font-mono text-[var(--dashboard-text)]">
                      {invoice.stripeInvoiceId || invoice.id}
                    </td>
                    <td className="py-4">{invoice.invoiceDate.toLocaleDateString()}</td>
                    <td className="py-4">${(invoice.amountCents / 100).toFixed(2)}</td>
                    <td className="py-4">
                      <span className="dashboard-status dashboard-status-muted">{invoice.status}</span>
                    </td>
                    <td className="py-4 text-right">
                      {invoice.pdfUrl ? (
                        <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="dashboard-inline-link">
                          PDF
                        </a>
                      ) : (
                        <span className="dashboard-status dashboard-status-unknown">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
