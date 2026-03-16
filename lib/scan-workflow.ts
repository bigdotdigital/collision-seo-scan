import { prisma } from '@/lib/prisma';
import { runScan } from '@/lib/scan-engine';
import { buildReportPayload } from '@/lib/report-payload';
import { parseJson, toJson } from '@/lib/json';
import { runPageSpeed, type PageSpeedResult } from '@/lib/pagespeed';
import { capturePageSnapshot } from '@/lib/page-snapshot';
import { fetchGooglePlaceProfile } from '@/lib/google-places';
import { computeScoreV01 } from '@/lib/scoring';
import { assertPublicHostname, normalizeWebsiteUrl } from '@/lib/security/url';
import { NonRetryableError } from '@/lib/errors';
import { createScanRecord, createSnapshot, ensureOrganizationForShop, storeRawProviderResponse } from '@/lib/org-data';
import { seedDashboardFromScan } from '@/lib/dashboard-prefill';
import { publishScanIfQualified } from '@/lib/public-report';
import {
  claimShopForOrganization,
  clearScanObservationArtifacts,
  recordCompetitorObservations,
  recordConversionObservation,
  recordInsuranceRelationshipObservations,
  recordKeywordObservations,
  recordReviewObservation,
  recordSerpObservations,
  recordShopSourceObservation,
  recordSiteFeatureObservation,
  refreshShopDigitalPresenceSnapshot,
  upsertShopFromInput
} from '@/lib/shop-data';
import { recordMapPackEdges, recordScanCompetitorEdges } from '@/lib/shop-graph';

const EMPTY_PAGESPEED: PageSpeedResult = {
  status: 'error',
  message: 'PageSpeed data is not available for this scan yet.',
  performanceScore: null,
  lcpMs: null,
  cls: null,
  tbtMs: null,
  speedIndexMs: null,
  diagnostics: []
};

type ScanWorkflowArgs = {
  shopName: string;
  websiteUrl: string;
  city: string;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  vertical?: string | null;
  capabilities?: {
    hasICar?: boolean;
    hasOEM?: boolean;
    hasAdas?: boolean;
    hasAluminum?: boolean;
  };
};

type PreparedScan = {
  websiteUrl: string;
  vertical: string;
  pagespeed: PageSpeedResult;
  pageSpeedStatus: 'live' | 'cached' | 'modeled';
  googlePlaceResult: Awaited<ReturnType<typeof fetchGooglePlaceProfile>>;
  result: Awaited<ReturnType<typeof runScan>>;
  reportPayload: ReturnType<typeof buildReportPayload>;
};

function diagnosticList(result: Awaited<ReturnType<typeof runScan>>) {
  return result.scores.issues.slice(0, 5).map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.why,
    impact:
      issue.severity === 'High'
        ? ('high' as const)
        : issue.severity === 'Med'
          ? ('med' as const)
          : ('low' as const),
    recommendation: issue.fix
  }));
}

function modeledPageSpeed(result: Awaited<ReturnType<typeof runScan>>): PageSpeedResult {
  const score = result.checks.performanceScore;

  return {
    status: 'ok',
    message: 'Modeled from on-site checks while live PageSpeed data is unavailable.',
    performanceScore: score,
    lcpMs: score >= 90 ? 1800 : score >= 75 ? 2400 : score >= 60 ? 3200 : 4200,
    cls: score >= 90 ? 0.04 : score >= 75 ? 0.08 : score >= 60 ? 0.14 : 0.24,
    tbtMs: score >= 90 ? 60 : score >= 75 ? 140 : score >= 60 ? 260 : 420,
    speedIndexMs: score >= 90 ? 2100 : score >= 75 ? 3200 : score >= 60 ? 4300 : 5800,
    diagnostics: diagnosticList(result)
  };
}

async function recentPageSpeed(websiteUrl: string) {
  const recent = await prisma.scan.findMany({
    where: { websiteUrl },
    select: { pagespeedJson: true },
    orderBy: { createdAt: 'desc' },
    take: 12
  });

  for (const row of recent) {
    const parsed = parseJson<PageSpeedResult>(row.pagespeedJson, EMPTY_PAGESPEED);
    if (parsed.status === 'ok') return parsed;
  }

  return null;
}

function scannerPreview(args: {
  websiteUrl: string;
  result: Awaited<ReturnType<typeof runScan>>;
  capture: Awaited<ReturnType<typeof capturePageSnapshot>>;
}) {
  const homepage =
    args.result.pageFetchMeta.find((row) => row.url === args.websiteUrl) ||
    args.result.pageFetchMeta.find((row) => row.url.includes(new URL(args.websiteUrl).hostname));

  return {
    screenshotUrl: args.capture.screenshotUrl,
    captureSource: args.capture.captureSource,
    metadata: {
      title: args.capture.metadata.title || args.result.checks.title || null,
      metaDescription: args.capture.metadata.metaDescription || args.result.checks.metaDescription || null,
      url: args.capture.metadata.url || args.websiteUrl,
      statusCode: args.capture.metadata.statusCode ?? homepage?.status ?? null,
      responseTimeMs: args.capture.metadata.responseTimeMs ?? homepage?.fetchMs ?? null,
      fileSizeBytes: args.capture.metadata.fileSizeBytes ?? homepage?.bytes ?? null,
      wordCount: args.capture.metadata.wordCount ?? args.result.checks.homeWordCount ?? null
    }
  };
}

function providerStatus(args: {
  pageSpeedStatus: 'live' | 'cached' | 'modeled';
  serp: 'live' | 'cached' | 'fallback';
  aiSummary: 'live' | 'modeled' | 'fallback';
  mapPack: 'live' | 'cached' | 'fallback';
  googlePlaces: Awaited<ReturnType<typeof fetchGooglePlaceProfile>>;
  captureSource: 'live' | 'cached' | 'modeled' | 'fallback';
  screenshotUrl: string | null;
}) {
  return {
    pagespeed: {
      status: args.pageSpeedStatus,
      detail:
        args.pageSpeedStatus === 'live'
          ? 'Live PageSpeed measurement completed.'
          : args.pageSpeedStatus === 'cached'
            ? 'Using recent cached PageSpeed result due to temporary provider limits.'
            : 'Modeled performance from scan checks because live PageSpeed was unavailable.'
    },
    serp: {
      status: args.serp,
      detail:
        args.serp === 'live'
          ? 'Live local search competitor extraction.'
          : args.serp === 'cached'
            ? 'Cached local competitor set reused for this market.'
            : 'Fallback competitor set used because live SERP query failed.'
    },
    aiSummary: {
      status: args.aiSummary,
      detail:
        args.aiSummary === 'live'
          ? 'Narrative built from live source-backed metrics.'
          : args.aiSummary === 'modeled'
            ? 'Narrative includes modeled estimates due to partial provider availability.'
            : 'Fallback narrative used due to AI provider outage.'
    },
    snapshot: {
      status: args.captureSource,
      detail:
        args.captureSource === 'live'
          ? 'Live rendered screenshot captured successfully.'
          : args.screenshotUrl
            ? 'Fallback preview image used for scanner backdrop.'
            : 'No preview image available; abstract scanner view shown.'
    },
    googlePlaces: {
      status: args.googlePlaces.source,
      detail: args.googlePlaces.detail
    },
    mapPack: {
      status: args.mapPack,
      detail:
        args.mapPack === 'live'
          ? 'Live local map-pack rankings captured for target queries.'
          : args.mapPack === 'cached'
            ? 'Recent local map-pack ranking snapshot reused from cache.'
            : 'Fallback map-pack placeholders used because live map data was unavailable.'
    }
  };
}

export function normalizeScanWebsiteUrl(input: string) {
  return normalizeWebsiteUrl(input);
}

function normalizePreparationFailure(error: unknown) {
  if (!(error instanceof Error)) return error;
  if (
    error.message === 'invalid_website_url' ||
    error.message === 'Unable to resolve hostname' ||
    error.message === 'Private or loopback IPs are not allowed' ||
    error.message === 'Private network targets are blocked'
  ) {
    return new NonRetryableError(error.message);
  }
  return error;
}

export async function prepareScan(args: ScanWorkflowArgs): Promise<PreparedScan> {
  try {
    const websiteUrl = normalizeWebsiteUrl(args.websiteUrl);
    if (!websiteUrl) throw new NonRetryableError('invalid_website_url');

    await assertPublicHostname(websiteUrl);

    const vertical = args.vertical || 'collision';
    const pagespeedLive = await runPageSpeed(websiteUrl);
    const googlePlaceResult = await fetchGooglePlaceProfile({
      shopName: args.shopName,
      city: args.city,
      stateHint: args.state || null,
      addressHint: args.address || null,
      websiteUrl
    });
    const result = await runScan(websiteUrl, args.city, args.shopName, args.capabilities || {}, pagespeedLive);
    const capture = await capturePageSnapshot(websiteUrl);

    let pagespeed = pagespeedLive;
    let pageSpeedStatus: 'live' | 'cached' | 'modeled' = 'live';

    if (pagespeed.status === 'error') {
      const cached = await recentPageSpeed(websiteUrl).catch(() => null);
      if (cached) {
        pagespeed = {
          ...cached,
          message: 'Showing recent PageSpeed data while live test is unavailable.'
        };
        pageSpeedStatus = 'cached';
      } else {
        pagespeed = modeledPageSpeed(result);
        pageSpeedStatus = 'modeled';
      }
    }

    const preview = scannerPreview({
      websiteUrl,
      result,
      capture
    });

    const reportPayload = buildReportPayload({
      city: args.city,
      shopName: args.shopName,
      checks: result.checks,
      categoryScores: result.categoryScores,
      detectedSignals: result.detectedSignals,
      missingSignals: result.missingSignals,
      capabilityMissing: result.capabilityMissing,
      topFixes: result.topFixes,
      competitorAdvantages: result.competitorAdvantages,
      nationalBenchmark: result.nationalBenchmark,
      missingPages: result.missingPages,
      pageFetchMeta: result.pageFetchMeta,
      scanDurationMs: result.scanDurationMs,
      competitors: result.competitors,
      mapPack: result.mapPack,
      scannerPreview: preview,
      googlePlace: googlePlaceResult.profile || undefined,
    sources: {
      pagespeed: pageSpeedStatus,
      serp: result.sources.serp,
      aiSummary: result.sources.aiSummary,
      reviews: googlePlaceResult.profile && googlePlaceResult.source === 'live' ? 'live' : 'fallback',
      mapPack: result.sources.mapPack,
      competitors: result.sources.serp,
      keywords: result.sources.keywords
    },
    providerStatus: providerStatus({
      pageSpeedStatus,
      serp: result.sources.serp,
      aiSummary: result.sources.aiSummary,
      mapPack: result.sources.mapPack,
      googlePlaces: googlePlaceResult,
      captureSource: preview.captureSource,
      screenshotUrl: preview.screenshotUrl
    })
  });

    return {
      websiteUrl,
      vertical,
      pagespeed,
      pageSpeedStatus,
      googlePlaceResult,
      result,
      reportPayload
    };
  } catch (error) {
    throw normalizePreparationFailure(error);
  }
}

async function syncWorkspace(args: {
  orgId: string;
  shopId: string;
  shopName: string;
  websiteUrl: string;
  phone?: string | null;
  city: string;
  state?: string | null;
  address?: string | null;
  vertical: string;
  googlePlace: Awaited<ReturnType<typeof fetchGooglePlaceProfile>>['profile'];
}) {
  const city = args.googlePlace?.city || args.city;
  const state = args.googlePlace?.state || args.state || null;
  const address = args.address || args.googlePlace?.formattedAddress || null;

  await prisma.organization.update({
    where: { id: args.orgId },
    data: {
      shopId: args.shopId,
      name: args.shopName,
      websiteUrl: args.websiteUrl,
      phone: args.phone || args.googlePlace?.nationalPhoneNumber || null,
      address,
      city,
      state,
      lat: args.googlePlace?.lat || null,
      lng: args.googlePlace?.lng || null,
      primaryCategory: args.googlePlace?.primaryTypeDisplayName || null,
      verticalDefault: args.vertical
    }
  });

  const location = await prisma.location.findFirst({
    where: { orgId: args.orgId, isPrimary: true },
    orderBy: { createdAt: 'asc' }
  });

  if (location) {
    await prisma.location.update({
      where: { id: location.id },
      data: {
        name: args.shopName,
        websiteUrl: args.websiteUrl,
        address,
        city,
        state
      }
    });
  }
}

function rankPositionsFor(result: Awaited<ReturnType<typeof runScan>>) {
  const positions: Record<string, number | null> = {};
  result.moneyKeywords.forEach((item, idx) => {
    positions[item.keyword] = idx < 3 ? idx + 3 : null;
  });
  return positions;
}

export async function savePreparedScan(args: {
  scanId?: string;
  orgId: string;
  shopName: string;
  city: string;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  vertical?: string | null;
  prepared: PreparedScan;
  conversionSource: string;
  conversionValue?: unknown;
}) {
  const vertical = args.vertical || args.prepared.vertical;
  const googlePlace = args.prepared.googlePlaceResult.profile;

  const shop = await upsertShopFromInput({
    name: args.shopName,
    websiteUrl: args.prepared.websiteUrl,
    phone: args.phone || googlePlace?.nationalPhoneNumber || null,
    address: args.address || googlePlace?.formattedAddress || null,
    city: googlePlace?.city || args.city,
    state: googlePlace?.state || args.state || null,
    lat: googlePlace?.lat,
    lng: googlePlace?.lng,
    googlePlaceId: googlePlace?.placeId || null,
    primaryCategory: googlePlace?.primaryTypeDisplayName || null,
    vertical
  });

  const organization = await ensureOrganizationForShop({
    orgId: args.orgId,
    shopId: shop.id,
    name: args.shopName,
    websiteUrl: args.prepared.websiteUrl,
    phone: args.phone || googlePlace?.nationalPhoneNumber || null,
    address: args.address || googlePlace?.formattedAddress || null,
    city: googlePlace?.city || args.city,
    state: googlePlace?.state || args.state || null,
    lat: googlePlace?.lat,
    lng: googlePlace?.lng,
    primaryCategory: googlePlace?.primaryTypeDisplayName || null,
    vertical
  });

  await syncWorkspace({
    orgId: organization.id,
    shopId: shop.id,
    shopName: args.shopName,
    websiteUrl: args.prepared.websiteUrl,
    phone: args.phone || null,
    city: args.city,
    state: args.state || null,
    address: args.address || null,
    vertical,
    googlePlace
  });

  const scan =
    args.scanId
      ? await prisma.scan.update({
          where: { id: args.scanId },
          data: {
            shopId: shop.id,
            organizationId: organization.id,
            shopName: args.shopName,
            city: args.city,
            websiteUrl: args.prepared.websiteUrl,
            email: args.email || null,
            phone: args.phone || null,
            errorType: null,
            errorMessage: null
          }
        })
      : await createScanRecord(
          {
            website_url: args.prepared.websiteUrl,
            city_or_zip: args.city,
            shop_name: args.shopName,
            email: args.email || '',
            phone: args.phone || '',
            vertical,
            executionStatus: 'running'
          },
          organization.id,
          shop.id
        );

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      scoreTotal: args.prepared.result.scores.total,
      scoreWebsite: args.prepared.result.scores.website,
      scoreLocal: args.prepared.result.scores.local,
      scoreIntent: args.prepared.result.scores.intent,
      issuesJson: toJson(args.prepared.result.scores.issues),
      moneyKeywordsJson: toJson(args.prepared.result.moneyKeywords),
      competitorsJson: toJson(args.prepared.result.competitors),
      rawChecksJson: toJson(args.prepared.reportPayload),
      pagespeedJson: toJson(args.prepared.pagespeed),
      aiSummary: args.prepared.result.aiSummary || null,
      thirtyDayPlanJson: toJson(args.prepared.result.thirtyDayPlan)
    }
  });

  await clearScanObservationArtifacts(scan.id);

  await Promise.all([
    claimShopForOrganization({
      orgId: organization.id,
      shopId: shop.id,
      name: args.shopName,
      websiteUrl: args.prepared.websiteUrl,
      city: args.city,
      state: googlePlace?.state || args.state || null
    }),
    recordKeywordObservations({
      shopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: args.city,
      keywords: args.prepared.result.moneyKeywords
    }),
    recordSiteFeatureObservation({
      shopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: googlePlace?.city || args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      checks: args.prepared.result.checks,
      missingPages: args.prepared.result.missingPages
    }),
    recordShopSourceObservation({
      shopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: googlePlace?.city || args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      sourceType: 'WEBSITE',
      sourceUrl: args.prepared.websiteUrl,
      observedName: args.shopName,
      observedPhone: args.phone || googlePlace?.nationalPhoneNumber || null,
      observedAddress: args.address || googlePlace?.formattedAddress || null,
      activityScore: args.prepared.result.checks.checkedUrls.length,
      metadata: {
        checkedUrlCount: args.prepared.result.checks.checkedUrls.length,
        servicePageCount: args.prepared.result.checks.checkedUrls.filter((url) =>
          /\/(services?|collision|repair|paint|hail|dent|cert|estimate|contact)\b/i.test(url)
        ).length,
        hasEstimateCta: args.prepared.result.checks.estimateCtaDetected,
        hasOnlineEstimateFlow: args.prepared.result.checks.onlineEstimateFlow,
        hasReviewProof: args.prepared.result.checks.reviewProofPresent
      }
    }),
    recordInsuranceRelationshipObservations({
      shopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      signals: args.prepared.result.insuranceRelationshipSignals
    }),
    googlePlace
      ? recordReviewObservation({
          shopId: shop.id,
          scanId: scan.id,
          observedAt: scan.createdAt,
          city: googlePlace.city || args.city,
          state: googlePlace.state || args.state || null,
          vertical,
          profile: googlePlace,
          confidence: args.prepared.googlePlaceResult.source
        })
      : Promise.resolve(null),
    googlePlace
      ? recordShopSourceObservation({
          shopId: shop.id,
          scanId: scan.id,
          observedAt: scan.createdAt,
          city: googlePlace.city || args.city,
          state: googlePlace.state || args.state || null,
          vertical,
          sourceType: 'GOOGLE_MAPS',
          sourceUrl: googlePlace.googleMapsUri,
          externalId: googlePlace.placeId,
          observedName: googlePlace.name,
          observedPhone: googlePlace.nationalPhoneNumber,
          observedAddress: googlePlace.formattedAddress,
          rating: googlePlace.rating,
          reviewCount: googlePlace.userRatingCount,
          metadata: {
            websiteUri: googlePlace.websiteUri,
            primaryTypeDisplayName: googlePlace.primaryTypeDisplayName,
            lat: googlePlace.lat,
            lng: googlePlace.lng
          },
          confidence: args.prepared.googlePlaceResult.source === 'live' ? 0.95 : 0.5
        })
      : Promise.resolve(null),
    recordSerpObservations({
      shopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      mapPack: args.prepared.result.mapPack,
      confidence: args.prepared.result.sources.mapPack
    }),
    recordCompetitorObservations({
      sourceShopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      competitors: args.prepared.result.competitors
    }),
    recordMapPackEdges({
      sourceShopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      mapPack: args.prepared.result.mapPack
    }),
    recordScanCompetitorEdges({
      sourceShopId: shop.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      competitors: args.prepared.result.competitors
    }),
    recordConversionObservation({
      shopId: shop.id,
      organizationId: organization.id,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: args.city,
      state: googlePlace?.state || args.state || null,
      vertical,
      eventType: 'scan_completed',
      source: args.conversionSource,
      value: args.conversionValue
    }),
    storeRawProviderResponse({
      scanId: scan.id,
      organizationId: organization.id,
      provider: 'website_audit',
      endpoint: 'runScan',
      cacheKey: `website:${args.prepared.websiteUrl}`,
      request: {
        websiteUrl: args.prepared.websiteUrl,
        city: args.city,
        shop: args.shopName,
        vertical
      },
      response: args.prepared.result
    }),
    storeRawProviderResponse({
      scanId: scan.id,
      organizationId: organization.id,
      provider: 'pagespeed',
      endpoint: 'runPagespeed',
      cacheKey: `pagespeed:mobile:${args.prepared.websiteUrl}`,
      request: {
        websiteUrl: args.prepared.websiteUrl,
        strategy: 'mobile',
        categories: ['performance', 'seo', 'best-practices', 'accessibility']
      },
      response: args.prepared.pagespeed
    }),
    storeRawProviderResponse({
      scanId: scan.id,
      organizationId: organization.id,
      provider: 'google_places',
      endpoint: 'places.searchText',
      cacheKey: `google_places:${args.city.toLowerCase()}:${args.shopName.toLowerCase()}`,
      request: {
        shopName: args.shopName,
        city: args.city,
        state: args.state || null,
        address: args.address || null,
        websiteUrl: args.prepared.websiteUrl
      },
      response: args.prepared.googlePlaceResult
    })
  ]);

  await refreshShopDigitalPresenceSnapshot({ shopId: shop.id });

  const rankPositions = rankPositionsFor(args.prepared.result);
  const score = computeScoreV01({
    reviewCount: googlePlace?.userRatingCount ?? null,
    reviewRating: googlePlace?.rating ?? null,
    rankPositions,
    hasWebsite: Boolean(args.prepared.websiteUrl)
  });

  const snapshot = await createSnapshot({
    scanId: scan.id,
    organizationId: organization.id,
    visibilityScore: score.visibilityScore,
    scoringModelVersion: score.scoringModelVersion,
    reviewCount: googlePlace?.userRatingCount ?? null,
    reviewRating: googlePlace?.rating ?? null,
    keywordsChecked: args.prepared.result.moneyKeywords.map((row) => row.keyword),
    rankPositions,
    topCompetitors: args.prepared.result.competitors,
    lostDemandEstimate: {
      modeledFromScore: scan.scoreTotal,
      categoryScores: args.prepared.result.categoryScores
    },
    recommendations: args.prepared.result.topFixes,
    componentScores: score.componentScores,
    vertical
  });

  await seedDashboardFromScan({
    organizationId: organization.id,
    scanId: scan.id,
    shopName: args.shopName,
    websiteUrl: args.prepared.websiteUrl,
    city: args.city,
    keywords: args.prepared.result.moneyKeywords.map((row) => ({ keyword: row.keyword })),
    competitors: args.prepared.result.competitors.map((row) => ({ name: row.name, url: row.url }))
  });

  const completedScan = await prisma.scan.update({
    where: { id: scan.id },
    data: {
      executionStatus: 'completed',
      finishedAt: new Date(),
      durationMs: Math.max(0, Date.now() - (scan.startedAt?.getTime() || scan.createdAt.getTime())),
      errorType: null,
      errorMessage: null
    }
  });

  const publishedScan = await publishScanIfQualified({
    scanId: completedScan.id,
    shopId: shop.id,
    shopName: args.shopName,
    city: googlePlace?.city || args.city,
    state: googlePlace?.state || args.state || null,
    websiteUrl: args.prepared.websiteUrl,
    scoreTotal: completedScan.scoreTotal,
    rawChecksJson: completedScan.rawChecksJson
  });

  return {
    scan: publishedScan,
    snapshot,
    shop,
    googlePlace,
    score
  };
}
