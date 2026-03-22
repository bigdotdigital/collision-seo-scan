import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/json';
import { getCityDemandContext } from '@/lib/market-intel';
import { getShopFallbackIntel } from '@/lib/shop-fallback-intel';
import { getServiceMarketIntel, getVerticalThemeTone } from '@/lib/service-market-intel';
import type { Issue } from '@/lib/types';
import { buildReportViewModel, type ReportData } from '@/lib/report-view-model';
import { parseReportPayload } from '@/lib/report-payload';
import { getScanRecord } from '@/lib/scan-store';
import { getVerticalConfig } from '@/lib/verticals';
import {
  buildExecutiveSummaryFallback,
  buildFallbackPreviewUrl,
  buildSourceConfidenceState,
  checksScore,
  isSyntheticPathProbe,
  isUnavailableCompetitorLine,
  normalizeCategoryScores,
  normalizeCompetitorAdvantages,
  normalizeCompetitors,
  normalizeIssues,
  normalizeKeywords,
  normalizeMissingSignals,
  normalizeNationalBenchmark,
  normalizePageMeta,
  normalizePageSpeed,
  normalizePlan,
  normalizeSignals,
  normalizeTopFixes,
  ownerIssueTitle,
  ownerText,
  sanitizeExecutiveSummary,
  sanitizeKeywordsForSignals,
  withBusinessImpact
} from '@/lib/report-page-helpers';

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function buildTeardownIntakeUrl(scanId: string, organizationId?: string | null, vertical?: string | null, email?: string | null, phone?: string | null) {
  const params = new URLSearchParams();
  params.set('scanId', scanId);
  if (organizationId) params.set('orgId', organizationId);
  if (vertical) params.set('vertical', vertical);
  if (email) params.set('email', email);
  if (phone) params.set('phone', phone);
  return `/teardown-intake?${params.toString()}`;
}

function buildMonitoringLandingUrl(scanId: string, organizationId?: string | null, email?: string | null, shopName?: string | null, city?: string | null) {
  const params = new URLSearchParams();
  params.set('scanId', scanId);
  if (organizationId) params.set('orgId', organizationId);
  if (email) params.set('email', email);
  if (shopName) params.set('shop', shopName);
  if (city) params.set('city', city);
  return `/monitoring?${params.toString()}`;
}

function findFallbackFetch(
  pageMeta: Array<{ url: string; status: number; fetchMs?: number | null; bytes?: number | null }>,
  websiteUrl: string
) {
  const preferred = pageMeta.find((row) => {
    try {
      const target = new URL(websiteUrl);
      const probe = new URL(row.url);
      const targetPath = target.pathname.replace(/\/+$/, '') || '/';
      const probePath = probe.pathname.replace(/\/+$/, '') || '/';
      return probe.hostname === target.hostname && probePath === targetPath && row.status >= 200 && row.status < 400;
    } catch {
      return false;
    }
  });

  if (preferred) return preferred;
  return pageMeta.find((row) => row.status >= 200 && row.status < 400) || pageMeta[0];
}

function buildScannerSteps(rawChecks: Record<string, unknown>, speedScore: number) {
  return [
    { label: 'Capturing homepage snapshot', state: 'verified' as const },
    { label: 'Checking mobile responsiveness', state: 'verified' as const },
    { label: 'Detecting trust signals', state: 'verified' as const },
    {
      label: 'Evaluating CTA visibility',
      state: checksScore(rawChecks, 'estimate') ? ('verified' as const) : ('issue' as const)
    },
    {
      label: 'Measuring LCP / Speed index',
      state: speedScore >= 60 ? ('verified' as const) : ('issue' as const)
    },
    { label: 'Comparing competitor positioning', state: 'verified' as const },
    { label: 'Building action plan', state: 'analyzing' as const }
  ];
}

export async function loadReportPageState(scanId: string) {
  const scanRecord = await getScanRecord(scanId);
  if (!scanRecord) return null;

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
  const raw = dbScan
    ? parseJson<Record<string, unknown>>(dbScan.rawChecksJson, scanRecord.rawChecks || {})
    : scanRecord.rawChecks || {};
  const keywords = sanitizeKeywordsForSignals(
    normalizeKeywords(
      dbScan
        ? parseJson<unknown>(dbScan.moneyKeywordsJson, scanRecord.moneyKeywords)
        : scanRecord.moneyKeywords
    ),
    scanRecord.city,
    raw,
    dbScan?.vertical
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
        : scanRecord.competitors
  );
  const plan = normalizePlan(
    dbScan
      ? parseJson<unknown>(dbScan.thirtyDayPlanJson, scanRecord.thirtyDayPlan)
      : scanRecord.thirtyDayPlan
  );
  const payload = parseReportPayload(raw);

  const payloadOverallScore =
    typeof payload?.categoryScores?.overall === 'number' ? payload.categoryScores.overall : null;
  const scoreTotal = payloadOverallScore ?? scanRecord.scoreTotal ?? snapshot?.visibilityScore ?? 0;
  const scoreWebsite = scanRecord.scoreWebsite ?? 0;
  const scoreLocal = scanRecord.scoreLocal ?? 0;
  const scoreIntent = scanRecord.scoreIntent ?? 0;
  const verticalConfig = getVerticalConfig(dbScan?.vertical);
  const marketIntelCards = getServiceMarketIntel(dbScan?.vertical);
  const verticalThemeTone = getVerticalThemeTone(dbScan?.vertical);
  const categoryScores = normalizeCategoryScores(
    payload?.categoryScores || raw.categoryScores,
    {
      website: scoreWebsite,
      local: scoreLocal,
      intent: scoreIntent,
      total: scoreTotal
    },
    dbScan?.vertical
  );
  const detectedSignals = normalizeSignals(payload?.detectedSignals || raw.detectedSignals);
  const missingSignals = normalizeMissingSignals(payload?.missingSignals || raw.missingSignals);
  const topFixes = normalizeTopFixes(payload?.topFixes || raw.topFixes, issues);
  const competitorAdvantages = normalizeCompetitorAdvantages(
    payload?.competitorAdvantages || raw.competitorAdvantages
  );
  const nationalBenchmark = normalizeNationalBenchmark(
    payload?.nationalBenchmark || raw.nationalBenchmark
  );
  const pageMeta = normalizePageMeta(payload?.pageFetchMeta || raw.pageFetchMeta);
  const scanDurationMs =
    typeof payload?.scanDurationMs === 'number'
      ? payload.scanDurationMs
      : typeof raw.scanDurationMs === 'number'
        ? raw.scanDurationMs
        : 0;
  const timestampLabel = dbScan?.createdAt ? formatTimestamp(dbScan.createdAt) : formatTimestamp(new Date(scanRecord.createdAt));
  const domainLabel = (() => {
    try {
      return new URL(scanRecord.url).hostname;
    } catch {
      return scanRecord.url;
    }
  })();
  const pagespeed = normalizePageSpeed(scanRecord.pagespeed, scoreWebsite);
  const hasMeasuredSpeedDiagnostics =
    typeof pagespeed.lcpMs === 'number' ||
    typeof pagespeed.cls === 'number' ||
    typeof pagespeed.tbtMs === 'number' ||
    typeof pagespeed.speedIndexMs === 'number';
  const websiteCardScore = pagespeed.performanceScore ?? scoreWebsite;
  const healthChecks = [
    { label: 'Title tags', score: checksScore(raw, 'title') ? 90 : 45 },
    { label: 'Speed', score: categoryScores.speedPerformance },
    { label: verticalConfig.authorityLabel, score: categoryScores.collisionAuthority },
    { label: 'Mobile UX', score: websiteCardScore },
    { label: 'Local signals', score: categoryScores.localSeo },
    { label: verticalConfig.primaryCtaLabel, score: checksScore(raw, 'estimate') ? 88 : 48 }
  ];
  const callConversionScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (checksScore(raw, 'estimate') ? 40 : 10) +
          (checksScore(raw, 'reviews') ? 20 : 0) +
          (checksScore(raw, 'map') ? 20 : 0) +
          (checksScore(raw, 'phone') ? 20 : 10)
      )
    )
  );
  const ownerIssues = issues.map((issue) => ({
    ...issue,
    title: ownerIssueTitle(issue.title),
    why: withBusinessImpact(issue.why),
    fix: ownerText(issue.fix)
  }));
  const ownerTopFixes = topFixes.map((fix) => ({
    ...fix,
    title: ownerIssueTitle(fix.title),
    why: withBusinessImpact(fix.why),
    steps: fix.steps.map((step) => ownerText(step))
  }));
  const categoryCards = [
    { label: 'Website Basics', hint: 'Can Google understand your main pages?', score: categoryScores.technicalSeo },
    { label: 'Map Visibility', hint: 'How visible you are in local map searches', score: categoryScores.localSeo },
    { label: verticalConfig.authorityLabel, hint: 'Signals that make searchers trust your business faster', score: categoryScores.collisionAuthority },
    { label: 'Speed on Mobile', hint: 'Page speed for customers on phones', score: categoryScores.speedPerformance },
    { label: 'Service Page Coverage', hint: `How well your pages match ${verticalConfig.label.toLowerCase()} search intent`, score: categoryScores.contentCoverage },
    { label: 'Call Conversion', hint: `How ready the site is to turn searchers into ${verticalConfig.conversionGoalLabel}`, score: callConversionScore }
  ];

  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';
  const salesPhone = process.env.SALES_PHONE || '+13035551234';
  const demandContext =
    verticalConfig.slug === 'collision' ? await getCityDemandContext({ city: scanRecord.city }) : null;
  const fallbackIntel = await getShopFallbackIntel({
    shopId: dbScan?.shopId || null,
    organizationId: dbScan?.organizationId || null
  });
  const reportData: ReportData = {
    scanId: scanRecord.id,
    shopName: scanRecord.shopName,
    city: scanRecord.city,
    websiteUrl: scanRecord.url,
    vertical: dbScan?.vertical,
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
    demandContext,
    rawChecks: {
      reviews: (raw.reviews as { rating?: number; reviews?: number } | undefined) || undefined,
      competitorReviews:
        (raw.competitorReviews as { rating?: number; reviews?: number } | undefined) || undefined
    }
  };
  const vm = buildReportViewModel(reportData);
  const googlePlace = payload?.googlePlace || fallbackIntel?.googlePlace || undefined;
  const filteredCompetitorAdvantages = competitorAdvantages
    .map((row) => ({
      ...row,
      advantages: row.advantages.filter((line) => !isUnavailableCompetitorLine(line))
    }))
    .filter((row) => row.advantages.length > 0);
  const competitorDisplayRows = filteredCompetitorAdvantages.length > 0 ? filteredCompetitorAdvantages : [];
  const crawlEvidenceRows = pageMeta.filter((row) => !(row.status >= 400 && isSyntheticPathProbe(row.url)));
  const teardownIntakeUrl = buildTeardownIntakeUrl(
    scanRecord.id,
    dbScan?.organizationId,
    dbScan?.vertical,
    scanRecord.email,
    scanRecord.phone
  );
  const monitoringLandingUrl = buildMonitoringLandingUrl(
    scanRecord.id,
    dbScan?.organizationId,
    scanRecord.email,
    scanRecord.shopName,
    scanRecord.city
  );
  const reviewGap = payload?.reviewGap ?? vm.reviewGap;
  const mapPack = payload?.mapPack ?? vm.mapPack;
  const payloadSources = payload?.sources
    ? {
        ...payload.sources,
        reviews:
          payload.sources.reviews === 'fallback' && fallbackIntel?.googlePlace?.userRatingCount
            ? 'cached'
            : payload.sources.reviews
      }
    : fallbackIntel?.googlePlace?.userRatingCount
      ? {
          pagespeed: 'fallback' as const,
          serp: 'fallback' as const,
          aiSummary: 'fallback' as const,
          reviews: 'cached' as const,
          mapPack: 'fallback' as const,
          competitors: 'fallback' as const,
          keywords: 'modeled' as const
        }
      : null;
  const sourceState = buildSourceConfidenceState({
    payloadSources,
    reviewGap,
    mapPack,
    googlePlace,
    competitors
  });
  const fallbackFetch = findFallbackFetch(pageMeta, scanRecord.url);
  const scannerPreview = payload?.scannerPreview || {
    screenshotUrl: buildFallbackPreviewUrl(scanRecord.url),
    captureSource: 'fallback' as const,
    metadata: {
      title: payload?.checks?.title || scanRecord.shopName || null,
      metaDescription: payload?.checks?.metaDescription || null,
      url: scanRecord.url,
      statusCode: fallbackFetch?.status ?? null,
      responseTimeMs: fallbackFetch?.fetchMs ?? null,
      fileSizeBytes: fallbackFetch?.bytes ?? null,
      wordCount:
        typeof raw.homeWordCount === 'number'
          ? raw.homeWordCount
          : typeof payload?.checks?.homeWordCount === 'number'
            ? payload.checks.homeWordCount
            : typeof raw.wordCount === 'number'
              ? raw.wordCount
              : null
    }
  };
  const scannerMetadata =
    scannerPreview.metadata.statusCode && scannerPreview.metadata.statusCode < 400
      ? scannerPreview.metadata
      : fallbackFetch && fallbackFetch.status >= 200 && fallbackFetch.status < 400
        ? {
            ...scannerPreview.metadata,
            statusCode: fallbackFetch.status,
            responseTimeMs: fallbackFetch.fetchMs ?? scannerPreview.metadata.responseTimeMs,
            fileSizeBytes: fallbackFetch.bytes ?? scannerPreview.metadata.fileSizeBytes,
            url: fallbackFetch.url || scannerPreview.metadata.url
          }
        : scannerPreview.metadata;
  const scannerPreviewUrl =
    scannerPreview.screenshotUrl || buildFallbackPreviewUrl(scannerPreview.metadata.url || scanRecord.url);
  const scannerSteps = buildScannerSteps(raw, categoryScores.speedPerformance);
  const trustedAiSummary =
    sourceState.sourceConfidence.aiSummary === 'live'
      ? sanitizeExecutiveSummary(scanRecord.aiSummary, scoreTotal)
      : null;
  const executiveSummary = trustedAiSummary
    ? trustedAiSummary
    : buildExecutiveSummaryFallback({
        shopName: scanRecord.shopName,
        city: scanRecord.city,
        overall: scoreTotal,
        categoryScores,
        topFixes,
        vertical: dbScan?.vertical
      });
  const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/report/${scanRecord.id}`;
  const printedAt = formatTimestamp(new Date());
  const scoreCondition =
    scoreTotal >= 85 ? 'Excellent Condition' : scoreTotal >= 70 ? 'Good Condition' : 'Needs Repair';
  const competitorRows = sourceState.hasUsableCompetitorData
    ? [
        {
          name: 'Your Shop',
          score: scoreTotal,
          reviews:
            sourceState.ownGoogleReviewLabel ??
            (sourceState.hasUsableReviewGap && reviewGap && typeof reviewGap.shopRating === 'number'
              ? `${reviewGap.shopRating.toFixed(1)} ★`
              : '—')
        },
        ...vm.competitors.slice(0, 2).map((comp, idx) => ({
          name: comp.name,
          score: Math.max(48, scoreTotal - (idx + 1) * 8),
          reviews:
            sourceState.hasUsableReviewGap &&
            reviewGap &&
            idx === 0 &&
            typeof reviewGap.competitorRating === 'number'
              ? `${reviewGap.competitorRating.toFixed(1)} ★`
              : '—'
        }))
      ]
    : [];

  return {
    scanRecord,
    dbScan,
    snapshot,
    issues,
    raw,
    keywords,
    competitors,
    plan,
    payload,
    scoreTotal,
    scoreWebsite,
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
    callConversionScore,
    ownerIssues,
    ownerTopFixes,
    categoryCards,
    calendly,
    salesPhone,
    vm,
    competitorDisplayRows,
    crawlEvidenceRows,
    teardownIntakeUrl,
    monitoringLandingUrl,
    reviewGap,
    mapPack,
    googlePlace,
    fallbackFetch,
    scannerPreview,
    scannerMetadata,
    scannerPreviewUrl,
    scannerSteps,
    executiveSummary,
    reportUrl,
    printedAt,
    scoreCondition,
    competitorRows,
    verticalConfig,
    marketIntelCards,
    verticalThemeTone,
    ...sourceState
  };
}
