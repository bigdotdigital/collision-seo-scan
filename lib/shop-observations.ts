import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';
import type { Competitor, MoneyKeyword, ScanChecks } from '@/lib/types';
import type { GooglePlaceProfile } from '@/lib/google-places';
import type { MapPackResult } from '@/lib/types';
import type { InsuranceRelationshipSignal } from '@/lib/types';
import { clean, resolveCompetitorShop, upsertMarketFromInput } from '@/lib/shop-core';

export async function clearScanObservationArtifacts(scanId: string) {
  await Promise.all([
    prisma.shopKeywordObservation.deleteMany({ where: { scanId } }),
    prisma.shopReviewObservation.deleteMany({ where: { scanId } }),
    prisma.shopCompetitorObservation.deleteMany({ where: { scanId } }),
    prisma.shopSerpObservation.deleteMany({ where: { scanId } }),
    prisma.shopConversionObservation.deleteMany({ where: { scanId } }),
    prisma.shopSiteFeatureObservation.deleteMany({ where: { scanId } }),
    prisma.shopInsuranceRelationshipObservation.deleteMany({ where: { scanId } }),
    prisma.shopSourceObservation.deleteMany({ where: { scanId } }),
    prisma.shopGraphEdge.deleteMany({ where: { scanId } })
  ]);
}

function countServicePages(urls: string[]) {
  return urls.filter((url) => /\/(services?|collision|repair|paint|hail|dent|cert|estimate|contact)\b/i.test(url)).length;
}

function parseRankLabel(label?: string | null) {
  if (!label) return null;
  const match = label.match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export async function recordSiteFeatureObservation(args: {
  shopId: string;
  scanId?: string;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  source?: string;
  confidence?: string;
  checks: ScanChecks;
  missingPages?: string[];
}) {
  const observedAt = args.observedAt || new Date();
  const market = await upsertMarketFromInput({
    city: args.city,
    state: args.state,
    vertical: args.vertical
  });

  return prisma.shopSiteFeatureObservation.create({
    data: {
      shopId: args.shopId,
      marketId: market?.id || undefined,
      scanId: args.scanId || undefined,
      observedAt,
      source: args.source || 'scan_site_feature_audit',
      confidence: args.confidence || 'live',
      checkedUrlCount: args.checks.checkedUrls.length,
      servicePageCount: countServicePages(args.checks.checkedUrls),
      oemSignalCount: args.checks.oemSignals.length,
      hasEstimateCta: args.checks.estimateCtaDetected,
      hasOnlineEstimateFlow: args.checks.onlineEstimateFlow,
      hasReviewProof: args.checks.reviewProofPresent,
      hasReviewSchema: args.checks.reviewWidgetOrSchema,
      hasMapEmbed: args.checks.mapEmbedDetected,
      hasDirectionsCta: args.checks.directionsOrReviewsCta,
      hasLocationFinder: args.checks.locationFinderPresent,
      hasInsuranceGuidance: args.checks.insuranceGuidancePresent,
      hasWarranty: args.checks.warrantyMentioned,
      hasAdasContent: args.checks.adasMentioned,
      hasCertificationPage: !(args.missingPages || []).includes('certifications'),
      schemaTypesJson: toJson(args.checks.schemaTypes),
      missingPagesJson: toJson(args.missingPages || []),
      rawChecksJson: toJson(args.checks)
    }
  });
}

export async function recordReviewObservation(args: {
  shopId: string;
  scanId?: string;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  source?: string;
  confidence?: string;
  profile: GooglePlaceProfile;
}) {
  const observedAt = args.observedAt || new Date();
  const market = await upsertMarketFromInput({
    city: args.city,
    state: args.state,
    vertical: args.vertical
  });

  if (!args.scanId) {
    const dayStart = startOfUtcDay(observedAt);
    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const existing = await prisma.shopReviewObservation.findFirst({
      where: {
        shopId: args.shopId,
        scanId: null,
        source: args.source || 'google_places_profile',
        observedAt: {
          gte: dayStart,
          lt: nextDay
        }
      }
    });

    if (existing) {
      return prisma.shopReviewObservation.update({
        where: { id: existing.id },
        data: {
          observedAt,
          marketId: market?.id || undefined,
          confidence: args.confidence || 'live',
          rating: args.profile.rating ?? undefined,
          reviewCount: args.profile.userRatingCount ?? undefined,
          googlePlaceId: args.profile.placeId || undefined,
          googleMapsUri: args.profile.googleMapsUri || undefined,
          rawJson: toJson(args.profile)
        }
      });
    }
  }

  return prisma.shopReviewObservation.create({
    data: {
      shopId: args.shopId,
      marketId: market?.id || undefined,
      scanId: args.scanId || undefined,
      observedAt,
      source: args.source || 'google_places_profile',
      confidence: args.confidence || 'live',
      rating: args.profile.rating ?? undefined,
      reviewCount: args.profile.userRatingCount ?? undefined,
      googlePlaceId: args.profile.placeId || undefined,
      googleMapsUri: args.profile.googleMapsUri || undefined,
      rawJson: toJson(args.profile)
    }
  });
}

export async function recordRankObservations(args: {
  observedAt?: Date;
  orgId?: string | null;
  locationId?: string | null;
  source?: string;
  rows: Array<{
    shopId: string;
    marketId?: string | null;
    keyword: string;
    rankPosition?: number | null;
    delta?: number | null;
    raw?: unknown;
  }>;
}) {
  if (args.rows.length === 0) return { count: 0 };

  const observedAt = args.observedAt || new Date();
  await prisma.shopRankObservation.createMany({
    data: args.rows.map((row) => ({
      shopId: row.shopId,
      marketId: row.marketId || undefined,
      orgId: args.orgId || undefined,
      locationId: args.locationId || undefined,
      observedAt,
      keyword: row.keyword,
      rankPosition: row.rankPosition ?? undefined,
      delta: row.delta ?? undefined,
      source: args.source || 'rank_snapshot',
      confidence: args.source === 'stub' ? 'modeled' : 'live',
      rawJson: row.raw ? toJson(row.raw) : undefined
    }))
  });

  return { count: args.rows.length };
}

export async function recordSerpObservations(args: {
  shopId: string;
  scanId?: string;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  source?: string;
  confidence?: string;
  mapPack: MapPackResult;
}) {
  const observedAt = args.observedAt || new Date();
  const market = await upsertMarketFromInput({
    city: args.city,
    state: args.state,
    vertical: args.vertical
  });

  await prisma.shopSerpObservation.createMany({
    data: args.mapPack.queries.map((row) => ({
      shopId: args.shopId,
      marketId: market?.id || undefined,
      scanId: args.scanId || undefined,
      observedAt,
      query: row.query,
      searchSurface: 'map_pack',
      source: args.source || 'scan_map_pack',
      confidence: args.confidence || args.mapPack.source,
      yourRankLabel: row.yourRank,
      yourRankPosition: parseRankLabel(row.yourRank) ?? undefined,
      topResultsJson: toJson([
        { position: 1, name: row.rank1 },
        { position: 2, name: row.rank2 },
        { position: 3, name: row.rank3 }
      ]),
      rawJson: toJson(row)
    }))
  });

  return { count: args.mapPack.queries.length };
}

export async function recordConversionObservation(args: {
  shopId: string;
  organizationId?: string | null;
  scanId?: string | null;
  leadId?: string | null;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  eventType: string;
  source: string;
  confidence?: string;
  value?: unknown;
}) {
  const observedAt = args.observedAt || new Date();
  const market = await upsertMarketFromInput({
    city: args.city,
    state: args.state,
    vertical: args.vertical
  });

  return prisma.shopConversionObservation.create({
    data: {
      shopId: args.shopId,
      marketId: market?.id || undefined,
      organizationId: args.organizationId || undefined,
      scanId: args.scanId || undefined,
      leadId: args.leadId || undefined,
      observedAt,
      eventType: args.eventType,
      source: args.source,
      confidence: args.confidence || 'live',
      valueJson: args.value ? toJson(args.value) : undefined
    }
  });
}

export async function recordInsuranceRelationshipObservations(args: {
  shopId: string;
  scanId?: string;
  observedAt?: Date;
  signals: InsuranceRelationshipSignal[];
}) {
  if (args.signals.length === 0) return { count: 0 };

  const observedAt = args.observedAt || new Date();

  await prisma.shopInsuranceRelationshipObservation.createMany({
    data: args.signals.map((signal) => ({
      shopId: args.shopId,
      scanId: args.scanId || undefined,
      insurerName: signal.insurerName,
      relationshipType: signal.relationshipType || undefined,
      signalType: signal.signalType,
      confidence: signal.confidence,
      sourceUrl: signal.sourceUrl || undefined,
      sourceText: signal.sourceText || undefined,
      observedAt
    }))
  });

  return { count: args.signals.length };
}

export async function recordKeywordObservations(args: {
  shopId: string;
  scanId?: string;
  observedAt?: Date;
  city?: string | null;
  keywords: MoneyKeyword[];
}) {
  const observedAt = args.observedAt || new Date();

  for (const keyword of args.keywords) {
    await prisma.shopKeywordObservation.create({
      data: {
        shopId: args.shopId,
        scanId: args.scanId || undefined,
        observedAt,
        keyword: keyword.keyword,
        city: clean(args.city) || undefined,
        source: keyword.source === 'api' ? 'scan_keyword_feed' : 'scan_keyword_model',
        searchType: 'organic',
        searchVolume: keyword.volume ?? undefined,
        cpcMicros: typeof keyword.cpc === 'number' ? Math.round(keyword.cpc * 1_000_000) : undefined,
        confidence: keyword.source === 'api' ? 'live' : 'modeled'
      }
    });
  }
}

export async function recordCompetitorObservations(args: {
  sourceShopId: string;
  scanId?: string;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  competitors: Competitor[];
}) {
  const observedAt = args.observedAt || new Date();

  for (const competitor of args.competitors) {
    const competitorShop = await resolveCompetitorShop({
      name: competitor.name,
      websiteUrl: competitor.url,
      city: args.city,
      state: args.state,
      vertical: args.vertical
    });

    await prisma.shopCompetitorObservation.create({
      data: {
        sourceShopId: args.sourceShopId,
        competitorShopId: competitorShop.id,
        scanId: args.scanId || undefined,
        observedAt,
        source: 'scan_competitor_graph',
        confidence: competitor.url ? 'live' : 'fallback',
        relationshipType: 'market_competitor',
        notes: competitor.note || competitor.differentiatorGuess || undefined
      }
    });
  }
}
