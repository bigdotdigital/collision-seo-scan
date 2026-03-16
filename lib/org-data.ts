import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { computeExpiry, isExpired, TTL } from '@/lib/cache-policy';
import { upsertShopFromInput } from '@/lib/shop-data';

type OrganizationInput = {
  shop_name?: string | null;
  website_url?: string | null;
  phone?: string | null;
  city_or_zip?: string | null;
  googlePlaceId?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  primaryCategory?: string | null;
  vertical?: string | null;
};

function domainOf(value?: string | null) {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export function hashRequest(obj: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(obj || {}))
    .digest('hex');
}

export async function upsertOrganizationFromInput(input: OrganizationInput) {
  const name = (input.shop_name || '').trim() || 'Unknown Shop';
  const websiteUrl = (input.website_url || '').trim() || undefined;
  const city = input.city || input.city_or_zip || undefined;

  const shop = await upsertShopFromInput({
    name,
    websiteUrl,
    phone: input.phone,
    address: input.address,
    city,
    state: input.state,
    zip: input.zip,
    lat: input.lat,
    lng: input.lng,
    googlePlaceId: input.googlePlaceId,
    primaryCategory: input.primaryCategory,
    vertical: input.vertical
  });

  const existing = await prisma.organization.findFirst({
    where: {
      OR: [
        { shopId: shop.id },
        websiteUrl
          ? {
              websiteUrl
            }
          : undefined,
        input.phone && input.address
          ? {
              phone: input.phone,
              address: input.address,
              city,
              state: input.state || undefined
            }
          : undefined
      ].filter(Boolean) as Array<Record<string, unknown>>
    }
  });

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        shopId: shop.id,
        name,
        websiteUrl: websiteUrl || existing.websiteUrl,
        phone: input.phone || existing.phone,
        address: input.address || existing.address,
        city: city || existing.city,
        state: input.state || existing.state,
        zip: input.zip || existing.zip,
        lat: input.lat ?? existing.lat,
        lng: input.lng ?? existing.lng,
        primaryCategory: input.primaryCategory || existing.primaryCategory,
        verticalDefault: input.vertical || existing.verticalDefault
      }
    });
  }

  return prisma.organization.create({
    data: {
      shopId: shop.id,
      name,
      websiteUrl: websiteUrl || undefined,
      phone: input.phone || undefined,
      address: input.address || undefined,
      city,
      state: input.state || undefined,
      zip: input.zip || undefined,
      lat: input.lat ?? undefined,
      lng: input.lng ?? undefined,
      primaryCategory: input.primaryCategory || undefined,
      verticalDefault: input.vertical || undefined
    }
  });
}

export async function ensureOrganizationForShop(args: {
  orgId: string;
  shopId: string;
  name: string;
  websiteUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  primaryCategory?: string | null;
  vertical?: string | null;
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: args.orgId }
  });

  if (!organization) {
    throw new Error('organization_not_found');
  }

  if (!organization.shopId || organization.shopId === args.shopId) {
    return organization;
  }

  const existingForShop = await prisma.organization.findFirst({
    where: {
      OR: [
        { shopId: args.shopId },
        args.websiteUrl ? { websiteUrl: args.websiteUrl } : undefined,
        args.phone && args.address
          ? {
              phone: args.phone,
              address: args.address,
              city: args.city || undefined,
              state: args.state || undefined
            }
          : undefined
      ].filter(Boolean) as Array<Record<string, unknown>>
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
  });

  if (existingForShop) {
    return existingForShop;
  }

  return prisma.organization.create({
    data: {
      shopId: args.shopId,
      name: args.name,
      websiteUrl: args.websiteUrl || undefined,
      phone: args.phone || undefined,
      address: args.address || undefined,
      city: args.city || undefined,
      state: args.state || undefined,
      zip: args.zip || undefined,
      lat: args.lat ?? undefined,
      lng: args.lng ?? undefined,
      primaryCategory: args.primaryCategory || undefined,
      verticalDefault: args.vertical || organization.verticalDefault || 'collision'
    }
  });
}

export async function createScanRecord(
  input: {
    website_url?: string;
    city_or_zip?: string;
    shop_name?: string;
    email?: string;
    phone?: string;
    has_i_car?: boolean;
    has_oem?: boolean;
    has_adas?: boolean;
    has_aluminum?: boolean;
    vertical?: string;
    executionStatus?: string;
    traceId?: string;
    queuedAt?: Date;
  },
  organizationId?: string,
  shopId?: string
) {
  return prisma.scan.create({
    data: {
      shopName: input.shop_name || 'Unknown Shop',
      city: input.city_or_zip || 'Unknown',
      websiteUrl: input.website_url || '',
      email: input.email || null,
      phone: input.phone || null,
      scoreTotal: 0,
      scoreWebsite: 0,
      scoreLocal: 0,
      scoreIntent: 0,
      issuesJson: '[]',
      moneyKeywordsJson: '[]',
      competitorsJson: '[]',
      rawChecksJson: '{}',
      status: 'lead',
      executionStatus: input.executionStatus || 'completed',
      traceId: input.traceId || undefined,
      queuedAt: input.queuedAt || undefined,
      vertical: input.vertical || 'collision',
      shopId,
      organizationId,
      scoringModelVersion: 'v0.1'
    }
  });
}

export async function createSnapshot(args: {
  scanId: string;
  organizationId: string;
  visibilityScore: number;
  scoringModelVersion: string;
  reviewRating?: number | null;
  reviewCount?: number | null;
  keywordsChecked?: unknown;
  rankPositions?: unknown;
  topCompetitors?: unknown;
  lostDemandEstimate?: unknown;
  recommendations?: unknown;
  componentScores?: unknown;
  vertical?: string;
}) {
  const snapshot = await prisma.scanSnapshot.create({
    data: {
      scanId: args.scanId,
      organizationId: args.organizationId,
      visibilityScore: args.visibilityScore,
      scoringModelVersion: args.scoringModelVersion,
      vertical: args.vertical || 'collision',
      reviewRating: args.reviewRating ?? undefined,
      reviewCount: args.reviewCount ?? undefined,
      keywordsCheckedJson: args.keywordsChecked
        ? JSON.stringify(args.keywordsChecked)
        : undefined,
      rankPositionsJson: args.rankPositions
        ? JSON.stringify(args.rankPositions)
        : undefined,
      topCompetitorsJson: args.topCompetitors
        ? JSON.stringify(args.topCompetitors)
        : undefined,
      lostDemandEstimateJson: args.lostDemandEstimate
        ? JSON.stringify(args.lostDemandEstimate)
        : undefined,
      recommendationsJson: args.recommendations
        ? JSON.stringify(args.recommendations)
        : undefined
    }
  });

  await prisma.scan.update({
    where: { id: args.scanId },
    data: {
      scoringModelVersion: args.scoringModelVersion,
      componentScoresJson: args.componentScores
        ? JSON.stringify(args.componentScores)
        : undefined,
      latestSnapshotId: snapshot.id
    }
  });

  return snapshot;
}

export async function storeRawProviderResponse(args: {
  scanId: string;
  organizationId?: string;
  provider: string;
  endpoint?: string;
  cacheKey?: string;
  request: unknown;
  response: unknown;
}) {
  const requestHash = hashRequest(args.request);
  return prisma.rawProviderResponse.create({
    data: {
      scanId: args.scanId,
      organizationId: args.organizationId,
      provider: args.provider,
      endpoint: args.endpoint,
      cacheKey: args.cacheKey,
      requestHash,
      responseJson: JSON.stringify(args.response)
    }
  });
}

export async function getOrSetCache(params: {
  organizationId: string;
  provider: string;
  cacheKey: string;
  ttlProviderKey: keyof typeof TTL;
}) {
  const existing = await prisma.providerCache.findUnique({
    where: {
      organizationId_provider_cacheKey: {
        organizationId: params.organizationId,
        provider: params.provider,
        cacheKey: params.cacheKey
      }
    }
  });

  if (existing && !isExpired(existing.expiresAt)) {
    return { hit: true, cache: existing };
  }

  const now = new Date();
  const expiresAt = computeExpiry(params.ttlProviderKey, now);

  const cache = await prisma.providerCache.upsert({
    where: {
      organizationId_provider_cacheKey: {
        organizationId: params.organizationId,
        provider: params.provider,
        cacheKey: params.cacheKey
      }
    },
    update: {
      lastFetchedAt: now,
      expiresAt
    },
    create: {
      organizationId: params.organizationId,
      provider: params.provider,
      cacheKey: params.cacheKey,
      lastFetchedAt: now,
      expiresAt
    }
  });

  return { hit: false, cache };
}

export async function upsertLead(args: {
  organizationId: string;
  scanId?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  intent?: string | null;
  budgetRange?: string | null;
  timeline?: string | null;
  source?: string | null;
  consented?: boolean;
  vertical?: string | null;
}) {
  return prisma.lead.create({
    data: {
      organizationId: args.organizationId,
      scanId: args.scanId,
      email: args.email || undefined,
      phone: args.phone || undefined,
      name: args.name || undefined,
      intent: args.intent || undefined,
      budgetRange: args.budgetRange || undefined,
      timeline: args.timeline || undefined,
      vertical: args.vertical || undefined,
      source: args.source || undefined,
      consentedAt: args.consented ? new Date() : undefined
    }
  });
}
