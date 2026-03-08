import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { PageHeader } from '@/components/page-header';
import { getStripeCustomerPortalUrl } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export default async function DashboardBillingPage() {
  const ctx = await requireDashboardContext();

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
  const portalUrl = getStripeCustomerPortalUrl(subscription?.stripeCustomerId);

  return (
    <div>
      <PageHeader title="Plans & Billing" subtitle="" eyebrow="Organization Settings" />

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Current subscription</p>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-5xl font-semibold text-white">{plan === 'monitor' ? 'Monitor Plan' : plan}</p>
              <p className="mt-2 text-2xl text-white/65">$49.00 <span className="text-base">/ month</span></p>
            </div>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="dashboard-button"
            >
              Manage Billing
            </a>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/45">Next billing date</p>
              <p className="mt-1 text-3xl text-white">
                {subscription?.currentPeriodEnd?.toLocaleDateString() || 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/45">Status</p>
              <p className="mt-1 text-3xl capitalize text-white">{status}</p>
            </div>
          </div>
        </article>

        <article className="card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[#ff8a93]">Available upgrade</p>
          <p className="mt-3 text-5xl font-semibold text-white">Pro Agency</p>
          <p className="mt-2 text-sm text-white/65">Unlock daily refreshes and white-label reporting.</p>
          <p className="mt-8 text-5xl font-semibold text-white">$199 <span className="text-lg text-white/65">/ mo</span></p>
          <button className="mt-6 w-full rounded-xl bg-[#ff4d5b] px-4 py-3 text-sm font-semibold text-white">
            Upgrade to Pro
          </button>
        </article>
      </div>

      <article className="card overflow-hidden p-6">
        <p className="mb-4 text-xs uppercase tracking-[0.16em] text-white/45">Invoice history</p>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.14em] text-white/45">
              <th className="py-3">Invoice ID</th>
              <th className="py-3">Date</th>
              <th className="py-3">Amount</th>
              <th className="py-3">Status</th>
              <th className="py-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-5 text-white/60">
                  No synced invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-white/8 text-white/80">
                  <td className="py-4 text-lg font-mono">{invoice.stripeInvoiceId || invoice.id}</td>
                  <td className="py-4">{invoice.invoiceDate.toLocaleDateString()}</td>
                  <td className="py-4">${(invoice.amountCents / 100).toFixed(2)}</td>
                  <td className="py-4">
                    <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-xs uppercase tracking-wide">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    {invoice.pdfUrl ? (
                      <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="text-[#ff8a93]">
                        PDF
                      </a>
                    ) : (
                      <span className="text-white/35">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}
