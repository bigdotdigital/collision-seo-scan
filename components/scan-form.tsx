'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ScanForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          website_url: String(fd.get('website_url') || ''),
          city_or_zip: String(fd.get('city_or_zip') || ''),
          shop_name: String(fd.get('shop_name') || ''),
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          has_i_car: fd.get('has_i_car') === 'on',
          has_oem: fd.get('has_oem') === 'on',
          has_adas: fd.get('has_adas') === 'on',
          has_aluminum: fd.get('has_aluminum') === 'on',
          consented: fd.get('consented') === 'on'
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Scan failed');
      }

      router.push(`/report/${json.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setLoading(false);
    }
  };

  return (
    <form className="card p-6 md:p-8" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Website URL
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            name="website_url"
            placeholder="https://example.com"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          City or ZIP
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            name="city_or_zip"
            placeholder="Denver or 80223"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Shop Name
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            name="shop_name"
            placeholder="Precision Collision"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email (optional)
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
            placeholder="owner@shop.com"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Phone (optional)
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            name="phone"
            placeholder="(303) 555-1234"
          />
        </label>

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-medium">Capabilities (optional)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="has_i_car" type="checkbox" />
              I-CAR
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="has_oem" type="checkbox" />
              OEM Certifications
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="has_adas" type="checkbox" />
              ADAS Calibration
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="has_aluminum" type="checkbox" />
              Aluminum Repair
            </label>
          </div>
        </fieldset>

        <label className="md:col-span-2 flex items-start gap-2 rounded-md border border-slate-200 p-3 text-xs text-slate-700">
          <input name="consented" type="checkbox" required className="mt-0.5" />
          <span>
            I agree to the Terms and understand this tool stores scan data for benchmarking and product improvement.
          </span>
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex items-center rounded-md bg-teal-700 px-4 py-2 font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
      >
        {loading ? 'Running scan...' : 'Run Instant Scan'}
      </button>
    </form>
  );
}
