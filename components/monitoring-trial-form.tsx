'use client';

import { useState } from 'react';

type MonitoringTrialFormProps = {
  scanId?: string;
  orgId?: string;
  defaultEmail?: string;
  defaultName?: string;
  calendlyUrl: string;
  supportEmail: string;
};

export function MonitoringTrialForm({
  scanId,
  orgId,
  defaultEmail,
  defaultName,
  calendlyUrl,
  supportEmail
}: MonitoringTrialFormProps) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [name, setName] = useState(defaultName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startTrial() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scanId,
          orgId,
          email: email || undefined,
          name: name || undefined
        })
      });

      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        setError(data?.error || 'Could not start checkout. Book a call and we will set it up.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not start trial right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card p-6">
      <h2 className="text-lg font-bold text-slate-900">$49/mo monitoring (30-day free trial)</h2>
      <p className="mt-1 text-sm text-slate-600">
        No Zoom required. Start on your own, then email us for dashboard customizations or feedback.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Name (optional)</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Email for billing receipts</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@shop.com"
            type="email"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={startTrial}
          disabled={loading}
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Starting trial...' : 'Start free trial'}
        </button>
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Book optional setup call
        </a>
        <a
          href={`mailto:${supportEmail}?subject=${encodeURIComponent('Dashboard customization help')}`}
          className="inline-flex rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Email support
        </a>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </article>
  );
}
