import { MetricCard } from '@/components/metric-card';
import { MultiProgressBar } from '@/components/multi-progress-bar';
import { CompetitorComparison } from '@/components/competitor-comparison';
import { InteractiveMap } from '@/components/interactive-map';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { parseJson } from '@/lib/json';
import { parseReportPayload } from '@/lib/report-payload';
import type { Issue } from '@/lib/types';
import { calculateRevenueImpact, calculateTrends, prepareCategoryDistribution } from '@/lib/dashboard-data';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const ctx = await requireDashboardContext();

  const [latestScan, previousScan, activeKeywords, subscription] = await Promise.all([
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
    prisma.subscription.findUnique({
      where: { orgId: ctx.orgId },
      select: { planTier: true, status: true, trialEndsAt: true }
    })
  ]);

  const rawPayload = latestScan ? parseJson<unknown>(latestScan.rawChecksJson, null) : null;
  const reportPayload = parseReportPayload(rawPayload);
  const rawScanPayload = parseJson<{
    moneyKeywords?: Array<{ keyword?: string; volume?: number | null }>;
  }>(latestScan?.rawChecksJson || '', {});
  const issues = latestScan ? parseJson<Issue[]>(latestScan.issuesJson, []) : [];

  const trends = latestScan && previousScan ? calculateTrends(latestScan, previousScan) : null;
  const categories = prepareCategoryDistribution(reportPayload);
  const moneyKeywords = Array.isArray(rawScanPayload.moneyKeywords)
    ? rawScanPayload.moneyKeywords
        .filter((row): row is { keyword: string; volume?: number | null } => typeof row?.keyword === 'string')
        .map((row) => ({ keyword: row.keyword, volume: row.volume ?? undefined }))
    : [];
  const revenueImpact = calculateRevenueImpact(latestScan?.scoreTotal ?? 0, moneyKeywords);

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
    score:
      latestScan?.scoreTotal !== null && latestScan?.scoreTotal !== undefined
        ? Math.max(0, Math.min(100, (latestScan.scoreTotal || 0) + Math.min(12, competitor.oemSignalCount + competitor.capabilityCount)))
        : null,
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
        typeof competitor.score === 'number' ? `Modeled score ${competitor.score}/100` : 'Score unavailable',
        competitor.hasOemCerts ? 'Has OEM signals' : 'No OEM signals detected',
        competitor.hasOnlineEstimate ? 'Estimate CTA detected' : 'No estimate CTA detected'
      ].join(' • '),
      x: hasGeographicPoints ? 20 + index * 18 : 54 + index * 10,
      y: hasGeographicPoints ? 22 + index * 14 : Math.max(16, 100 - (competitor.score || 42)),
      tone: 'competitor' as const
    }))
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">SEO Revenue Dashboard</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Real-time impact of organic search on shop operations
          </p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--bg-body)]">
            Last 30 Days ▼
          </button>
        </div>
      </div>

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
          value={revenueImpact.traffic}
          label="Estimated SEO Traffic"
          subtitle={moneyKeywords.length > 0 ? 'Modeled from money-keyword volume' : 'No keyword volume data in latest payload'}
          trend={revenueImpact.trend}
          className="lg:col-span-1"
        />
        <MetricCard
          value={revenueImpact.leads}
          label="Estimated Leads"
          subtitle="Traffic × assumed 8% lead conversion"
          className="lg:col-span-1"
        />
        <MetricCard
          value={`$${revenueImpact.revenue.toLocaleString()}`}
          label="Estimated Revenue Impact"
          subtitle="Lead value modeled at $1,200 average repair value"
          className="lg:col-span-1"
        />
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
    </div>
  );
}
