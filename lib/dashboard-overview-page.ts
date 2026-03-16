import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/json';
import { getCityDemandContext } from '@/lib/market-intel';
import { getShopFallbackIntel } from '@/lib/shop-fallback-intel';
import { parseReportPayload } from '@/lib/report-payload';
import type { Issue } from '@/lib/types';
import { deriveCompetitorSuggestions } from '@/lib/dashboard-suggestions';
import { calculateRevenueImpact, calculateTrends, prepareCategoryDistribution } from '@/lib/dashboard-data';
import {
  buildMapPoints,
  buildOverviewBadges,
  buildOverviewCompetitors,
  buildVisibilitySegments,
  buildYourShop,
  hasKeywordVolume,
  parseMoneyKeywords,
  summarizeRankedKeywords
} from '@/lib/dashboard-overview';
import {
  buildCollisionArchitectureSummary,
  buildCompetitorGapSummary,
  buildMapsAuthoritySummary,
  buildRepairPlan,
  buildRevenueLeakSummary,
  premiumEntitlement
} from '@/lib/dashboard-intelligence';

export async function buildDashboardOverviewPageState(orgId: string) {
  const [latestScan, previousScan, activeKeywords, keywordRows, subscription] = await Promise.all([
    prisma.scan.findFirst({
      where: { organizationId: orgId, executionStatus: 'completed' },
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
      where: { organizationId: orgId, executionStatus: 'completed' },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      select: {
        scoreTotal: true,
        scoreWebsite: true,
        scoreLocal: true
      }
    }),
    prisma.trackedKeyword.count({
      where: { orgId, isActive: true }
    }),
    prisma.trackedKeyword.findMany({
      where: { orgId, isActive: true },
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
      where: { orgId },
      select: { planTier: true, status: true, trialEndsAt: true }
    })
  ]);

  const rawPayload = latestScan ? parseJson<unknown>(latestScan.rawChecksJson, null) : null;
  const baseReportPayload = parseReportPayload(rawPayload);
  const fallbackIntel = latestScan
    ? await getShopFallbackIntel({
        organizationId: orgId
      })
    : null;
  const reportPayload = baseReportPayload
    ? {
        ...baseReportPayload,
        googlePlace: baseReportPayload.googlePlace || fallbackIntel?.googlePlace || undefined,
        sources:
          baseReportPayload.sources && fallbackIntel?.googlePlace?.userRatingCount && baseReportPayload.sources.reviews === 'fallback'
            ? { ...baseReportPayload.sources, reviews: 'cached' as const }
            : baseReportPayload.sources
      }
    : null;
  const rawMoneyKeywords = parseJson<Array<{ keyword?: string; volume?: number | null }>>(
    latestScan?.moneyKeywordsJson || '',
    []
  );
  const issues = latestScan ? parseJson<Issue[]>(latestScan.issuesJson, []) : [];
  const trends = latestScan && previousScan ? calculateTrends(latestScan, previousScan) : null;
  const categories = prepareCategoryDistribution(reportPayload);
  const moneyKeywords = parseMoneyKeywords(rawMoneyKeywords);
  const revenueImpact = calculateRevenueImpact(latestScan?.scoreTotal ?? 0, moneyKeywords);
  const hasRevenueInputs = hasKeywordVolume(moneyKeywords);
  const keywordSummary = summarizeRankedKeywords(keywordRows);
  const yourShop = buildYourShop(latestScan, reportPayload);
  const competitors = buildOverviewCompetitors(reportPayload);
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

  const architecture = buildCollisionArchitectureSummary(reportPayload, latestScan?.city || 'your market');
  const mapsAuthority = buildMapsAuthoritySummary(reportPayload);
  const competitorGap = buildCompetitorGapSummary(reportPayload, latestScan?.scoreTotal ?? 0);
  const repairPlan = buildRepairPlan({
    architecture,
    maps: mapsAuthority,
    topFixes: reportPayload?.topFixes || []
  });
  const revenueLeak = buildRevenueLeakSummary({
    architecture,
    maps: mapsAuthority,
    competitor: competitorGap,
    topFixes: reportPayload?.topFixes || []
  });
  const demandContext = await getCityDemandContext({ city: latestScan?.city });

  return {
    latestScan,
    previousScan,
    activeKeywords,
    keywordRows,
    subscription,
    reportPayload,
    issues,
    trends,
    categories,
    moneyKeywords,
    revenueImpact,
    hasRevenueInputs,
    keywordSummary,
    yourShop,
    competitors,
    competitorSuggestions,
    hasGeographicPoints,
    mapPoints: buildMapPoints({ yourShop, competitors, geographic: hasGeographicPoints }),
    visibilitySegments: buildVisibilitySegments(categories),
    entitlement: premiumEntitlement(subscription?.status),
    architecture,
    mapsAuthority,
    competitorGap,
    repairPlan,
    revenueLeak,
    demandContext,
    overviewBadges: buildOverviewBadges({
      hasModeledKeywords: hasRevenueInputs,
      sources: reportPayload?.sources
    })
  };
}
