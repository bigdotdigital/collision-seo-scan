import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScoreRing } from '@/components/score-ring';
import { InfoTooltip } from '@/components/info-tooltip';
import { ReportEmailCapture } from '@/components/report-email-capture';
import { ReportCtaActions, ReportShareActions } from '@/components/report-cta-actions';
import { formatCls, formatMilliseconds, formatScore } from '@/lib/metric-format';
import { logEnvWarningsOnce } from '@/lib/env-check';
import {
  checksScore,
  impactClass,
  isValidScanId,
  sanitizeEvidenceSnippet,
  scoreDot,
  severityClass,
} from '@/lib/report-page-helpers';
import { loadReportPageState } from '@/lib/report-page-state';

export default async function ReportPage({ params }: { params: { scanId: string } }) {
  logEnvWarningsOnce();
  const scanId = params.scanId;
  if (!isValidScanId(scanId)) return notFound();

  try {
    const state = await loadReportPageState(scanId);
    if (!state) return notFound();

    const {
      scanRecord,
      dbScan,
      snapshot,
      raw,
      keywords,
      competitors,
      plan,
      payload,
      scoreTotal,
      scoreLocal,
      scoreIntent,
      categoryScores,
      detectedSignals,
      missingSignals,
      topFixes,
      competitorAdvantages,
      nationalBenchmark,
      pageMeta,
      scanDurationMs,
      timestampLabel,
      domainLabel,
      pagespeed,
      hasMeasuredSpeedDiagnostics,
      websiteCardScore,
      healthChecks,
      ownerIssues,
      ownerTopFixes,
      categoryCards,
      salesPhone,
      vm,
      competitorDisplayRows,
      crawlEvidenceRows,
      teardownIntakeUrl,
      monitoringLandingUrl,
      reviewGap,
      mapPack,
      googlePlace,
      sourceConfidence,
      hasLiveKeywordData,
      hasUsableReviewGap,
      ownGoogleReviewLabel,
      hasUsableCompetitorData,
      hasUsableMapPackData,
      reviewSource,
      competitorSource,
      mapPackSource,
      keywordSource,
      opportunitySource,
      scannerPreview,
      scannerMetadata,
      scannerPreviewUrl,
      scannerSteps,
      executiveSummary,
      reportUrl,
      printedAt,
      scoreCondition,
      competitorRows
    } = state;
    const scoreHelp = {
      visibilityHealth:
        'Your overall visibility health combines website basics, local presence, collision-specific trust signals, speed, and conversion readiness into one headline score.',
      website:
        'Website measures how strong the site foundation is: crawlability, titles, speed, mobile experience, and whether core pages are understandable to search engines.',
      local:
        'Local measures how well the shop is positioned for nearby searches, including map relevance, city/service alignment, and business-profile signals.',
      intent:
        'Intent measures whether the pages match what collision shoppers are actually searching for, such as repair services, OEM terms, estimate intent, and local modifiers.',
      technicalSeo:
        'Technical SEO checks whether search engines can crawl, understand, and trust the main pages on the site.',
      localSeo:
        'Local SEO checks whether the site and business profile send strong signals for nearby collision-related searches.',
      collisionAuthority:
        'Collision Authority measures trust signals specific to body shops, such as certifications, repair specialties, reviews, and credibility markers.',
      speedPerformance:
        'Speed & Performance measures how quickly the site loads and how stable it feels on phones, where many estimate searches happen.',
      contentCoverage:
        'Content Coverage measures whether the site has enough service and specialty pages to match real collision-repair searches.'
    } as const;

    return (
      <main className="container-shell report-print report-diagnostic report-variant pb-24 pt-10 md:pb-10">
      <div className="report-ambient-glow" />
      <div className="report-noise-overlay" />
      {!scanRecord.email ? <ReportEmailCapture scanId={scanRecord.id} /> : null}
      <ReportCtaActions
        scanId={scanRecord.id}
        calendlyUrl={teardownIntakeUrl}
        salesPhone={salesPhone}
        reportUrl={reportUrl}
        mobileSticky
        trackBooked={false}
      />

      <section className="print-only mb-4 border-b border-slate-300 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">Collision SEO Scan</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{scanRecord.shopName}</h1>
        <p className="text-xs text-slate-700">
          {scanRecord.city} • {scanRecord.url} • Generated {printedAt}
        </p>
      </section>

      <section className="report-header-panel mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="report-header-icon">◌</div>
          <div>
            <h1 className="text-sm font-medium text-white/95">{scanRecord.shopName}</h1>
            <p className="text-xs text-white/60">
              {scanRecord.city} • Scan ID: {scanRecord.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill-badge border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Scan Complete
          </span>
          <span className="text-xs text-white/45">{timestampLabel}</span>
          <ReportShareActions reportUrl={reportUrl} />
        </div>
      </section>

      <section className="report-arch-hero mb-6">
        <p className="report-arch-kicker">LOCAL SEO DIAGNOSTIC</p>
        <h2 className="report-arch-title">Visibility Analysis</h2>
        <p className="report-arch-copy">
          Shop-owner view: what is working, what is costing estimate calls, and what to fix first.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="report-score-panel lg:col-span-4">
          <ScoreRing score={scoreTotal} />
          <div className="mt-3 flex justify-center">
            <InfoTooltip
              label="Visibility Health"
              text={scoreHelp.visibilityHealth}
              className="text-xs uppercase tracking-[0.12em] text-white/45"
            />
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categoryCards.map((card) => (
            <article key={card.label} className="report-grade-card">
              <InfoTooltip
                label={card.label}
                text={
                  card.label === 'Website Basics'
                    ? scoreHelp.website
                    : card.label === 'Map Visibility'
                      ? scoreHelp.local
                      : card.label === 'Trust & Certifications'
                        ? scoreHelp.collisionAuthority
                        : card.label === 'Speed on Mobile'
                          ? scoreHelp.speedPerformance
                          : card.label === 'Service Page Coverage'
                            ? scoreHelp.contentCoverage
                            : scoreHelp.intent
                }
                className="report-grade-label"
              />
              <p className="report-grade-value">{card.score}</p>
              <p className="report-grade-hint">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-arch-section mb-6">
        <div className="report-arch-section-head">
          <h3 className="report-arch-section-title">Start Here</h3>
          <span className="report-arch-meta">Most important first</span>
        </div>
        <div className="report-arch-grid3">
          <article className="report-arch-cell">
            <p className="report-arch-label">Current Status</p>
            <p className="report-arch-big">{scoreCondition}</p>
            <p className="report-arch-sub">Based on current scan signals</p>
          </article>
          <article className="report-arch-cell">
            <p className="report-arch-label">Top Priority</p>
            <ol className="report-arch-list">
              {ownerTopFixes.slice(0, 2).map((fix, idx) => (
                <li key={fix.title}>
                  <span className="report-arch-index">{idx + 1}</span>
                  <span>{fix.title}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="report-arch-cell">
            <p className="report-arch-label">Estimated Opportunity</p>
            <p className="report-arch-big">${vm.opportunity.revenueOpportunity.toLocaleString()}</p>
            <p className="report-arch-sub">
              {vm.opportunity.missedLeads.toLocaleString()} missed leads/month
              {hasLiveKeywordData ? '' : ' • estimated from modeled demand'}
            </p>
          </article>
        </div>
      </section>

      {vm.dataStatusBanner ? (
        <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {vm.dataStatusBanner} We only show measured data as primary; estimated items are clearly marked.
        </section>
      ) : null}

      <section className="variant-results-grid mb-6">
        <article className="variant-report-card">
          <p className="variant-card-label">Top issues impacting calls</p>
          <ul className="variant-issue-list">
            {ownerIssues.slice(0, 3).map((issue) => (
              <li key={issue.id} className="variant-issue-item">
                <span
                  className={`variant-priority-dot ${
                    issue.severity === 'High' ? 'variant-priority-high' : 'variant-priority-med'
                  }`}
                />
                <div>
                  <p className="variant-issue-title">{issue.title}</p>
                  <p className="variant-issue-copy">{issue.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="variant-report-card">
          <p className="variant-card-label">Local market context</p>
          {hasUsableCompetitorData ? (
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
          ) : (
            <p className="mt-3 text-sm text-white/70">
              Live competitor market context was unavailable in this run.
            </p>
          )}
          <div className="variant-quick-fixes">
            <p className="variant-card-label">Quick fixes</p>
            <div className="variant-chip-row">
              {topFixes.slice(0, 2).map((fix) => (
                <span key={fix.title} className="variant-fix-chip">+ {fix.title}</span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="report-arch-section mb-6">
        <div className="report-arch-section-head">
          <h3 className="report-arch-section-title">Market Context</h3>
          <span className="report-arch-meta">Your shop vs local rivals</span>
        </div>
        <div className="report-arch-table-wrap">
          {hasUsableCompetitorData ? (
            <table className="variant-table">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Score</th>
                  <th>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {competitorRows.map((row) => (
                  <tr key={`market-${row.name}`}>
                    <td>{row.name}</td>
                    <td>{row.score}</td>
                    <td>{row.reviews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-white/70">
              Live competitor market context was unavailable in this run.
            </p>
          )}
        </div>
      </section>

      <section className="report-scan-stage mb-6 grid gap-4 lg:grid-cols-12">
        <article className="report-scan-canvas-wrap lg:col-span-8">
          <div className="report-scan-canvas">
            {scannerPreviewUrl ? (
              <img
                src={scannerPreviewUrl}
                alt="Captured page preview"
                className="report-scan-bg"
              />
            ) : (
              <div className="report-scan-bg report-scan-fallback" />
            )}
            <div className="report-scan-dim" />
            <div className="report-scan-grid" />
            <div className="report-scan-line" />
            <div className="report-scan-box report-scan-box-good">
              <span className="report-scan-tag report-scan-tag-good">Trust Signals Detected</span>
            </div>
            <div className="report-scan-box report-scan-box-warn">
              <span className="report-scan-tag report-scan-tag-warn">Viewport Warning</span>
            </div>
            <div className="report-scan-box report-scan-box-bad">
              <span className="report-scan-tag report-scan-tag-bad">LCP &gt; target</span>
            </div>
            <p className="report-scan-axis">
              {scannerPreview.captureSource === 'live'
                ? 'Live page snapshot • scanner overlay active'
                : scannerPreviewUrl
                  ? 'Fallback page snapshot • scanner overlay active'
                  : 'Abstract scanner fallback • snapshot unavailable'}
            </p>
          </div>
        </article>

        <article className="card p-0 lg:col-span-4">
          <div className="report-scan-panel-head">
            <h2 className="text-sm font-semibold tracking-[0.12em] text-white">SYSTEM DIAGNOSTICS</h2>
            <div className="report-scan-status">
              <span className="report-scan-dot" />
              <span>RUNNING</span>
            </div>
          </div>

          <div className="report-scan-progress">
            <div className="report-scan-progress-bar" />
          </div>

          <div className="report-scan-step-list">
            {scannerSteps.map((step, idx) => (
              <div key={step.label} className="report-scan-step">
                <div
                  className={`report-scan-step-bullet ${
                    step.state === 'verified'
                      ? 'report-scan-step-bullet-ok'
                      : step.state === 'issue'
                        ? 'report-scan-step-bullet-issue'
                        : 'report-scan-step-bullet-active'
                  }`}
                >
                  {step.state === 'verified' ? '✓' : idx + 1}
                </div>
                <div className="report-scan-step-copy">
                  <p>{step.label}</p>
                </div>
                <span
                  className={`report-scan-step-badge ${
                    step.state === 'verified'
                      ? 'report-scan-step-badge-ok'
                      : step.state === 'issue'
                        ? 'report-scan-step-badge-issue'
                        : 'report-scan-step-badge-active'
                  }`}
                >
                  {step.state === 'verified' ? 'Verified' : step.state === 'issue' ? 'Issue' : 'Analyzing'}
                </span>
              </div>
            ))}
          </div>

          <div className="report-scan-meta">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c49a7a]">
              Scanned Page Metadata
            </h3>
            <div className="mt-2 space-y-1.5 text-xs">
              <p><span className="font-semibold text-white">Title:</span> {scannerPreview.metadata.title || 'n/a'}</p>
              <p><span className="font-semibold text-white">Meta:</span> {scannerMetadata.metaDescription || 'n/a'}</p>
              <p><span className="font-semibold text-white">URL:</span> {scannerMetadata.url || scanRecord.url}</p>
              <p><span className="font-semibold text-white">Status:</span> {scannerMetadata.statusCode ?? 'n/a'}</p>
              <p><span className="font-semibold text-white">Response:</span> {scannerMetadata.responseTimeMs != null ? `${scannerMetadata.responseTimeMs}ms` : 'n/a'}</p>
              <p><span className="font-semibold text-white">Size:</span> {scannerMetadata.fileSizeBytes != null ? `${Math.round(scannerMetadata.fileSizeBytes / 1024)} KB` : 'n/a'}</p>
              <p><span className="font-semibold text-white">Words:</span> {scannerMetadata.wordCount ?? 'n/a'}</p>
              {googlePlace?.rating != null ? (
                <p>
                  <span className="font-semibold text-white">Google Rating:</span>{' '}
                  {googlePlace.rating.toFixed(1)} ({googlePlace.userRatingCount ?? 0} reviews)
                </p>
              ) : null}
              {googlePlace?.googleMapsUri ? (
                <p>
                  <span className="font-semibold text-white">Maps:</span>{' '}
                  <a
                    href={googlePlace.googleMapsUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ff8a93] underline-offset-2 hover:underline"
                  >
                    Open profile
                  </a>
                </p>
              ) : null}
            </div>
            <a
              href={scanRecord.url}
              target="_blank"
              rel="noreferrer"
              className="btn-variant-secondary mt-3 px-3 py-2 text-xs"
            >
              Show page
            </a>
          </div>
        </article>
      </section>

      <details className="card mb-6 p-5">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.14em] text-[#c49a7a]">
          Expanded diagnostics
        </summary>
        <div className="mt-4 space-y-6">

      <section className="mb-2 grid gap-4 md:grid-cols-5">
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Technical SEO</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.technicalSeo}</p>
          <p className="mt-1 text-xs text-slate-600">{categoryScores.explanations.technicalSeo}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Local SEO</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.localSeo}</p>
          <p className="mt-1 text-xs text-slate-600">{categoryScores.explanations.localSeo}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Collision Authority</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.collisionAuthority}</p>
          <p className="mt-1 text-xs text-slate-600">
            {categoryScores.explanations.collisionAuthority}
          </p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Speed & Performance</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.speedPerformance}</p>
          <p className="mt-1 text-xs text-slate-600">
            {categoryScores.explanations.speedPerformance}
          </p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Content Coverage</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.contentCoverage}</p>
          <p className="mt-1 text-xs text-slate-600">{categoryScores.explanations.contentCoverage}</p>
        </article>
      </section>

      <section className="card mb-2 p-5">
        <h2 className="text-lg font-bold text-slate-900">Health Meter</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {healthChecks.map((item) => (
            <div key={item.label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-medium text-slate-900">
                {scoreDot(item.score)} {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-1 p-5">
        <h2 className="text-lg font-bold text-slate-900">Rapid Diagnosis</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">What&apos;s wrong</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {ownerIssues.slice(0, 3).map((issue) => (
                <li key={issue.id}>{issue.title}</li>
              ))}
            </ul>
          </article>
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fix first</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {ownerTopFixes.slice(0, 3).map((fix) => (
                <li key={fix.title}>{fix.title}</li>
              ))}
            </ul>
          </article>
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Competitor comparison</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(competitorDisplayRows.length > 0 ? competitorDisplayRows : vm.competitors)
                .slice(0, 2)
                .map((row, idx) =>
                  'advantages' in row ? (
                    <li key={row.name + idx}>{row.advantages[0] || row.name}</li>
                  ) : (
                    <li key={row.name + idx}>{row.whyWinning}</li>
                  )
                )}
              </ul>
            </article>
          </div>
      </section>
        </div>
      </details>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card print-break-avoid p-5">
          <InfoTooltip
            label="Website"
            text={scoreHelp.website}
            className="text-xs uppercase tracking-wide text-slate-500"
          />
          <p className="mt-1 text-3xl font-bold">{formatScore(websiteCardScore)}</p>
          <p className="mt-1 text-xs text-slate-500">Performance score (PageSpeed mobile)</p>
        </div>
        <div className="card print-break-avoid p-5">
          <InfoTooltip
            label="Local"
            text={scoreHelp.local}
            className="text-xs uppercase tracking-wide text-slate-500"
          />
          <p className="mt-1 text-3xl font-bold">{scoreLocal}</p>
        </div>
        <div className="card print-break-avoid p-5">
          <InfoTooltip
            label="Intent"
            text={scoreHelp.intent}
            className="text-xs uppercase tracking-wide text-slate-500"
          />
          <p className="mt-1 text-3xl font-bold">{scoreIntent}</p>
        </div>
      </section>

      <details className="mt-10 card print-break-avoid p-6">
        <summary className="cursor-pointer text-xl font-bold">Technical Diagnostics (secondary)</summary>
        {pagespeed.status === 'error' ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Could not load PageSpeed data right now. {pagespeed.message || 'Please try again later.'}
          </p>
        ) : (
          <>
            {hasMeasuredSpeedDiagnostics ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Load speed (LCP)</p>
                  <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.lcpMs)}</p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Layout stability (CLS)</p>
                  <p className="mt-1 text-lg font-semibold">{formatCls(pagespeed.cls)}</p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Interaction delay (TBT)</p>
                  <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.tbtMs)}</p>
                </article>
                <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Overall speed index</p>
                  <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.speedIndexMs)}</p>
                </article>
              </div>
            ) : (
              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Live speed diagnostic metrics were unavailable for this run.
              </p>
            )}

            <div className="mt-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Top Website Issues</h3>
              {pagespeed.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-600">No high-priority website issues detected from Lighthouse.</p>
              ) : (
                pagespeed.diagnostics.map((diag) => (
                  <article key={diag.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{diag.title}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${impactClass(diag.impact)}`}>
                        {diag.impact.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{diag.description}</p>
                    <p className="mt-1 text-sm text-slate-800">
                      <strong>Fix:</strong> {diag.recommendation}
                    </p>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </details>

      <section className="mt-6 card print-break-avoid p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Review Strength vs Local Rivals</h2>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${reviewSource.className}`}>
            {reviewSource.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Snapshot of review strength versus top local competitor.
        </p>
        {hasUsableReviewGap ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Your shop</p>
              <p className="mt-1 text-lg font-semibold">
                {typeof reviewGap?.shopRating === 'number' ? reviewGap.shopRating.toFixed(1) : 'n/a'} stars •{' '}
                {typeof reviewGap?.shopReviews === 'number' ? reviewGap.shopReviews : 'n/a'} reviews
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Top competitor</p>
              <p className="mt-1 text-lg font-semibold">
                {typeof reviewGap?.competitorRating === 'number' ? reviewGap.competitorRating.toFixed(1) : 'n/a'} stars •{' '}
                {typeof reviewGap?.competitorReviews === 'number' ? reviewGap.competitorReviews : 'n/a'} reviews
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Review gap</p>
              <p className="mt-1 text-lg font-semibold">
                {typeof reviewGap?.reviewGap === 'number' ? reviewGap.reviewGap : 'n/a'} reviews
              </p>
              <p className="text-sm text-slate-700">Impact: {reviewGap?.impact || 'n/a'}</p>
            </article>
          </div>
        ) : ownGoogleReviewLabel ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your Google profile</p>
            <p className="mt-1 text-lg font-semibold">
              {googlePlace?.rating?.toFixed(1)} stars • {googlePlace?.userRatingCount ?? 0} reviews
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Competitor review comparison was unavailable in this run.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Live review comparison data was unavailable in this run.
          </div>
        )}
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Map Rankings for Collision Searches</h2>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${mapPackSource.className}`}>
            {mapPackSource.label}
          </span>
        </div>
        {!hasUsableMapPackData ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Live map-pack data was unavailable for this run.
          </p>
        ) : null}
        <p className="mt-1 text-sm text-slate-600">
          {hasUsableMapPackData
            ? mapPack.info
            : 'Map pack ranks were unavailable in this run and will be pulled during teardown.'}
        </p>
        {hasUsableMapPackData ? (
          <div className="mt-4 space-y-3">
            {mapPack.queries.map((row) => (
              <article key={row.query} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{row.query}</p>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <div className="rounded bg-slate-50 p-3">
                    <p>Rank 1: {row.rank1}</p>
                    <p>Rank 2: {row.rank2}</p>
                    <p>Rank 3: {row.rank3}</p>
                  </div>
                  <div className="rounded bg-slate-50 p-3">
                    <p className="font-medium">Your position</p>
                    <p>{row.yourRank}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {hasUsableMapPackData ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {mapPack.likelySignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            We could not compute reliable map-pack ranking signals for this run.
          </p>
        )}
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Trust Signals Shoppers Look For</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900">Detected</h3>
            {detectedSignals.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-900">No certification/capability signals detected.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-emerald-900">
                {detectedSignals.slice(0, 12).map((signal) => (
                  <li key={signal.signal_name}>
                    <p className="font-medium">{signal.signal_name.replace(/_/g, ' ')}</p>
                    <p className="text-xs">Confidence: {(signal.confidence * 100).toFixed(0)}%</p>
                    <a
                      href={signal.evidence.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline"
                    >
                      Evidence: {sanitizeEvidenceSnippet(signal.evidence.snippet || '')}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">Missing</h3>
            {missingSignals.length === 0 ? (
              <p className="mt-2 text-sm text-amber-900">No major baseline signals missing.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {missingSignals.slice(0, 12).map((signal) => (
                  <li key={signal}>{signal.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Tasks Sorted by Priority</h2>
        <p className="mt-1 text-sm text-slate-600">
          Do these in order to lift estimate calls and local visibility fastest.
        </p>
        <div className="mt-4 space-y-3">
          {ownerTopFixes.map((fix, idx) => (
            <article key={fix.title} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  #{idx + 1} {fix.title}
                </h3>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(fix.impact)}`}>
                  {fix.impact}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{fix.why}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {fix.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {nationalBenchmark ? (
        <section className="mt-6 card print-break-avoid p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">National Winners Playbook</h2>
              <p className="mt-1 text-sm text-slate-600">
                Comparison against top national collision shop patterns to show what drives more
                estimate requests.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              source: {nationalBenchmark.source}
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {nationalBenchmark.patterns.map((pattern) => (
              <article
                key={pattern.key}
                className={`rounded-lg border px-3 py-3 ${
                  pattern.gap
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{pattern.label}</p>
                  <p className="text-xs text-slate-700">
                    Leaders: {(pattern.leaderRate * 100).toFixed(0)}% • Your shop:{' '}
                    {pattern.shopHas ? 'Yes' : 'No'}
                  </p>
                </div>
                {pattern.evidenceExample ? (
                  <p className="mt-1 text-xs text-slate-600">Evidence: {pattern.evidenceExample}</p>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Do these to match national leaders</h3>
            {nationalBenchmark.topRecommendations.map((rec, idx) => (
              <article key={rec.title + idx} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    #{idx + 1} {rec.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(
                      rec.impact
                    )}`}
                  >
                    {rec.impact}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{rec.why}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {rec.action.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 card print-break-avoid p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">How Competitors Are Winning More Calls</h2>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${competitorSource.className}`}>
            {competitorSource.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Lightweight comparison of top competitors vs your current signal coverage.
        </p>
        {!hasUsableCompetitorData ? (
          <p className="mt-2 text-xs text-slate-500">
            Live competitor crawl was unavailable for this run. We only show competitor sections when we have source-backed shop data.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {hasUsableCompetitorData ? (
            (competitorDisplayRows.length > 0 ? competitorDisplayRows : vm.competitors).map((row, idx) => (
              <article key={row.name + idx} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{row.name}</p>
                {'advantages' in row ? (
                  <>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {row.advantages.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-600">
                      OEM mentions: {row.oemSignalCount} | Capabilities: {row.capabilityCount} | Estimate CTA:{' '}
                      {row.estimateCta ? 'Yes' : 'No'}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-700">Why they&apos;re winning: {row.whyWinning}</p>
                )}
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-600">Live competitor comparison was unavailable for this run.</p>
          )}
        </div>
      </section>

      <details className="mt-8 card print-break-avoid p-6">
        <summary className="cursor-pointer text-xl font-bold">Crawl Evidence (secondary)</summary>
        <p className="mt-1 text-sm text-slate-600">
          Pages analyzed and fetch status used to compute this scan.
        </p>
        <div className="mt-4 grid gap-2">
          {crawlEvidenceRows.length === 0 ? (
            <p className="text-sm text-slate-600">No page metadata captured in this run.</p>
          ) : (
            crawlEvidenceRows.slice(0, 12).map((row) => (
              <article key={`${row.url}-${row.status}`} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">{row.url}</p>
                <p className="text-xs text-slate-600">
                  status {row.status || 'n/a'} • {row.fetchMs}ms • {row.bytes} bytes
                </p>
              </article>
            ))
          )}
        </div>
      </details>

      <section className="mt-6 rounded-xl border border-teal-200 bg-teal-50 print-break-avoid p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Estimated Opportunity</h2>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${opportunitySource.className}`}>
            {opportunitySource.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-700">
          {hasLiveKeywordData
            ? 'Estimate based on live keyword demand and visibility gaps. Not a guarantee.'
            : 'Estimate based on modeled local demand and visibility gaps. Not a guarantee.'}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Monthly search demand estimate</p>
            <p className="mt-1 text-2xl font-bold">{vm.opportunity.monthlySearchDemand.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Modeled missed leads/month</p>
            <p className="mt-1 text-2xl font-bold">{vm.opportunity.missedLeads.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Modeled revenue opportunity</p>
            <p className="mt-1 text-2xl font-bold">${vm.opportunity.revenueOpportunity.toLocaleString()}</p>
            <p className="text-xs text-slate-500">
              ARO: ${vm.opportunity.averageRepairOrder.toLocaleString()}
              {!hasLiveKeywordData ? ' • modeled demand' : ''}
            </p>
          </div>
        </div>
      </section>

      <details className="mt-8 card print-break-avoid p-6">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.14em] text-[#c49a7a]">
          Full issue inventory
        </summary>
        <div className="mt-4 grid gap-3">
          {ownerIssues.length === 0 ? (
            <p className="text-sm text-slate-600">No major issues detected.</p>
          ) : null}
          {ownerIssues.map((issue) => (
            <article key={issue.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{issue.title}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(
                    issue.severity
                  )}`}
                >
                  {issue.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <strong>Why:</strong> {issue.why}
              </p>
              <p className="mt-1 text-sm text-slate-800">
                <strong>Fix:</strong> {issue.fix}
              </p>
            </article>
          ))}
        </div>
      </details>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card print-break-avoid p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Money Keywords</h2>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${keywordSource.className}`}>
              {keywordSource.label}
            </span>
          </div>
          {vm.keywords.length > 0 ? (
            <>
              <div className="mt-3 space-y-2">
                {vm.keywords.map((item) => (
                  <article key={item.keyword} className="rounded-md bg-slate-100 px-3 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{item.keyword}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-700">
                      Volume: {item.volumeLabel} | CPC: {item.cpcLabel} | Intent: {item.intent}
                    </p>
                  </article>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {hasLiveKeywordData
                  ? 'Live keyword demand metrics captured for this scan.'
                  : 'Keyword demand is estimated because live provider data was unavailable in this run.'}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No keyword opportunities were generated for this run.
            </p>
          )}
        </div>

        <div className="card print-break-avoid p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Top local competitors we&apos;ll benchmark on your teardown</h2>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${competitorSource.className}`}>
              {competitorSource.label}
            </span>
          </div>
          {hasUsableCompetitorData ? (
            <div className="mt-3 space-y-3">
              {vm.competitors.map((comp, idx) => (
                <article key={`${comp.name}-${idx}`} className="rounded-md border border-slate-200 p-3">
                  <p className="font-semibold">{comp.name}</p>
                  {hasUsableReviewGap && typeof comp.rating === 'number' && typeof comp.reviews === 'number' ? (
                    <p className="mt-1 text-xs text-slate-700">
                      {comp.rating.toFixed(1)} stars • {comp.reviews} reviews
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-700">Why they&apos;re winning: {comp.whyWinning}</p>
                </article>
              ))}
            </div>
          ) : ownGoogleReviewLabel ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Your Google profile is connected</p>
              <p className="mt-1">
                {googlePlace?.rating?.toFixed(1)} stars • {googlePlace?.userRatingCount ?? 0} reviews
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Competitor extraction was unavailable for this run, so teardown benchmarking is pending.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Live competitor extraction was unavailable in this run.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">30-Day Plan</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {plan.map((item) => (
            <article key={item.week} className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{item.week}</p>
              <h3 className="mt-1 font-semibold">{item.focus}</h3>
              <p className="mt-1 text-sm text-slate-700">{item.outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Executive Summary</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{executiveSummary}</p>
      </section>

      <section className="mt-8 card p-6 print-hide">
        <h2 className="text-xl font-bold">Want help fixing this?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Big Dot can handle the fixes with a one-time teardown or ongoing weekly monitoring.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {vm.ctaBullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <ReportCtaActions
          scanId={scanRecord.id}
          calendlyUrl={teardownIntakeUrl}
          salesPhone={salesPhone}
          reportUrl={reportUrl}
          trackBooked={false}
        />

        <ReportShareActions reportUrl={reportUrl} />

        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-500">
            Includes 3 free reports per month. Start a 30-day trial, then continue at $49/month.
          </p>
          <Link href={monitoringLandingUrl} className="btn-variant-secondary px-4 py-2 text-sm">
            Prefer monitoring? Start free trial (no call required)
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Not legal advice. SEO performance varies by location and competition.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Scoring model: {snapshot?.scoringModelVersion || dbScan?.scoringModelVersion || 'v0.1'}
        </p>
      </section>

      <div className="mt-8 print-hide">
        <Link href="/" className="text-sm text-teal-700 underline">
          Run another scan
        </Link>
      </div>

      <footer className="print-only mt-6 border-t border-slate-300 pt-3 text-[10px] text-slate-600">
        Collision SEO Scan report. Modeled estimates for planning only.
      </footer>
      </main>
    );
  } catch (error) {
    console.error('REPORT_LOAD_ERROR', {
      id: scanId,
      message: error instanceof Error ? error.message : 'Unknown report load error'
    });

    return (
      <main className="container-shell pb-20 pt-12">
        <section className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Report temporarily unavailable</h1>
          <p className="mt-2 text-sm text-slate-700">
            We could not load this report right now. Please retry in a moment or run a new scan.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-teal-700 underline">
            Back to scanner
          </Link>
        </section>
      </main>
    );
  }
}
