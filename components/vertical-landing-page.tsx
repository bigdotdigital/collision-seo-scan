import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { VERTICALS, type VerticalSlug } from '@/lib/verticals';

export function VerticalLandingPage({ vertical }: { vertical: VerticalSlug }) {
  const cfg = VERTICALS[vertical];

  return (
    <main>
      <section className="bg-gradient-to-b from-teal-100 to-slate-50 py-16 md:py-20">
        <div className="container-shell">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Shop SEO Scan • {cfg.label}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            {cfg.title}
          </h1>
          <p className="mt-4 max-w-2xl text-slate-600">{cfg.subtitle}</p>
          <p className="mt-3 text-sm text-slate-600">
            Already a client?{' '}
            <a className="text-teal-700 underline" href="/login">
              Open dashboard
            </a>
          </p>
        </div>
      </section>

      <section className="container-shell -mt-8 pb-10">
        <ScanForm vertical={vertical} />
      </section>

      <section className="container-shell grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(VERTICALS) as VerticalSlug[]).map((slug) => (
          <Link
            key={slug}
            href={`/${slug}`}
            className={`card p-4 text-sm font-semibold ${slug === vertical ? 'ring-2 ring-teal-500' : ''}`}
          >
            {VERTICALS[slug].label}
          </Link>
        ))}
      </section>

      <section className="container-shell pb-10">
        <p className="text-xs text-slate-500">
          Aggregated market stats may be used in reports. We do not sell your contact info.
        </p>
      </section>
    </main>
  );
}
