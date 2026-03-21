import Link from 'next/link';
import { ScanForm } from '@/components/scan-form';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
import { VERTICALS, type VerticalSlug } from '@/lib/verticals';

export function VerticalLandingPage({ vertical }: { vertical: VerticalSlug }) {
  const cfg = VERTICALS[vertical];

  return (
    <main className="diagnostic-page relative overflow-hidden">
      <div className="diagnostic-bg-rings" />

      <section className="py-16 md:py-20">
        <div className="container-shell relative z-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
            Shop SEO Scan • {cfg.label}
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-100 md:text-6xl">
            {cfg.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">{cfg.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              className="inline-flex h-11 items-center rounded-md border border-amber-300/70 bg-amber-300 px-5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(251,191,36,0.24)]"
              href="#scan-form"
            >
              Run Free Scan
            </a>
            <Link
              className="inline-flex h-11 items-center rounded-md border border-slate-500/70 bg-white/5 px-5 text-sm font-medium text-slate-100 backdrop-blur"
              href="/demo"
            >
              See Example Report
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Already a client?{' '}
            <a className="text-amber-300 underline" href="/login">
              Open dashboard
            </a>
          </p>
        </div>
      </section>

      <section className="container-shell relative z-10 pb-10">
        <div className="variant-console">
          <div className="variant-viewport">
            <div className="variant-scan-line" />
            <div className="variant-scan-overlay" />
            <div className="variant-viewport-content">
              <div className="variant-sk-nav">
                <span className="variant-sk-chip w-6" />
                <span className="variant-sk-chip w-9" />
                <span className="variant-sk-chip w-9" />
                <span className="flex-1" />
                <span className="variant-sk-chip w-20 bg-amber-300/70" />
              </div>
              <div className="variant-sk-hero">
                <span className="variant-sk-line h-5 w-3/5" />
                <span className="variant-sk-line w-4/5" />
                <span className="variant-sk-line w-3/4" />
                <span className="variant-sk-btn" />
              </div>
              <div className="grid grid-cols-3 gap-3 px-4">
                <span className="variant-sk-card" />
                <span className="variant-sk-card" />
                <span className="variant-sk-card" />
              </div>
            </div>
            <p className="variant-axis-label">Scanning axis Y-01</p>
          </div>
          <div className="variant-panel">
            <div className="variant-panel-head">
              <h3 className="variant-headline">System Diagnostics</h3>
              <span className="variant-status">
                <span className="variant-status-dot" />
                Active Scan
              </span>
            </div>
            <ul className="variant-step-list">
              <li className="variant-step variant-step-complete">
                <span className="variant-step-icon">✓</span>
                <span>Capturing homepage architecture</span>
              </li>
              <li className="variant-step variant-step-complete">
                <span className="variant-step-icon">✓</span>
                <span>Checking mobile responsiveness</span>
              </li>
              <li className="variant-step variant-step-active">
                <span className="variant-step-icon" />
                <span>Detecting trust signals and certifications</span>
              </li>
              <li className="variant-step">
                <span className="variant-step-icon" />
                <span>Evaluating CTA visibility contrast</span>
              </li>
              <li className="variant-step">
                <span className="variant-step-icon" />
                <span>Comparing competitor positioning</span>
              </li>
              <li className="variant-step">
                <span className="variant-step-icon" />
                <span>Calculating visibility score</span>
              </li>
              <li className="variant-step">
                <span className="variant-step-icon" />
                <span>Building repair plan</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="scan-form" className="container-shell relative z-10 pb-10">
        <div className="variant-form-wrap">
          <p className="variant-section-label">Live Scan Input</p>
          <h2 className="text-2xl font-medium text-slate-100">Run your real shop scan now</h2>
          <p className="mt-2 text-slate-300">
            Enter your shop details below to generate a full report and action plan.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Free scan</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">No payment required</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Built for collision shops</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Custom dashboard available</span>
          </div>
          <div className="mt-6">
            <ScanForm vertical={vertical} />
          </div>
        </div>
      </section>

      <section className="container-shell relative z-10 pb-10">
        <div className="grid gap-3 text-left md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">Weekly Clarity</p>
            <p className="mt-2 text-base font-semibold text-slate-100">See what changed week to week</p>
            <p className="mt-2 text-sm text-slate-300">
              Track rankings, trust signals, service-page gaps, and the issues actually affecting estimate demand.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">Competitor Watch</p>
            <p className="mt-2 text-base font-semibold text-slate-100">Know when nearby shops move first</p>
            <p className="mt-2 text-sm text-slate-300">
              We surface service coverage gaps, local trust differences, and what stronger shops are doing that you are not.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">Tailored Setup</p>
            <p className="mt-2 text-base font-semibold text-slate-100">We can customize the dashboard for your shop</p>
            <p className="mt-2 text-sm text-slate-300">
              Start with the free scan, then we can tune the dashboard around hail, OEM, maps, reviews, conversion, or service-area growth.
            </p>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(VERTICALS) as VerticalSlug[]).map((slug) => (
          <Link
            key={slug}
            href={`/${slug}`}
            className={`diagnostic-pill p-4 text-sm font-semibold ${slug === vertical ? 'ring-2 ring-amber-300/70' : ''}`}
          >
            {VERTICALS[slug].label}
          </Link>
        ))}
      </section>

      <section className="container-shell pb-10">
        <p className="text-xs text-slate-400">
          Aggregated market stats may be used in reports. We do not sell your contact info.
        </p>
        <PublicPoweredByFooter className="mt-6" />
      </section>
    </main>
  );
}
