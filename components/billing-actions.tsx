'use client';

import { useMemo, useState } from 'react';

type BillingActionsProps = {
  hasSubscription: boolean;
  portalUrl?: string | null;
  bookCallUrl: string;
};

export function BillingActions({ hasSubscription, portalUrl, bookCallUrl }: BillingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPortal = useMemo(() => Boolean(portalUrl && portalUrl !== '#'), [portalUrl]);

  async function startTrial() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        setError(data?.error || 'Could not start checkout. Try again or book a setup call.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not connect to billing service. Try again in a minute.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">$49/mo Monitor Plan</h2>
          <p className="mt-1 text-sm text-slate-600">
            30-day free trial. Add your card now, cancel anytime before renewal.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Includes a free setup call and monthly SEO consult calls to customize your dashboard to
            your exact needs.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Trial available
        </span>
      </div>

      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>Live dashboard tracking for rankings, competitors, and alert signals</li>
        <li>Weekly trend snapshots and priority task updates</li>
        <li>Want help customizing your dashboard? Book a call with Big Dot today.</li>
      </ul>

      <div className="mt-5 flex flex-wrap gap-2">
        {!hasSubscription ? (
          <button
            onClick={startTrial}
            disabled={loading}
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Starting trial...' : 'Start 30-day free trial'}
          </button>
        ) : null}

        <a
          href={bookCallUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Book setup call
        </a>

        {hasPortal && (
          <a
            href={portalUrl || '#'}
            className="inline-flex rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Manage billing
          </a>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </article>
  );
}
