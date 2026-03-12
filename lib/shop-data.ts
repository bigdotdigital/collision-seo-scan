import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';
import type { Competitor, MoneyKeyword, ScanChecks } from '@/lib/types';
import type { GooglePlaceProfile } from '@/lib/google-places';
import type { MapPackResult } from '@/lib/types';

type ShopInput = {
  name: string;
  websiteUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  googlePlaceId?: string | null;
  primaryCategory?: string | null;
  vertical?: string | null;
};

function clean(value?: string | null) {
  const trimmed = (value || '').trim();
  return trimmed || null;
}

function hostnameOf(value?: string | null) {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizedState(value?: string | null) {
  const cleaned = clean(value);
  return cleaned ? cleaned.toUpperCase() : null;
}

function buildRegionKey(args: {
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  country?: string | null;
}) {
  const city = clean(args.city)?.toLowerCase() || 'unknown-city';
  const state = normalizedState(args.state)?.toLowerCase() || 'unknown-state';
  const vertical = clean(args.vertical)?.toLowerCase() || 'collision';
  const country = clean(args.country)?.toUpperCase() || 'US';
  return `${vertical}:${country}:${state}:${city}`;
}

export class ShopClaimConflictError extends Error {
  constructor(message = 'organization_already_claimed_different_shop') {
    super(message);
    this.name = 'ShopClaimConflictError';
  }
}

export class ShopMergeConflictError extends Error {
  constructor(message = 'shop_merge_conflict') {
    super(message);
    this.name = 'ShopMergeConflictError';
  }
}

export async function upsertMarketFromInput(input: {
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  country?: string | null;
}) {
  const city = clean(input.city);
  if (!city) return null;

  const state = normalizedState(input.state);
  const vertical = clean(input.vertical) || 'collision';
  const country = clean(input.country)?.toUpperCase() || 'US';
  const regionKey = buildRegionKey({ city, state, vertical, country });

  return prisma.market.upsert({
    where: { regionKey },
    create: {
      city: titleCase(city),
      state: state || undefined,
      vertical,
      country,
      regionKey
    },
    update: {
      city: titleCase(city),
      state: state || undefined,
      vertical,
      country
    }
  });
}

export async function upsertShopFromInput(input: ShopInput) {
  const name = clean(input.name) || 'Unknown Shop';
  const websiteUrl = clean(input.websiteUrl);
  const city = clean(input.city);
  const state = normalizedState(input.state);
  const websiteHost = hostnameOf(websiteUrl);
  const market = await upsertMarketFromInput({
    city,
    state,
    vertical: input.vertical
  });

  const exactWebsiteMatch = websiteUrl
    ? await prisma.shop.findFirst({
        where: { websiteUrl }
      })
    : null;
  const sameHostMatch =
    !exactWebsiteMatch && websiteHost
      ? await prisma.shop.findFirst({
          where: {
            normalizedWebsiteHost: websiteHost
          }
        })
      : null;

  const existing =
    (input.googlePlaceId
      ? await prisma.shop.findUnique({
          where: { googlePlaceId: input.googlePlaceId }
        })
      : null) ||
    exactWebsiteMatch ||
    sameHostMatch ||
    (await prisma.shop.findFirst({
      where: {
        name,
        city: city || undefined,
        state: state || undefined
      }
    }));

  if (existing) {
    return prisma.shop.update({
      where: { id: existing.id },
      data: {
        name,
        websiteUrl: websiteUrl || existing.websiteUrl,
        normalizedWebsiteHost: websiteHost || existing.normalizedWebsiteHost,
        phone: clean(input.phone) || existing.phone,
        address: clean(input.address) || existing.address,
        city: city || existing.city,
        state: state || existing.state,
        zip: clean(input.zip) || existing.zip,
        marketId: market?.id || existing.marketId,
        lat: input.lat ?? existing.lat,
        lng: input.lng ?? existing.lng,
        googlePlaceId: clean(input.googlePlaceId) || existing.googlePlaceId,
        primaryCategory: clean(input.primaryCategory) || existing.primaryCategory,
        verticalDefault: clean(input.vertical) || existing.verticalDefault
      }
    });
  }

  return prisma.shop.create({
    data: {
      name,
      websiteUrl: websiteUrl || undefined,
      normalizedWebsiteHost: websiteHost || undefined,
      phone: clean(input.phone) || undefined,
      address: clean(input.address) || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: clean(input.zip) || undefined,
      marketId: market?.id || undefined,
      lat: input.lat ?? undefined,
      lng: input.lng ?? undefined,
      googlePlaceId: clean(input.googlePlaceId) || undefined,
      primaryCategory: clean(input.primaryCategory) || undefined,
      verticalDefault: clean(input.vertical) || undefined
    }
  });
}

export async function resolveCompetitorShop(args: {
  name: string;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
}) {
  return upsertShopFromInput({
    name: args.name,
    websiteUrl: args.websiteUrl,
    city: args.city,
    state: args.state,
    vertical: args.vertical
  });
}

export async function claimShopForOrganization(args: {
  orgId: string;
  shopId: string;
  name?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: args.orgId },
    select: { shopId: true }
  });

  if (!organization) {
    throw new Error('organization_not_found');
  }

  if (organization.shopId && organization.shopId !== args.shopId) {
    throw new ShopClaimConflictError();
  }

  return prisma.organization.update({
    where: { id: args.orgId },
    data: {
      shopId: args.shopId,
      name: clean(args.name) || undefined,
      websiteUrl: clean(args.websiteUrl) || undefined,
      city: clean(args.city) || undefined,
      state: clean(args.state) || undefined
    }
  });
}

function countServicePages(urls: string[]) {
  return urls.filter((url) => /\/(services?|collision|repair|paint|hail|dent|cert|estimate|contact)\b/i.test(url)).length;
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

function parseRankLabel(label?: string | null) {
  if (!label) return null;
  const match = label.match(/#(\d+)/);
  if (match) return Number(match[1]);
  return null;
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

function normalizedShopName(value?: string | null) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function findDuplicateShopCandidates(limit = 24) {
  const shops = await prisma.shop.findMany({
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      websiteUrl: true,
      googlePlaceId: true,
      updatedAt: true,
      _count: {
        select: {
          scans: true,
          organizations: true,
          trackedAsCompetitor: true
        }
      }
    }
  });

  const groups = new Map<string, typeof shops>();
  for (const shop of shops) {
    const host = hostnameOf(shop.websiteUrl);
    const placeKey = clean(shop.googlePlaceId);
    const key = placeKey ? `place:${placeKey}` : host ? `host:${host}` : null;
    if (!key) continue;
    const current = groups.get(key) || [];
    current.push(shop);
    groups.set(key, current);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length || b[0].updatedAt.getTime() - a[0].updatedAt.getTime())
    .slice(0, limit)
    .map((group) => ({
      dedupeKey:
        clean(group[0].googlePlaceId) ||
        hostnameOf(group[0].websiteUrl) ||
        `${normalizedShopName(group[0].name)}:${clean(group[0].city) || ''}:${normalizedState(group[0].state) || ''}`,
      shops: [...group].sort((a, b) => {
        const aStrength = a._count.organizations * 5 + a._count.scans * 2 + a._count.trackedAsCompetitor;
        const bStrength = b._count.organizations * 5 + b._count.scans * 2 + b._count.trackedAsCompetitor;
        return bStrength - aStrength || b.updatedAt.getTime() - a.updatedAt.getTime();
      })
    }));
}

export async function mergeShopRecords(args: {
  sourceShopId: string;
  destinationShopId: string;
}) {
  if (args.sourceShopId === args.destinationShopId) {
    throw new Error('source_and_destination_match');
  }

  const [source, destination] = await Promise.all([
    prisma.shop.findUnique({ where: { id: args.sourceShopId } }),
    prisma.shop.findUnique({ where: { id: args.destinationShopId } })
  ]);

  if (!source || !destination) {
    throw new Error('shop_not_found');
  }

  if (
    source.googlePlaceId &&
    destination.googlePlaceId &&
    source.googlePlaceId !== destination.googlePlaceId
  ) {
    throw new ShopMergeConflictError('google_place_conflict');
  }

  const sourceHost = hostnameOf(source.websiteUrl);
  const destinationHost = hostnameOf(destination.websiteUrl);
  if (sourceHost && destinationHost && sourceHost !== destinationHost) {
    throw new ShopMergeConflictError('website_host_conflict');
  }

  return prisma.$transaction(async (tx) => {
    await tx.shop.update({
      where: { id: destination.id },
      data: {
        name: destination.name || source.name,
        websiteUrl: destination.websiteUrl || source.websiteUrl,
        normalizedWebsiteHost:
          hostnameOf(destination.websiteUrl) ||
          hostnameOf(source.websiteUrl) ||
          destination.normalizedWebsiteHost ||
          source.normalizedWebsiteHost,
        phone: destination.phone || source.phone,
        address: destination.address || source.address,
        city: destination.city || source.city,
        state: destination.state || source.state,
        zip: destination.zip || source.zip,
        lat: destination.lat ?? source.lat,
        lng: destination.lng ?? source.lng,
        googlePlaceId: destination.googlePlaceId || source.googlePlaceId || undefined,
        primaryCategory: destination.primaryCategory || source.primaryCategory,
        marketId: destination.marketId || source.marketId,
        verticalDefault: destination.verticalDefault || source.verticalDefault
      }
    });

    await Promise.all([
      tx.scan.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id }
      }),
      tx.organization.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id }
      }),
      tx.trackedCompetitor.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id }
      }),
      tx.shopKeywordObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id }
      }),
      tx.shopReviewObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopRankObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopSerpObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopConversionObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopSiteFeatureObservation.updateMany({
        where: { shopId: source.id },
        data: { shopId: destination.id, marketId: destination.marketId || source.marketId || undefined }
      }),
      tx.shopCompetitorObservation.updateMany({
        where: { sourceShopId: source.id },
        data: { sourceShopId: destination.id }
      }),
      tx.shopCompetitorObservation.updateMany({
        where: { competitorShopId: source.id },
        data: { competitorShopId: destination.id }
      })
    ]);

    await tx.shop.delete({
      where: { id: source.id }
    });

    return {
      merged: true,
      sourceShopId: source.id,
      destinationShopId: destination.id
    };
  });
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
        cpcMicros:
          typeof keyword.cpc === 'number'
            ? Math.round(keyword.cpc * 1_000_000)
            : undefined,
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
