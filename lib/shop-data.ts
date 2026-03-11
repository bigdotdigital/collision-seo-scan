import { prisma } from '@/lib/prisma';
import type { Competitor, MoneyKeyword } from '@/lib/types';

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

export async function upsertShopFromInput(input: ShopInput) {
  const name = clean(input.name) || 'Unknown Shop';
  const websiteUrl = clean(input.websiteUrl);
  const city = clean(input.city);
  const state = clean(input.state);

  const existing =
    (input.googlePlaceId
      ? await prisma.shop.findUnique({
          where: { googlePlaceId: input.googlePlaceId }
        })
      : null) ||
    (websiteUrl
      ? await prisma.shop.findFirst({
          where: {
            OR: [
              { websiteUrl },
              {
                websiteUrl: {
                  contains: hostnameOf(websiteUrl),
                  mode: 'insensitive'
                }
              }
            ]
          }
        })
      : null) ||
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
        phone: clean(input.phone) || existing.phone,
        address: clean(input.address) || existing.address,
        city: city || existing.city,
        state: state || existing.state,
        zip: clean(input.zip) || existing.zip,
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
      phone: clean(input.phone) || undefined,
      address: clean(input.address) || undefined,
      city: city || undefined,
      state: state || undefined,
      zip: clean(input.zip) || undefined,
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
