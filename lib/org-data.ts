import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { computeExpiry, isExpired, TTL } from '@/lib/cache-policy';

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
};

export function hashRequest(obj: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(obj || {}))
    .digest('hex');
}

export async function upsertOrganizationFromInput(input: OrganizationInput) {
  const name = (input.shop_name || '').trim() || 'Unknown Shop';

  if (input.googlePlaceId) {
    return prisma.organization.upsert({
      where: { googlePlaceId: input.googlePlaceId },
      update: {
        name,
        websiteUrl: input.website_url || undefined,
        phone: input.phone || undefined,
        address: input.address || undefined,
        city: input.city || input.city_or_zip || undefined,
        state: input.state || undefined,
        zip: input.zip || undefined,
        lat: input.lat ?? undefined,
        lng: input.lng ?? undefined,
        primaryCategory: input.primaryCategory || undefined
      },
      create: {
        googlePlaceId: input.googlePlaceId,
        name,
        websiteUrl: input.website_url || undefined,
        phone: input.phone || undefined,
        address: input.address || undefined,
        city: input.city || input.city_or_zip || undefined,
        state: input.state || undefined,
        zip: input.zip || undefined,
        lat: input.lat ?? undefined,
        lng: input.lng ?? undefined,
        primaryCategory: input.primaryCategory || undefined
      }
    });
  }

  const existing = await prisma.organization.findFirst({
    where: {
      name,
      city: input.city || input.city_or_zip || undefined
    }
  });

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        websiteUrl: input.website_url || existing.websiteUrl,
        phone: input.phone || existing.phone
      }
    });
  }

  return prisma.organization.create({
    data: {
      name,
      websiteUrl: input.website_url || undefined,
      phone: input.phone || undefined,
      city: input.city || input.city_or_zip || undefined
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
  },
  organizationId?: string
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
}) {
  const snapshot = await prisma.scanSnapshot.create({
    data: {
      scanId: args.scanId,
      organizationId: args.organizationId,
      visibilityScore: args.visibilityScore,
      scoringModelVersion: args.scoringModelVersion,
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
      scoreTotal: args.visibilityScore,
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
      source: args.source || undefined,
      consentedAt: args.consented ? new Date() : undefined
    }
  });
}
