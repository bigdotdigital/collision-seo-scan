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

function severityClass(severity: string) {
  if (severity === 'High') return 'bg-red-100 text-red-700';
  if (severity === 'Med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

export default async function ReportPage({ params }: { params: { scanId: string } }) {
  const scan = await prisma.scan.findUnique({ where: { id: params.scanId } });
  if (!scan) return notFound();

  const snapshot = scan.latestSnapshotId
    ? await prisma.scanSnapshot.findUnique({ where: { id: scan.latestSnapshotId } })
    : await prisma.scanSnapshot.findFirst({
        where: { scanId: scan.id },
        orderBy: { createdAt: 'desc' }
      });

  const issues = parseJson<Issue[]>(scan.issuesJson, []);
  const keywords = parseJson<MoneyKeyword[]>(scan.moneyKeywordsJson, []);
  const competitors = snapshot
    ? parseJson<Competitor[]>(snapshot.topCompetitorsJson, parseJson<Competitor[]>(scan.competitorsJson, []))
    : parseJson<Competitor[]>(scan.competitorsJson, []);
  const plan = parseJson<ThirtyDayPlanItem[]>(scan.thirtyDayPlanJson, []);
  const raw = parseJson<Record<string, unknown>>(scan.rawChecksJson, {});

  const scoreTotal = snapshot?.visibilityScore ?? scan.scoreTotal;
  const scoreWebsite = scan.scoreWebsite;
  const scoreLocal = scan.scoreLocal;
  const scoreIntent = scan.scoreIntent;

  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/your-team/15min';
  const salesPhone = process.env.SALES_PHONE || '+13035551234';

  const reportData: ReportData = {
    scanId: scan.id,
    shopName: scan.shopName,
    city: scan.city,
    websiteUrl: scan.websiteUrl,
    scoreTotal,
    scoreWebsite,
    scoreLocal,
    scoreIntent,
    issues,
    moneyKeywords: keywords,
    competitors,
    thirtyDayPlan: plan,
    aiSummary: scan.aiSummary,
    calendlyBase: calendly,
    salesPhone,
    rawChecks: {
      reviews: (raw.reviews as { rating?: number; reviews?: number } | undefined) || undefined,
      competitorReviews:
        (raw.competitorReviews as { rating?: number; reviews?: number } | undefined) || undefined
    }
  };

  const vm = buildReportViewModel(reportData);
  const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/report/${scan.id}`;
  const printedAt = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date());

  return (
    <main className="container-shell report-print pb-24 pt-10 md:pb-10">
      {!scan.email ? <ReportEmailCapture scanId={scan.id} /> : null}
      <ReportCtaActions
        scanId={scan.id}
        calendlyUrl={vm.calendlyTrackedUrl}
        salesPhone={salesPhone}
        mobileSticky
      />

      <section className="print-only mb-4 border-b border-slate-300 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">Collision SEO Scan</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{scan.shopName}</h1>
        <p className="text-xs text-slate-700">
          {scan.city} • {scan.websiteUrl} • Generated {printedAt}
        </p>
      </section>

      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            Collision SEO Scan Report
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{scan.shopName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {scan.city} • {scan.websiteUrl}
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
          <p className="mt-1 text-3xl font-bold">{scoreWebsite}</p>
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

      {scan.aiSummary ? (
        <section className="mt-8 card print-break-avoid p-6">
          <h2 className="text-xl font-bold">Executive Summary</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{scan.aiSummary}</p>
        </section>
      ) : null}

      <section className="mt-8 card p-6 print-hide">
        <h2 className="text-xl font-bold">Next step: Fix the leaks</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {vm.ctaBullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <ReportCtaActions scanId={scan.id} calendlyUrl={vm.calendlyTrackedUrl} salesPhone={salesPhone} />
        <ReportFastPathForm
          orgId={scan.organizationId}
          scanId={scan.id}
          email={scan.email}
          phone={scan.phone}
        />

        <ReportShareActions reportUrl={reportUrl} />

        <p className="mt-4 text-xs text-slate-500">
          Not legal advice. SEO performance varies by location and competition.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Scoring model: {snapshot?.scoringModelVersion || scan.scoringModelVersion}
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
}
