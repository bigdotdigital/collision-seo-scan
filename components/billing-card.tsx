type BillingCardProps = {
  plan: string;
  status: string;
  trialEndsAt?: string | null;
  nextBillingDate?: string | null;
  portalUrl?: string | null;
};

export function BillingCard({ plan, status, trialEndsAt, nextBillingDate, portalUrl }: BillingCardProps) {
  const hasPortal = Boolean(portalUrl && portalUrl !== '#');
  return (
    <article className="card p-5">
      <h2 className="text-base font-semibold text-slate-900">Subscription</h2>
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <p>
          Plan: <span className="font-semibold capitalize">{plan}</span>
        </p>
        <p>
          Status: <span className="font-semibold capitalize">{status}</span>
        </p>
        <p>Trial ends: {trialEndsAt || 'Not set'}</p>
        <p>Next billing date: {nextBillingDate || 'Not set'}</p>
      </div>
      {hasPortal ? (
        <a
          href={portalUrl || '#'}
          className="mt-4 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Manage Billing
        </a>
      ) : (
        <p className="mt-4 text-xs text-slate-500">
          Billing portal becomes available after checkout is configured.
        </p>
      )}
    </article>
  );
}
