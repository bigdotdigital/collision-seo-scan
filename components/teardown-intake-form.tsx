'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const INTENTS = [
  { value: 'fix_seo', label: 'Fix my SEO' },
  { value: 'redesign', label: 'Redesign my website' },
  { value: 'monitoring', label: 'Monitor weekly ($49/mo)' }
];

type Props = {
  scanId: string;
  orgId: string;
  vertical: string;
  email: string;
  phone: string;
};

export function TeardownIntakeForm({ scanId, orgId, vertical, email, phone }: Props) {
  const router = useRouter();
  const [intent, setIntent] = useState('fix_seo');
  const [budgetRange, setBudgetRange] = useState('');
  const [timeline, setTimeline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingScan = useMemo(() => !scanId, [scanId]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scanId) {
      setError('Missing scan context. Return to your report and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lead-intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgId: orgId || undefined,
          scanId,
          intent,
          budgetRange,
          timeline,
          vertical,
          email,
          phone
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Could not save intake details');
      }

      router.push(`/thanks/${scanId}?book=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setLoading(false);
    }
  };

  if (missingScan) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Missing report context</h1>
        <p className="mt-2 text-sm text-slate-700">Open your report first, then use Book my teardown.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-teal-700 underline">
          Back to scanner
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl card p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Teardown intake</p>
      <h1 className="mt-2 text-3xl font-extrabold text-slate-900">A few details before booking</h1>
      <p className="mt-2 text-sm text-slate-700">
        This helps us tailor your teardown to your goals before you pick a time.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
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

        <div className="grid gap-3 md:grid-cols-2">
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Continue to booking'}
        </button>
      </form>
    </section>
  );
}
