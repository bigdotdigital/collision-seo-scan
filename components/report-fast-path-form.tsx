'use client';

import { useState } from 'react';

type Props = {
  orgId?: string | null;
  scanId: string;
  email?: string | null;
  phone?: string | null;
};

const INTENTS = [
  { value: 'fix_seo', label: 'Fix my SEO' },
  { value: 'redesign', label: 'Redesign my website' },
  { value: 'monitoring', label: 'Monitor weekly ($49/mo)' }
];

export function ReportFastPathForm({ orgId, scanId, email, phone }: Props) {
  const [intent, setIntent] = useState<string>('fix_seo');
  const [budgetRange, setBudgetRange] = useState<string>('');
  const [timeline, setTimeline] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!orgId) {
    return (
      <p className="mt-4 text-xs text-slate-500">
        Lead intake will activate after organization mapping is available.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/lead-intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgId,
          scanId,
          intent,
          budgetRange,
          timeline,
          email: email || '',
          phone: phone || ''
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Unable to submit');

      setMessage('Thanks. We got your priorities and will follow up with a tailored plan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Want Big Dot to fix this?</p>
      <p className="mt-1 text-xs text-slate-600">Quick intake: choose outcome, budget, and timeline.</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {INTENTS.map((item) => (
          <label
            key={item.value}
            className={`cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold ${
              intent === item.value
                ? 'border-teal-700 bg-teal-50 text-teal-800'
                : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="intent"
              value={item.value}
              checked={intent === item.value}
              onChange={() => setIntent(item.value)}
              className="hidden"
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Budget range
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="under_2k">Under $2k</option>
            <option value="2k_5k">$2k-$5k</option>
            <option value="5k_10k">$5k-$10k</option>
            <option value="10k_plus">$10k+</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-700">
          Timeline
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="asap">ASAP</option>
            <option value="30_days">Within 30 days</option>
            <option value="60_90_days">60-90 days</option>
            <option value="researching">Just researching</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Send my priorities'}
        </button>
        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
