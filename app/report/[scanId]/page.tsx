import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ScoreRing } from '@/components/score-ring';
import { parseJson } from '@/lib/json';
import type { Competitor, Issue, MoneyKeyword, ThirtyDayPlanItem } from '@/lib/types';
import { ReportEmailCapture } from '@/components/report-email-capture';
import { ReportCtaActions, ReportShareActions } from '@/components/report-cta-actions';
import { buildReportViewModel, type ReportData } from '@/lib/report-view-model';
import { ReportFastPathForm } from '@/components/report-fast-path-form';
import type { PageSpeedResult } from '@/lib/pagespeed';
import { formatCls, formatMilliseconds, formatScore } from '@/lib/metric-format';
import { getScanRecord } from '@/lib/scan-store';
import { logEnvWarningsOnce } from '@/lib/env-check';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{24,}$/i;

function isValidScanId(id: string): boolean {
  return UUID_RE.test(id) || CUID_RE.test(id);
}

function severityClass(severity: string) {
  if (severity === 'High') return 'bg-red-100 text-red-700';
  if (severity === 'Med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

function impactClass(impact: 'high' | 'med' | 'low') {
  if (impact === 'high') return 'bg-red-100 text-red-700';
  if (impact === 'med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

function normalizeImpact(value: unknown): 'high' | 'med' | 'low' {
  if (value === 'high' || value === 'med' || value === 'low') return value;
  return 'low';
}

function normalizePageSpeed(input: unknown, fallbackWebsiteScore: number): PageSpeedResult {
  const raw = (input || {}) as Partial<PageSpeedResult> & { diagnostics?: unknown };
  const diagnostics = Array.isArray(raw.diagnostics)
    ? raw.diagnostics
        .map((item, idx) => {
          const row = item as Record<string, unknown>;
          const title = typeof row?.title === 'string' ? row.title : 'Website issue detected';
          const recommendation =
            typeof row?.recommendation === 'string'
              ? row.recommendation
              : 'Apply technical cleanup to improve performance.';
          return {
            id: typeof row?.id === 'string' ? row.id : `diag-${idx}`,
            title,
            description:
              typeof row?.description === 'string'
                ? row.description
                : 'This website element is reducing page performance.',
            impact: normalizeImpact(row?.impact),
            recommendation
          };
        })
        .slice(0, 5)
    : [];

  return {
    status: raw.status === 'ok' ? 'ok' : 'error',
    message: typeof raw.message === 'string' ? raw.message : undefined,
    performanceScore:
      typeof raw.performanceScore === 'number' ? raw.performanceScore : fallbackWebsiteScore,
    lcpMs: typeof raw.lcpMs === 'number' ? raw.lcpMs : null,
    cls: typeof raw.cls === 'number' ? raw.cls : null,
    tbtMs: typeof raw.tbtMs === 'number' ? raw.tbtMs : null,
    speedIndexMs: typeof raw.speedIndexMs === 'number' ? raw.speedIndexMs : null,
    diagnostics
  };
}

function normalizeIssues(input: unknown): Issue[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      const severity =
        row?.severity === 'High' || row?.severity === 'Med' || row?.severity === 'Low'
          ? row.severity
          : 'Low';
      return {
        id: typeof row?.id === 'string' ? row.id : `issue-${idx}`,
        severity,
        title: typeof row?.title === 'string' ? row.title : 'Action item',
        why: typeof row?.why === 'string' ? row.why : 'This issue reduces local SEO performance.',
        fix: typeof row?.fix === 'string' ? row.fix : 'Apply recommended technical/content updates.'
      } as Issue;
    })
    .slice(0, 10);
}

function normalizeKeywords(input: unknown): MoneyKeyword[] {
  if (!Array.isArray(input)) return [];
  const rows = input
    .map<MoneyKeyword | null>((item) => {
      if (typeof item === 'string') {
        return { keyword: item, source: 'modeled' };
      }
      const row = item as Record<string, unknown>;
      if (typeof row?.keyword !== 'string') return null;
      return {
        keyword: row.keyword,
        volume: typeof row.volume === 'number' ? row.volume : null,
        cpc: typeof row.cpc === 'number' ? row.cpc : null,
        source: row.source === 'api' ? 'api' : 'modeled'
      };
    })
    .filter((x): x is MoneyKeyword => Boolean(x));

  return rows.slice(0, 20);
}

function normalizeCompetitors(input: unknown, city: string): Competitor[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      const name =
        typeof row?.name === 'string' && row.name.trim()
          ? row.name
          : `Leading ${city} collision shop #${idx + 1}`;
      return {
        name,
        url: typeof row?.url === 'string' ? row.url : undefined,
        note: typeof row?.note === 'string' ? row.note : 'Benchmark profile',
        differentiatorGuess:
          typeof row?.differentiatorGuess === 'string'
            ? row.differentiatorGuess
            : 'Stronger local trust and conversion signals.'
      } as Competitor;
    })
    .slice(0, 5);
}

function normalizePlan(input: unknown): ThirtyDayPlanItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      return {
        week: typeof row?.week === 'string' ? row.week : `Week ${idx + 1}`,
        focus: typeof row?.focus === 'string' ? row.focus : 'Execution sprint',
        outcome:
          typeof row?.outcome === 'string'
            ? row.outcome
            : 'Implement prioritized SEO and conversion improvements.'
      } as ThirtyDayPlanItem;
    })
    .slice(0, 4);
}

export default async function ReportPage({ params }: { params: { scanId: string } }) {
  logEnvWarningsOnce();
  const scanId = params.scanId;
  if (!isValidScanId(scanId)) return notFound();

  try {
    const scanRecord = await getScanRecord(scanId);
    if (!scanRecord) return notFound();

    const dbScan = await prisma.scan.findUnique({ where: { id: scanId } }).catch(() => null);

  const snapshot = dbScan?.latestSnapshotId
    ? await prisma.scanSnapshot.findUnique({ where: { id: dbScan.latestSnapshotId } }).catch(() => null)
    : dbScan
      ? await prisma.scanSnapshot
          .findFirst({
            where: { scanId: dbScan.id },
            orderBy: { createdAt: 'desc' }
          })
          .catch(() => null)
      : null;

  const issues = normalizeIssues(
    dbScan ? parseJson<unknown>(dbScan.issuesJson, scanRecord.issues) : scanRecord.issues
  );
  const keywords = normalizeKeywords(
    dbScan
      ? parseJson<unknown>(dbScan.moneyKeywordsJson, scanRecord.moneyKeywords)
      : scanRecord.moneyKeywords
  );
  const competitors = normalizeCompetitors(
    snapshot
      ? parseJson<unknown>(
          snapshot.topCompetitorsJson,
          dbScan
            ? parseJson<unknown>(dbScan.competitorsJson, scanRecord.competitors)
            : scanRecord.competitors
        )
      : dbScan
        ? parseJson<unknown>(dbScan.competitorsJson, scanRecord.competitors)
        : scanRecord.competitors,
    scanRecord.city
  );
  const plan = normalizePlan(
    dbScan
      ? parseJson<unknown>(dbScan.thirtyDayPlanJson, scanRecord.thirtyDayPlan)
      : scanRecord.thirtyDayPlan
  );
  const raw = dbScan ? parseJson<Record<string, unknown>>(dbScan.rawChecksJson, {}) : {};

  const scoreTotal = snapshot?.visibilityScore ?? scanRecord.scoreTotal;
  const scoreWebsite = scanRecord.scoreWebsite;
  const scoreLocal = scanRecord.scoreLocal;
  const scoreIntent = scanRecord.scoreIntent;

    const pagespeed = normalizePageSpeed(scanRecord.pagespeed, scoreWebsite);
  const websiteCardScore = pagespeed.performanceScore ?? scoreWebsite;

  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/your-team/15min';
  const salesPhone = process.env.SALES_PHONE || '+13035551234';

  const reportData: ReportData = {
    scanId: scanRecord.id,
    shopName: scanRecord.shopName,
    city: scanRecord.city,
    websiteUrl: scanRecord.url,
    scoreTotal,
    scoreWebsite,
    scoreLocal,
    scoreIntent,
    issues,
    moneyKeywords: keywords,
    competitors,
    thirtyDayPlan: plan,
    aiSummary: scanRecord.aiSummary,
    calendlyBase: calendly,
    salesPhone,
    rawChecks: {
      reviews: (raw.reviews as { rating?: number; reviews?: number } | undefined) || undefined,
      competitorReviews:
        (raw.competitorReviews as { rating?: number; reviews?: number } | undefined) || undefined
    }
  };

  const vm = buildReportViewModel(reportData);
    const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/report/${scanRecord.id}`;
    const printedAt = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());

    return (
      <main className="container-shell report-print pb-24 pt-10 md:pb-10">
      {!scanRecord.email ? <ReportEmailCapture scanId={scanRecord.id} /> : null}
      <ReportCtaActions
        scanId={scanRecord.id}
        calendlyUrl={vm.calendlyTrackedUrl}
        salesPhone={salesPhone}
        mobileSticky
      />

      <section className="print-only mb-4 border-b border-slate-300 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">Collision SEO Scan</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{scanRecord.shopName}</h1>
        <p className="text-xs text-slate-700">
          {scanRecord.city} • {scanRecord.url} • Generated {printedAt}
        </p>
      </section>

      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            Collision SEO Scan Report
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{scanRecord.shopName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {scanRecord.city} • {scanRecord.url}
          </p>
        </div>
        <ScoreRing score={scoreTotal} />
      </div>

      {vm.dataStatusBanner ? (
        <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {vm.dataStatusBanner}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card print-break-avoid p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Website</p>
          <p className="mt-1 text-3xl font-bold">{formatScore(websiteCardScore)}</p>
          <p className="mt-1 text-xs text-slate-500">Performance score (PageSpeed mobile)</p>
        </div>
        <div className="card print-break-avoid p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Local</p>
          <p className="mt-1 text-3xl font-bold">{scoreLocal}</p>
        </div>
        <div className="card print-break-avoid p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Intent</p>
          <p className="mt-1 text-3xl font-bold">{scoreIntent}</p>
        </div>
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Website Performance Diagnostics</h2>
        {pagespeed.status === 'error' ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Could not load PageSpeed data right now. {pagespeed.message || 'Please try again later.'}
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">LCP</p>
                <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.lcpMs)}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">CLS</p>
                <p className="mt-1 text-lg font-semibold">{formatCls(pagespeed.cls)}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">TBT</p>
                <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.tbtMs)}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Speed Index</p>
                <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.speedIndexMs)}</p>
              </article>
            </div>

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
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Google Reputation Gap</h2>
        <p className="mt-1 text-sm text-slate-600">
          Snapshot of review strength versus top local competitor.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your shop</p>
            <p className="mt-1 text-lg font-semibold">
              {vm.reviewGap.shopRating.toFixed(1)} stars • {vm.reviewGap.shopReviews} reviews
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Top competitor</p>
            <p className="mt-1 text-lg font-semibold">
              {vm.reviewGap.competitorRating.toFixed(1)} stars • {vm.reviewGap.competitorReviews} reviews
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Review gap</p>
            <p className="mt-1 text-lg font-semibold">{vm.reviewGap.reviewGap} reviews</p>
            <p className="text-sm text-slate-700">Impact: {vm.reviewGap.impact}</p>
          </article>
        </div>
        {vm.reviewGap.isEstimated ? (
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <p>Google review source: Not connected yet. Showing conservative estimate.</p>
            <p>We&apos;ll pull competitor review stats on the teardown.</p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Google Maps Visibility</h2>
        <p className="mt-1 text-sm text-slate-600">{vm.mapPack.info}</p>
        <div className="mt-4 space-y-3">
          {vm.mapPack.queries.map((row) => (
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
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {vm.mapPack.likelySignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-teal-200 bg-teal-50 print-break-avoid p-6">
        <h2 className="text-xl font-bold text-slate-900">Estimated Opportunity (modeled)</h2>
        <p className="mt-1 text-sm text-slate-700">
          Modeled estimate based on local demand + visibility gaps. Not a guarantee.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Monthly search demand</p>
            <p className="mt-1 text-2xl font-bold">{vm.opportunity.monthlySearchDemand.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Missed leads/month</p>
            <p className="mt-1 text-2xl font-bold">{vm.opportunity.missedLeads.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Revenue opportunity</p>
            <p className="mt-1 text-2xl font-bold">${vm.opportunity.revenueOpportunity.toLocaleString()}</p>
            <p className="text-xs text-slate-500">ARO: ${vm.opportunity.averageRepairOrder.toLocaleString()}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Top Actionable Issues</h2>
        <div className="mt-4 grid gap-3">
          {issues.length === 0 ? (
            <p className="text-sm text-slate-600">No major issues detected.</p>
          ) : null}
          {issues.map((issue) => (
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
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card print-break-avoid p-6">
          <h2 className="text-xl font-bold">Money Keywords</h2>
          <div className="mt-3 space-y-2">
            {vm.keywords.map((item) => (
              <article key={item.keyword} className="rounded-md bg-slate-100 px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.keyword}</p>
                  {item.estimated ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      est.
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-700">
                  Volume: {item.volumeLabel} | CPC: {item.cpcLabel} | Intent: {item.intent}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Exact volumes pulled during teardown.</p>
        </div>

        <div className="card print-break-avoid p-6">
          <h2 className="text-xl font-bold">Top local competitors we&apos;ll benchmark on your teardown</h2>
          <div className="mt-3 space-y-3">
            {vm.competitors.map((comp, idx) => (
              <article key={`${comp.name}-${idx}`} className="rounded-md border border-slate-200 p-3">
                <p className="font-semibold">{comp.name}</p>
                {typeof comp.rating === 'number' && typeof comp.reviews === 'number' ? (
                  <p className="mt-1 text-xs text-slate-700">
                    {comp.rating.toFixed(1)} stars • {comp.reviews} reviews
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-700">Why they&apos;re winning: {comp.whyWinning}</p>
              </article>
            ))}
          </div>
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

      {scanRecord.aiSummary ? (
        <section className="mt-8 card print-break-avoid p-6">
          <h2 className="text-xl font-bold">Executive Summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{scanRecord.aiSummary}</p>
        </section>
      ) : null}

      <section className="mt-8 card p-6 print-hide">
        <h2 className="text-xl font-bold">Next step: Fix the leaks</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {vm.ctaBullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <ReportCtaActions scanId={scanRecord.id} calendlyUrl={vm.calendlyTrackedUrl} salesPhone={salesPhone} />
        <ReportFastPathForm
          orgId={dbScan?.organizationId}
          scanId={scanRecord.id}
          vertical={dbScan?.vertical || 'collision'}
          email={scanRecord.email}
          phone={scanRecord.phone}
        />

        <ReportShareActions reportUrl={reportUrl} />

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
