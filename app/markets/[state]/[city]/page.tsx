import Link from 'next/link';
import { PublicSeoSchema } from '@/components/public-seo-schema';

export default function CityMarketPage({ params }: { params: { state: string; city: string } }) {
  const cityLabel = decodeURIComponent(params.city).replace(/-/g, ' ');
  const stateLabel = decodeURIComponent(params.state).toUpperCase();
  const path = `/markets/${params.state}/${params.city}`;
  return (
    <main className="container-shell py-16">
      <PublicSeoSchema
        title={`${cityLabel}, ${stateLabel} Market SEO | Shop SEO Scan`}
        description={`Market SEO entry page for ${cityLabel}, ${stateLabel}. Run a live scan for collision, HVAC, plumbing, or roofing and see what local competitors are doing better.`}
        path={path}
      />
      <h1 className="text-3xl font-bold text-slate-900">
        {cityLabel}, {stateLabel} Market SEO
      </h1>
      <p className="mt-3 max-w-2xl text-slate-700">
        Use Shop SEO Scan to get a live local SEO report for a real business in {cityLabel}. We&apos;re expanding market intelligence city by city, but you can already run trade-specific scans now.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/collision" className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white">
          Run Collision Scan
        </Link>
        <Link href="/hvac" className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">
          Run HVAC Scan
        </Link>
        <Link href="/plumbing" className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">
          Run Plumbing Scan
        </Link>
        <Link href="/roofing" className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white">
          Run Roofing Scan
        </Link>
      </div>
    </main>
  );
}
