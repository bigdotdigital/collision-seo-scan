'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_VERTICAL, type VerticalSlug } from '@/lib/verticals';
import { ScanLoadingShell } from '@/components/scan-loading';

const CAPABILITY_OPTIONS: Record<
  VerticalSlug,
  Array<{ name: string; label: string }>
> = {
  collision: [
    { name: 'has_i_car', label: 'I-CAR' },
    { name: 'has_oem', label: 'OEM Certifications' },
    { name: 'has_adas', label: 'ADAS Calibration' },
    { name: 'has_aluminum', label: 'Aluminum Repair' }
  ],
  hvac: [
    { name: 'has_emergency', label: '24/7 Emergency Service' },
    { name: 'has_financing', label: 'Financing Options' },
    { name: 'has_maintenance', label: 'Maintenance Plans' },
    { name: 'has_heat_pumps', label: 'Heat Pumps / IAQ' }
  ],
  plumbing: [
    { name: 'has_emergency', label: '24/7 Emergency Service' },
    { name: 'has_drain', label: 'Drain / Sewer Service' },
    { name: 'has_water_heater', label: 'Water Heater Service' },
    { name: 'has_leak_detection', label: 'Leak Detection' }
  ],
  roofing: [
    { name: 'has_storm', label: 'Storm Damage Repair' },
    { name: 'has_insurance', label: 'Insurance Claims Help' },
    { name: 'has_inspection', label: 'Free Inspections' },
    { name: 'has_warranty', label: 'Warranties / Financing' }
  ]
};

const SHOP_NAME_PLACEHOLDERS: Record<VerticalSlug, string> = {
  collision: 'Precision Collision',
  hvac: 'Summit Climate Control',
  plumbing: 'Front Range Plumbing Co.',
  roofing: 'Highline Roofing & Exteriors'
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isReportReady(scanId: string) {
  const res = await fetch(`/report/${scanId}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      accept: 'text/html'
    }
  });

  if (!res.ok) {
    return false;
  }

  const html = await res.text();
  if (!html) {
    return false;
  }

  return !html.includes('Report temporarily unavailable');
}

export function ScanForm({ vertical = DEFAULT_VERTICAL }: { vertical?: VerticalSlug }) {
  const router = useRouter();
  const capabilityOptions = CAPABILITY_OPTIONS[vertical] || CAPABILITY_OPTIONS[DEFAULT_VERTICAL];
  const shopNamePlaceholder = SHOP_NAME_PLACEHOLDERS[vertical] || SHOP_NAME_PLACEHOLDERS[DEFAULT_VERTICAL];
  const [loading, setLoading] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [scanContext, setScanContext] = useState({
    websiteUrl: '',
    city: '',
    shopName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  // Poll scan status until complete
  useEffect(() => {
    if (!scanId || !loading) return;

    let intervalId: NodeJS.Timeout;
    let cancelled = false;

    const checkScanStatus = async () => {
      try {
        const res = await fetch(`/api/scan/${scanId}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.scan && (data.scan.executionStatus === 'completed' || data.scan.scoreTotal !== null)) {
          clearInterval(intervalId);
          setScanComplete(true);
          setFinalScore(data.scan.scoreTotal || null);
          while (!cancelled) {
            const ready = await isReportReady(scanId).catch(() => false);
            if (ready) break;
            await wait(1500);
          }
          if (cancelled) return;
          await wait(850);
          if (cancelled) return;
          router.push(`/report/${scanId}`);
        }
      } catch (err) {
        console.error('Status check failed:', err);
      }
    };

    intervalId = setInterval(checkScanStatus, 2000);
    void checkScanStatus();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [scanId, loading, router]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const websiteUrl = String(fd.get('website_url') || '');
    const city = String(fd.get('city_or_zip') || '');
    const shopName = String(fd.get('shop_name') || '');

    setScanContext({ websiteUrl, city, shopName });
    setScanComplete(false);
    setFinalScore(null);
    setScanId(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          website_url: websiteUrl,
          city_or_zip: city,
          shop_name: shopName,
          email: String(fd.get('email') || ''),
          phone: String(fd.get('phone') || ''),
          has_i_car: fd.get('has_i_car') === 'on',
          has_oem: fd.get('has_oem') === 'on',
          has_adas: fd.get('has_adas') === 'on',
          has_aluminum: fd.get('has_aluminum') === 'on',
          consented: fd.get('consented') === 'on',
          vertical: String(fd.get('vertical') || vertical)
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Scan failed');
      }

      // Set scan ID to start polling, but DON'T redirect yet
      setScanId(json.scanId);
      
      // If scan completed immediately (rare), show score
      if (typeof json?.score === 'number') {
        setFinalScore(json.score);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setScanComplete(false);
      setLoading(false);
      setScanId(null);
    }
  };

  return (
    <form className="diagnostic-form p-6 md:p-8" onSubmit={onSubmit}>
      <input type="hidden" name="vertical" value={vertical} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Website URL
          <input
            className="diagnostic-input"
            name="website_url"
            placeholder="https://example.com"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          City or ZIP
          <input
            className="diagnostic-input"
            name="city_or_zip"
            placeholder="Denver or 80223"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Shop Name
          <input
            className="diagnostic-input"
            name="shop_name"
            placeholder={shopNamePlaceholder}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email (optional)
          <input
            className="diagnostic-input"
            name="email"
            type="email"
            placeholder="owner@shop.com"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Phone (optional)
          <input
            className="diagnostic-input"
            name="phone"
            placeholder="(303) 555-1234"
          />
        </label>

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-medium">Capabilities (optional)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {capabilityOptions.map((option) => (
              <label key={option.name} className="flex items-center gap-2 text-sm text-slate-200">
                <input name={option.name} type="checkbox" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="md:col-span-2 flex items-start gap-2 rounded-md border border-slate-600 bg-slate-950/55 p-3 text-xs text-slate-300">
          <input name="consented" type="checkbox" required className="mt-0.5" />
          <span>
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="font-semibold text-amber-300 underline">
              Terms
            </Link>{' '}
            and understand this tool stores scan data for benchmarking and product improvement.
          </span>
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="diagnostic-button mt-5 inline-flex items-center rounded-md px-4 py-2 font-semibold transition disabled:opacity-60"
      >
        {loading ? 'Running scan...' : 'Run Instant Scan'}
      </button>

      <ScanLoadingShell
        open={loading}
        websiteUrl={scanContext.websiteUrl}
        city={scanContext.city}
        shopName={scanContext.shopName}
        completed={scanComplete}
        finalScore={finalScore}
      />
    </form>
  );
}
