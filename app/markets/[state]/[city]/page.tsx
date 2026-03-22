import Link from 'next/link';
import { PublicSeoSchema } from '@/components/public-seo-schema';
import { getCollisionCityMarketCopy } from '@/lib/city-market-copy';

export default function CityMarketPage({ params }: { params: { state: string; city: string } }) {
  const cityLabel = decodeURIComponent(params.city).replace(/-/g, ' ');
  const stateLabel = decodeURIComponent(params.state).toUpperCase();
  const path = `/markets/${params.state}/${params.city}`;
  const collisionCopy = getCollisionCityMarketCopy(params.city);
  return (
    <main className="diagnostic-page relative overflow-hidden py-16 md:py-20">
      <PublicSeoSchema
        title={`${cityLabel}, ${stateLabel} Market SEO | Shop SEO Scan`}
        description={`Market SEO entry page for ${cityLabel}, ${stateLabel}. Run a live scan for collision, HVAC, plumbing, or roofing and see what local competitors are doing better.`}
        path={path}
      />
      <div className="diagnostic-bg-rings" />
      <section className="container-shell relative z-10">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            {cityLabel}, {stateLabel} Market SEO
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
            {cityLabel}, {stateLabel} market SEO scans for real service businesses.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
            Use Shop SEO Scan to get a live local SEO report for a real business in {cityLabel}. We&apos;re expanding market intelligence city by city,
            but you can already run trade-specific scans now.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Collision market read</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{collisionCopy.summary}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">What wins locally</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{collisionCopy.whyItMatters}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h2 className="text-lg font-semibold text-slate-100">Best place to start</h2>
              <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                {collisionCopy.priorityAreas.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/collision" className="rounded-md bg-amber-300 px-4 py-2 font-semibold text-black">
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
        </div>
      </section>
    </main>
  );
}
