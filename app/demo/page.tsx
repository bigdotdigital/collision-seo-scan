import type { Metadata } from 'next';
import Link from 'next/link';
import demo from '@/fixtures/demo-report.json';
import { PublicPoweredByFooter } from '@/components/public-powered-by-footer';
import { ScoreRing } from '@/components/score-ring';
import { getVerticalConfig, isVerticalSlug, type VerticalSlug, VERTICALS } from '@/lib/verticals';
import { getServiceMarketIntel, getVerticalThemeTone } from '@/lib/service-market-intel';

export const metadata: Metadata = {
  title: 'Demo SEO Report | Shop SEO Scan',
  description:
    'See an example Shop SEO Scan report with visibility scoring, competitor context, issue prioritization, and repair recommendations.',
  alternates: {
    canonical: 'https://shopseoscan.com/demo'
  }
};

type Props = {
  searchParams?: {
    vertical?: string;
  };
};

export default function DemoReportPage({ searchParams }: Props) {
  const vertical: VerticalSlug =
    searchParams?.vertical && isVerticalSlug(searchParams.vertical) ? searchParams.vertical : 'collision';
  const cfg = getVerticalConfig(vertical);
  const intel = getServiceMarketIntel(vertical);
  const tone = getVerticalThemeTone(vertical);
  const shopName =
    vertical === 'hvac'
      ? 'Summit Climate Control'
      : vertical === 'plumbing'
        ? 'Front Range Plumbing Co.'
        : vertical === 'roofing'
          ? 'Highline Roofing & Exteriors'
          : demo.shopName;
  const city =
    vertical === 'hvac'
      ? 'Colorado Springs'
      : vertical === 'plumbing'
        ? 'Fort Collins'
        : vertical === 'roofing'
          ? 'Boulder'
          : demo.city;
  const competitorRows = [
    { name: 'Your Shop', score: demo.overallScore, reviews: '4.8 ★' },
    {
      name:
        vertical === 'hvac'
          ? 'Peak Heating & Air'
          : vertical === 'plumbing'
            ? 'Rapid Rooter & Drain'
            : vertical === 'roofing'
              ? 'Stormline Roofing'
              : 'Crash Champions',
      score: 74,
      reviews: '4.2 ★'
    },
    {
      name:
        vertical === 'hvac'
          ? 'Altitude Comfort'
          : vertical === 'plumbing'
            ? 'Blue Pipe Pros'
            : vertical === 'roofing'
              ? 'Summit Roof Systems'
              : 'City Collision',
      score: 68,
      reviews: '3.9 ★'
    }
  ];

  const gradeCards = [
    { label: 'SEO Foundations', value: demo.categoryScores.technicalSeo },
    { label: 'Local Visibility', value: demo.categoryScores.localSeo },
    { label: cfg.authorityLabel, value: demo.categoryScores.collisionAuthority },
    { label: 'Performance', value: demo.categoryScores.speedPerformance },
    { label: 'Mobile Exp.', value: 68 }
  ];

  return (
    <main className="container-shell report-variant pb-16 pt-10" data-vertical={vertical}>
      <div className="report-ambient-glow" />
      <div className="report-noise-overlay" />

      <section className="report-header-panel mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="report-header-icon">◌</div>
          <div>
            <h1 className="text-sm font-medium text-white/95">{shopName}</h1>
            <p className="text-xs text-white/60">{city} • {cfg.label} • Scan ID: #DEMO-001</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill-badge border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Demo Report
          </span>
          <span className="text-xs text-white/45">Static sample</span>
        </div>
      </section>

      <section className="report-arch-hero mb-6">
        <p className="report-arch-kicker">DEMO REPORT</p>
        <h2 className="report-arch-title">{cfg.reportHeroTitle}</h2>
        <p className="report-arch-copy">{cfg.reportHeroCopy}</p>
        <p className="mt-4 max-w-3xl text-xs font-medium uppercase tracking-[0.18em] text-white/45">
          {tone.eyebrow} • {tone.summary}
        </p>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {(Object.keys(VERTICALS) as VerticalSlug[]).map((slug) => (
          <Link
            key={slug}
            href={`/demo?vertical=${slug}`}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold backdrop-blur ${
              slug === vertical
                ? 'border-white/30 bg-white/10 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/70'
            }`}
          >
            {VERTICALS[slug].label}
          </Link>
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="report-score-panel lg:col-span-4">
          <ScoreRing score={demo.overallScore} />
          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/45">Visibility Health</p>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {gradeCards.map((card) => (
            <article key={card.label} className="report-grade-card">
              <p className="report-grade-label">{card.label}</p>
              <p className="report-grade-value">{card.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        {cfg.strategicFocus.map((item) => (
          <article key={item.title} className="card border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300/80">{item.label}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-white/70">{item.detail}</p>
          </article>
        ))}
      </section>

      <section className="variant-results-grid mb-6">
        <article className="variant-score-card">
          <div
            className="variant-score-ring"
            style={{ '--score-deg': `${Math.round((demo.overallScore / 100) * 360)}deg` } as Record<string, string>}
          >
            <span className="variant-score-value">{demo.overallScore}</span>
          </div>
          <p className="variant-score-label">Visibility Score</p>
          <p className="variant-score-condition">Good Condition</p>
        </article>

        <article className="variant-report-card">
          <p className="variant-card-label">Top issues impacting calls</p>
          <ul className="variant-issue-list">
            {demo.topFixes.map((fix) => (
              <li key={fix} className="variant-issue-item">
                <span className="variant-priority-dot variant-priority-high" />
                <div>
                  <p className="variant-issue-title">{fix}</p>
                  <p className="variant-issue-copy">High opportunity if fixed in the first 30 days.</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="variant-report-card">
          <p className="variant-card-label">Local market context</p>
          <table className="variant-table">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Score</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {competitorRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.score}</td>
                  <td>{row.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="variant-quick-fixes">
            <p className="variant-card-label">Quick fixes</p>
            <div className="variant-chip-row">
              {demo.topFixes.slice(0, 2).map((fix) => (
                <span key={fix} className="variant-fix-chip">
                  + {fix}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="card p-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-white/70">Detected Signals</h2>
          <ul className="mt-4 space-y-3">
            {demo.detectedSignals.map((signal) => (
              <li key={signal} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90">
                {signal.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </article>

        <article className="card p-6">
          <h2 className="text-sm font-medium uppercase tracking-widest text-white/70">Missing Signals</h2>
          <ul className="mt-4 space-y-3">
            {demo.missingSignals.map((signal) => (
              <li key={signal} className="rounded-lg border border-dashed border-white/20 bg-white/[0.02] px-3 py-2 text-sm text-[#d8d2cd]">
                {signal.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-white/55">Add these to increase trust + rank coverage.</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {intel.map((item) => (
          <article key={item.title} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">{item.title}</p>
            <p className="mt-2 text-sm text-[#d8d2cd]">{item.insight}</p>
            <p className="mt-3 text-sm font-medium text-white">{item.action}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 card p-6">
        <h2 className="text-lg font-medium text-white">Executive Summary</h2>
        <p className="mt-3 text-sm leading-7 text-[#d8d2cd]">
          {shopName} has strong local momentum but is leaving growth on the table due to missing
          trust proof and inconsistent conversion hierarchy. This demo mirrors the live report
          style and shows how issue prioritization, local context, and fast fixes are presented for {cfg.label.toLowerCase()} businesses.
        </p>
      </section>

      <section className="mt-8">
        <Link href="/" className="text-sm font-semibold text-[#c49a7a] underline">
          Run a live scan
        </Link>
      </section>

      <section className="mt-12 text-xs text-white/45">
        Demo content only. For real values, run a fresh scan.
      </section>

      <PublicPoweredByFooter className="mt-8" />
    </main>
  );
}
