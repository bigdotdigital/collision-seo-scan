import { MetricCard } from '@/components/metric-card';
import { MultiProgressBar } from '@/components/multi-progress-bar';
import { CompetitorComparison } from '@/components/competitor-comparison';
import { InteractiveMap } from '@/components/interactive-map';
import { BarChart } from '@/components/bar-chart';
import { PieChart } from '@/components/pie-chart';
import { HeroMetric } from '@/components/hero-metric';
import { PageHeader } from '@/components/page-header';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { parseJson } from '@/lib/json';
import { parseReportPayload } from '@/lib/report-payload';
import type { Issue } from '@/lib/types';
import { deriveCompetitorSuggestions } from '@/lib/dashboard-suggestions';
import { calculateRevenueImpact, calculateTrends, prepareCategoryDistribution } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

function sourceTone(state: string | null | undefined): 'live' | 'cached' | 'modeled' | 'fallback' | 'unknown' {
  if (state === 'live') return 'live';
  if (state === 'cached') return 'cached';
  if (state === 'modeled') return 'modeled';
  if (state === 'fallback') return 'fallback';
  return 'unknown';
}

export default async function DashboardOverviewPage() {
  const ctx = await requireDashboardContext();

  const [latestScan, previousScan, activeKeywords, keywordRows, subscription] = await Promise.all([
    prisma.scan.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        scoreTotal: true,
        scoreWebsite: true,
        scoreLocal: true,
        scoreIntent: true,
        issuesJson: true,
        moneyKeywordsJson: true,
        competitorsJson: true,
        rawChecksJson: true,
        websiteUrl: true,
        city: true,
        shopName: true
      }
    }),
    prisma.scan.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      select: {
        scoreTotal: true,
        scoreWebsite: true,
        scoreLocal: true
      }
    }),
    prisma.trackedKeyword.count({
      where: { orgId: ctx.orgId, isActive: true }
    }),
    prisma.trackedKeyword.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
      include: {
        snapshots: {
          orderBy: { snapshotDate: 'desc' },
          take: 2
        }
      }
    }),
    prisma.subscription.findUnique({
      where: { orgId: ctx.orgId },
      select: { planTier: true, status: true, trialEndsAt: true }
    })
  ]);

  const rawPayload = latestScan ? parseJson<unknown>(latestScan.rawChecksJson, null) : null;
  const reportPayload = parseReportPayload(rawPayload);
  const rawMoneyKeywords = parseJson<Array<{ keyword?: string; volume?: number | null }>>(latestScan?.moneyKeywordsJson || '', []);
  const issues = latestScan ? parseJson<Issue[]>(latestScan.issuesJson, []) : [];

  const trends = latestScan && previousScan ? calculateTrends(latestScan, previousScan) : null;
  const categories = prepareCategoryDistribution(reportPayload);
  const moneyKeywords = Array.isArray(rawMoneyKeywords)
    ? rawMoneyKeywords
        .filter((row): row is { keyword: string; volume?: number | null } => typeof row?.keyword === 'string')
        .map((row) => ({ keyword: row.keyword, volume: row.volume ?? undefined }))
    : [];
  const revenueImpact = calculateRevenueImpact(latestScan?.scoreTotal ?? 0, moneyKeywords);
  const hasRevenueInputs = moneyKeywords.some((row) => typeof row.volume === 'number' && row.volume > 0);
  const rankedKeywords = keywordRows
    .map((keyword) => {
      const current = keyword.snapshots[0]?.rankPosition ?? null;
      const previous = keyword.snapshots[1]?.rankPosition ?? null;
      const delta = current !== null && previous !== null ? previous - current : null;
      return {
        term: keyword.term,
        current,
        delta
      };
    })
    .filter((row) => row.current !== null)
    .sort((a, b) => (a.current ?? 999) - (b.current ?? 999));
  const keywordBarData = rankedKeywords.slice(0, 7).map((row) => Math.max(10, 100 - (row.current ?? 100) * 3));
  const avgTrackedPosition =
    rankedKeywords.length > 0
      ? Number((rankedKeywords.reduce((sum, row) => sum + (row.current ?? 0), 0) / rankedKeywords.length).toFixed(1))
      : null;
  const avgTrackedDeltaRows = rankedKeywords.filter((row) => row.delta !== null);
  const avgTrackedDelta =
    avgTrackedDeltaRows.length > 0
      ? Number(
          (
            avgTrackedDeltaRows.reduce((sum, row) => sum + (row.delta ?? 0), 0) /
            avgTrackedDeltaRows.length
          ).toFixed(1)
        )
      : null;

  const yourShop = {
    name: reportPayload?.googlePlace?.name || latestScan?.shopName || 'Your Shop',
    score: latestScan?.scoreTotal ?? null,
    hasOemCerts: Boolean(reportPayload?.checks.oemSignals?.length),
    hasOnlineEstimate: Boolean(reportPayload?.checks.onlineEstimateFlow || reportPayload?.checks.estimateCtaDetected),
    reviewCount: reportPayload?.googlePlace?.userRatingCount ?? null,
    reviewRating: reportPayload?.googlePlace?.rating ?? null
  };

  const competitors = (reportPayload?.competitorAdvantages || []).slice(0, 4).map((competitor, index) => ({
    name: competitor.name,
    score: null,
    hasOemCerts: competitor.oemSignalCount > 0,
    hasOnlineEstimate: competitor.estimateCta,
    reviewCount:
      index === 0 && typeof reportPayload?.reviewGap?.competitorReviews === 'number'
        ? reportPayload.reviewGap.competitorReviews
        : null,
    reviewRating:
      index === 0 && typeof reportPayload?.reviewGap?.competitorRating === 'number'
        ? reportPayload.reviewGap.competitorRating
        : null
  }));
  const competitorSuggestions = latestScan
    ? deriveCompetitorSuggestions({
        shopName: latestScan.shopName || '',
        city: latestScan.city || '',
        websiteUrl: latestScan.websiteUrl || '',
        competitorsJson: latestScan.competitorsJson,
        rawChecksJson: latestScan.rawChecksJson
      })
    : [];

  const hasGeographicPoints =
    typeof reportPayload?.googlePlace?.lat === 'number' &&
    typeof reportPayload?.googlePlace?.lng === 'number';
  const mapPoints = [
    {
      id: 'shop',
      label: yourShop.name,
      detail:
        typeof yourShop.score === 'number'
          ? `SEO score ${yourShop.score}/100${typeof yourShop.reviewRating === 'number' ? ` • ${yourShop.reviewRating.toFixed(1)}★` : ''}`
          : 'Primary shop record',
      x: hasGeographicPoints ? 50 : 28,
      y: hasGeographicPoints ? 50 : Math.max(18, 100 - (yourShop.score || 50)),
      tone: 'shop' as const
    },
    ...competitors.map((competitor, index) => ({
      id: `competitor-${index}`,
      label: competitor.name,
      detail: [
        'Source-backed competitor suggestion',
        competitor.hasOemCerts ? 'Has OEM signals' : 'No OEM signals detected',
        competitor.hasOnlineEstimate ? 'Estimate CTA detected' : 'No estimate CTA detected'
      ].join(' • '),
      x: hasGeographicPoints ? 20 + index * 18 : 54 + index * 10,
      y: hasGeographicPoints ? 22 + index * 14 : 30 + index * 12,
      tone: 'competitor' as const
    }))
  ];

  const visibilitySegments = [
    { color: 'var(--accent-blue)', value: categories[0]?.value ?? 0, label: categories[0]?.label ?? 'Technical SEO' },
    { color: 'var(--accent-green)', value: categories[1]?.value ?? 0, label: categories[1]?.label ?? 'Local SEO' },
    { color: 'var(--accent-orange)', value: categories[2]?.value ?? 0, label: categories[2]?.label ?? 'Authority' },
    { color: 'var(--accent-purple)', value: categories[3]?.value ?? 0, label: categories[3]?.label ?? 'Performance' },
    { color: 'var(--accent-pink)', value: categories[4]?.value ?? 0, label: categories[4]?.label ?? 'Coverage' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Revenue Dashboard"
        subtitle="Priority metrics are shown with explicit source status. Measured scores stay separate from modeled traffic, lead, and revenue opportunity."
        eyebrow="Overview"
        badges={[
          {
            label: `Keywords ${moneyKeywords.length > 0 ? 'modeled' : 'unavailable'}`,
            tone: moneyKeywords.length > 0 ? 'modeled' : 'unknown',
            title:
              moneyKeywords.length > 0
                ? 'Opportunity metrics use keyword-volume inputs from the latest scan payload.'
                : 'No money-keyword volume was captured in the latest scan.'
          },
          {
            label: `Reviews ${reportPayload?.sources?.reviews || 'unavailable'}`,
            tone: sourceTone(reportPayload?.sources?.reviews),
            title: 'Google profile and review cards use the latest scan source label.'
          },
          {
            label: `Competitors ${reportPayload?.sources?.competitors || 'unavailable'}`,
            tone: sourceTone(reportPayload?.sources?.competitors),
            title: 'Competitor sections only show saved or source-backed competitor data.'
          },
          {
            label: `Map pack ${reportPayload?.sources?.mapPack || 'unavailable'}`,
            tone: sourceTone(reportPayload?.sources?.mapPack),
            title: 'Map positioning is only precise when geo-backed source data exists.'
          }
        ]}
        actions={
          <button className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-body)]">
            Last 30 Days ▼
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          value={latestScan?.scoreTotal ?? 'N/A'}
          label="Overall SEO Score"
          subtitle="Out of 100 points"
          trend={trends?.overall}
          className="lg:col-span-1"
        />

        <MetricCard
          value={activeKeywords}
          label="Tracked Keywords"
          subtitle="High-intent terms"
          trend={{ value: `${activeKeywords}`, type: activeKeywords > 0 ? 'up' : 'down' }}
          className="lg:col-span-1"
        />

        <MetricCard
          value={issues.length}
          label="Action Items"
          subtitle="Quick fixes available"
          className="lg:col-span-1"
        />

        <MetricCard
          value={subscription?.status === 'active' ? 'Active' : 'Trial'}
          label="Monitoring Status"
          subtitle={
            subscription?.trialEndsAt
              ? `Ends ${new Date(subscription.trialEndsAt).toLocaleDateString()}`
              : ''
          }
          className="lg:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <MetricCard
          value={hasRevenueInputs ? revenueImpact.traffic : 'Unavailable'}
          label="Modeled Search Traffic"
          subtitle={
            hasRevenueInputs
              ? `${revenueImpact.assumptions.ctrModel} from saved money-keyword volume`
              : 'No keyword volume data in the latest scan, so traffic remains unavailable'
          }
          className="lg:col-span-1"
        />
        <MetricCard
          value={hasRevenueInputs ? revenueImpact.leads : 'Unavailable'}
          label="Modeled Leads"
          subtitle={hasRevenueInputs ? revenueImpact.assumptions.leadRate : 'Lead modeling turns on after keyword-demand data is saved'}
          className="lg:col-span-1"
        />
        <MetricCard
          value={hasRevenueInputs ? `$${revenueImpact.revenue.toLocaleString()}` : 'Unavailable'}
          label="Modeled Revenue Opportunity"
          subtitle={hasRevenueInputs ? revenueImpact.assumptions.averageOrderValue : 'Revenue modeling turns on after keyword-demand data is saved'}
          className="lg:col-span-1"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tracked Keyword Positions</div>
            <div className="card-action">●●●</div>
          </div>
          <div className="ranking-status text-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {avgTrackedPosition !== null ? `Avg. tracked position ${avgTrackedPosition}` : 'No tracked keyword positions yet'}
          </div>
          <div className="ranking-subtext">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            {avgTrackedDelta !== null
              ? `${avgTrackedDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(avgTrackedDelta)} positions on average`
              : 'Need two keyword snapshots to show movement'}
          </div>
          <BarChart
            data={keywordBarData.length > 0 ? keywordBarData : [10, 10, 10, 10, 10, 10, 10]}
            activeIndex={keywordBarData.length > 0 ? 0 : -1}
            labels={
              rankedKeywords.slice(0, 7).length > 0
                ? rankedKeywords.slice(0, 7).map((row) => row.term.slice(0, 1).toUpperCase())
                : ['K', 'E', 'Y', 'W', 'O', 'R', 'D']
            }
          />
        </div>

        <div className="card span-2">
          <div className="card-header">
            <div className="card-title">SEO Category Mix</div>
            <div className="card-action">●●●</div>
          </div>
          <div className="segmented-control">
            <div className="segment active">Category Scores</div>
            <div className="segment">Current Snapshot</div>
          </div>
          <PieChart segments={visibilitySegments} />
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Google Profile Snapshot</div>
            <div className="card-action" style={{ color: 'var(--accent-blue)' }}>
              {reportPayload?.googlePlace?.googleMapsUri ? 'Maps linked' : 'No live profile link'}
            </div>
          </div>
          <HeroMetric
            value={reportPayload?.googlePlace?.userRatingCount ?? 0}
            label="google reviews"
            orbitStats={[
              { value: Math.round((reportPayload?.googlePlace?.rating ?? 0) * 10), label: 'rating x10' },
              {
                value: typeof reportPayload?.reviewGap?.competitorReviews === 'number' ? reportPayload.reviewGap.competitorReviews : 0,
                label: 'comp reviews'
              }
            ]}
          />
          <div className="hero-footer">
            {reportPayload?.googlePlace
              ? `Google Places snapshot${typeof reportPayload.googlePlace.rating === 'number' ? ` • ${reportPayload.googlePlace.rating.toFixed(1)} star rating` : ''}.`
              : 'No live Google Places profile was captured in the latest payload.'}
          </div>
          <a
            className="button-pill"
            href={reportPayload?.googlePlace?.googleMapsUri || '/dashboard/reports'}
            target={reportPayload?.googlePlace?.googleMapsUri ? '_blank' : undefined}
            rel={reportPayload?.googlePlace?.googleMapsUri ? 'noreferrer' : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {reportPayload?.googlePlace?.googleMapsUri ? 'Open Google profile' : 'Open reports'}
          </a>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-main)]">SEO Category Distribution</h3>
          </div>
          <MultiProgressBar segments={categories} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <CompetitorComparison
          yourShop={yourShop}
          competitors={competitors}
          reviewGapOverride={reportPayload?.reviewGap?.reviewGap ?? null}
        />
        <InteractiveMap
          points={mapPoints}
          geographic={hasGeographicPoints}
          title={hasGeographicPoints ? 'Interactive Market Map' : 'Interactive Relative Position Map'}
        />
      </div>

      {competitors.length === 0 && competitorSuggestions.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Competitor suggestions</div>
            <div className="card-action">Source-backed</div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            No tracked competitor comparison is available yet. The latest scan found these shops for review in settings.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {competitorSuggestions.slice(0, 4).map((competitor) => (
              <div key={competitor.name} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-body)] px-4 py-4">
                <p className="font-medium text-[var(--text-main)]">{competitor.name}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{competitor.websiteUrl || competitor.note}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
