import Link from 'next/link';
import demo from '@/fixtures/demo-report.json';
import { ScoreRing } from '@/components/score-ring';

export default function DemoReportPage() {
  const competitorRows = [
    { name: 'Your Shop', score: demo.overallScore, reviews: '4.8 ★' },
    { name: 'Crash Champions', score: 74, reviews: '4.2 ★' },
    { name: 'City Collision', score: 68, reviews: '3.9 ★' }
  ];

  const gradeCards = [
    { label: 'SEO Foundations', value: demo.categoryScores.technicalSeo },
    { label: 'Local Visibility', value: demo.categoryScores.localSeo },
    { label: 'Reputation', value: demo.categoryScores.collisionAuthority },
    { label: 'Performance', value: demo.categoryScores.speedPerformance },
    { label: 'Mobile Exp.', value: 68 }
  ];

  return (
    <main className="container-shell report-variant pb-16 pt-10">
      <div className="report-ambient-glow" />
      <div className="report-noise-overlay" />

      <section className="report-header-panel mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="report-header-icon">◌</div>
          <div>
            <h1 className="text-sm font-medium text-white/95">{demo.shopName}</h1>
            <p className="text-xs text-white/60">{demo.city} • Scan ID: #DEMO-001</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill-badge border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Demo Report
          </span>
          <span className="text-xs text-white/45">Static sample</span>
        </div>
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
                  <p className="variant-issue-copy">High opportunity if fixed in first 30 days.</p>
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
          <h2 className="text-sm font-medium uppercase tracking-widest text-white/70">Detected Capabilities</h2>
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

      <section className="mt-6 card p-6">
        <h2 className="text-lg font-medium text-white">Executive Summary</h2>
        <p className="mt-3 text-sm leading-7 text-[#d8d2cd]">
          {demo.shopName} has strong local momentum but is leaving growth on the table due to missing
          capability proof and inconsistent conversion hierarchy. This demo mirrors the live report
          style and shows how issue prioritization, local context, and fast fixes are presented to the client.
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
    </main>
  );
}
