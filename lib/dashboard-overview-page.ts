import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/json';
import { getCityDemandContext } from '@/lib/market-intel';
import { buildDashboardMarketInsights } from '@/lib/dashboard-market-insights';
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
  const [latestScan, previousScan, activeKeywords, keywordRows, subscription, competitorCount, organization] = await Promise.all([
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
    }),
    prisma.trackedCompetitor.count({
      where: { orgId, isActive: true }
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        websiteUrl: true,
        city: true
      }
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
  const marketInsights = await buildDashboardMarketInsights({
    city: organization?.city || latestScan?.city,
    scoreTotal: latestScan?.scoreTotal,
    scoreWebsite: latestScan?.scoreWebsite,
    scoreLocal: latestScan?.scoreLocal,
    scoreIntent: latestScan?.scoreIntent
  });
  const hasWebsite = Boolean(organization?.websiteUrl || latestScan?.websiteUrl);
  const hasGoogleProfile = Boolean(reportPayload?.googlePlace || fallbackIntel?.googlePlace);
  const readinessCompleted = [hasWebsite, activeKeywords >= 3, competitorCount >= 1].filter(Boolean).length;
  const setupReadiness = {
    completed: readinessCompleted,
    total: 3,
    ready: readinessCompleted === 3
  };
  const lastScanAgeLabel = latestScan
    ? (() => {
        const ageMs = Date.now() - new Date(latestScan.createdAt).getTime();
        const ageDays = Math.floor(ageMs / 86400000);
        if (ageDays <= 0) return 'Scanned today';
        if (ageDays === 1) return 'Scanned 1 day ago';
        return `Scanned ${ageDays} days ago`;
      })()
    : 'No completed scan yet';
  const nextSteps = [
    !hasWebsite
      ? {
          title: 'Add your website',
          detail: 'A live website unlocks crawling, issue detection, and faster weekly monitoring.'
        }
      : null,
    activeKeywords < 3
      ? {
          title: 'Track 3 revenue keywords',
          detail: `Add ${3 - activeKeywords} more keyword${3 - activeKeywords === 1 ? '' : 's'} to turn on cleaner opportunity modeling.`
        }
      : null,
    competitorCount < 1
      ? {
          title: 'Add a real competitor',
          detail: 'One nearby competitor unlocks cleaner head-to-head comparisons and map pressure context.'
        }
      : null,
    !latestScan
      ? {
          title: 'Run your first scan',
          detail: 'Your dashboard gets much richer once the first completed scan lands.'
        }
      : null,
    latestScan && !hasGoogleProfile
      ? {
          title: 'Link your Google profile',
          detail: 'Saved profile data improves maps authority, review context, and local recommendations.'
        }
      : null
  ].filter(Boolean) as Array<{ title: string; detail: string }>;
  const dataHealth = {
    websiteStatus: hasWebsite ? 'Connected' : 'Missing',
    googleStatus: hasGoogleProfile ? 'Saved' : 'Pending',
    keywordStatus: `${activeKeywords} tracked`,
    competitorStatus: `${competitorCount} tracked`,
    lastScanAgeLabel
  };
  const weeklySummary = {
    headline: !latestScan
      ? 'Run your first scan to start the weekly dashboard loop.'
      : trends?.overall
        ? trends.overall.type === 'up'
          ? `Your score is up ${trends.overall.value} since the last completed scan.`
          : `Your score is down ${trends.overall.value} since the last completed scan.`
        : 'Your weekly baseline is set. Keep refreshing to build real trend history.',
    subhead: latestScan
      ? `${issues.length} active issues, ${reportPayload?.googlePlace?.userRatingCount ?? 'pending'} saved reviews, ${activeKeywords} tracked keywords.`
      : 'Once your first scan lands, this space turns into a weekly owner brief.',
    urgency:
      revenueLeak.severity === 'High'
        ? 'high'
        : demandContext?.urgencyLabel === 'High Pressure'
          ? 'high'
          : nextSteps.length > 0
            ? 'medium'
            : 'low'
  } as const;
  const valueMoments = [
    {
      label: 'Biggest win available',
      value:
        marketInsights.issueRates.noEstimate >= 25
          ? 'Estimate flow'
          : marketInsights.issueRates.noOem >= 10
            ? 'Trust/OEM proof'
            : 'Review visibility',
      detail:
        marketInsights.issueRates.noEstimate >= 25
          ? `In our scan dataset, shops with an estimate flow materially outperform those without one.`
          : marketInsights.issueRates.noOem >= 10
            ? 'Certification and trust signals still separate stronger collision shops from weaker ones.'
            : 'Review proof is still one of the fastest visible wins in this market.'
    },
    {
      label: 'Business context',
      value: demandContext ? demandContext.urgencyLabel : 'Monitoring',
      detail: demandContext
        ? demandContext.summary
        : 'Demand context fills in once city-level crash, traffic, and hail observations are attached.'
    },
    {
      label: 'Data confidence',
      value: hasGoogleProfile || hasWebsite ? 'Strong' : 'Building',
      detail:
        hasGoogleProfile || hasWebsite
          ? 'This dashboard can fall back to saved shop data if third-party provider calls come back thin.'
          : 'Connect more saved sources to make the dashboard more resilient week to week.'
    }
  ];

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
    }),
    marketInsights,
    organization,
    competitorCount,
    setupReadiness,
    nextSteps,
    dataHealth,
    weeklySummary,
    valueMoments
  };
}
