'use client';

import { useEffect, useState } from 'react';

export function ReportEmailCapture({ scanId }: { scanId: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(`report-email-dismissed:${scanId}`) === '1') {
      setDismissed(true);
    }
  }, [scanId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/scan/${scanId}/capture-email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to send');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Full report sent. Check your inbox.
      </div>
    );
  }

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`report-email-dismissed:${scanId}`, '1');
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40 p-4 md:items-center md:justify-center">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Continue without email
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-900">Send me the full report</h3>
        <p className="mt-1 text-sm text-slate-600">
          Enter your email and we will send this report plus your 30-day plan.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="owner@shop.com"
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-3 w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          {loading ? 'Sending...' : 'Send full report'}
        </button>
      </form>
    </div>
  );
}
