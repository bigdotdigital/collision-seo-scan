import { prisma } from '@/lib/prisma';

export type ShopInput = {
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

export function clean(value?: string | null) {
  const trimmed = (value || '').trim();
  return trimmed || null;
}

export function hostnameOf(value?: string | null) {
  if (!value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function pathnameOf(value?: string | null) {
  if (!value) return '/';
  try {
    return new URL(value).pathname || '/';
  } catch {
    return '/';
  }
}

function isRootWebsite(value?: string | null) {
  const pathname = pathnameOf(value);
  return pathname === '/' || pathname === '';
}

function normalizeAddress(value?: string | null) {
  const cleaned = clean(value);
  if (!cleaned) return null;
  return cleaned.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizedState(value?: string | null) {
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

function normalizedShopInput(input: ShopInput) {
  const name = clean(input.name) || 'Unknown Shop';
  const websiteUrl = clean(input.websiteUrl);
  const city = clean(input.city);
  const state = normalizedState(input.state);
  const websiteHost = hostnameOf(websiteUrl);
  const isRootDomain = isRootWebsite(websiteUrl);
  const address = clean(input.address);
  const normalizedAddress = normalizeAddress(address);
  const phone = clean(input.phone);

  return {
    name,
    websiteUrl,
    city,
    state,
    address,
    normalizedAddress,
    phone,
    websiteHost,
    isRootDomain
  };
}

async function findExistingShop(args: {
  name: string;
  websiteUrl: string | null;
  websiteHost: string;
  isRootDomain: boolean;
  city: string | null;
  state: string | null;
  address: string | null;
  normalizedAddress: string | null;
  phone: string | null;
  googlePlaceId?: string | null;
}) {
  if (args.googlePlaceId) {
    const byPlaceId = await prisma.shop.findUnique({
      where: { googlePlaceId: args.googlePlaceId }
    });
    if (byPlaceId) return byPlaceId;
  }

  if (args.websiteUrl) {
    const byWebsite = await prisma.shop.findFirst({
      where: { websiteUrl: args.websiteUrl }
    });
    if (byWebsite) return byWebsite;
  }

  if (args.normalizedAddress && args.city) {
    const byAddress = await prisma.shop.findFirst({
      where: {
        city: args.city,
        state: args.state || undefined,
        address: args.address || undefined
      }
    });
    if (byAddress) return byAddress;
  }

  if (args.phone && args.city) {
    const byPhone = await prisma.shop.findFirst({
      where: {
        city: args.city,
        state: args.state || undefined,
        phone: args.phone
      }
    });
    if (byPhone) return byPhone;
  }

  const byNameAndMarket = await prisma.shop.findFirst({
    where: {
      name: args.name,
      city: args.city || undefined,
      state: args.state || undefined
    }
  });
  if (byNameAndMarket) return byNameAndMarket;

  if (args.websiteHost && args.isRootDomain) {
    const byHost = await prisma.shop.findFirst({
      where: {
        normalizedWebsiteHost: args.websiteHost,
        OR: [
          args.city ? { city: args.city } : undefined,
          { city: null }
        ].filter(Boolean) as Array<Record<string, unknown>>
      }
    });
    if (byHost) return byHost;
  }

  return null;
}

export async function upsertShopFromInput(input: ShopInput) {
  const {
    name,
    websiteUrl,
    city,
    state,
    address,
    normalizedAddress,
    phone,
    websiteHost,
    isRootDomain
  } = normalizedShopInput(input);
  const market = await upsertMarketFromInput({
    city,
    state,
    vertical: input.vertical
  });
  const existing = await findExistingShop({
    name,
    websiteUrl,
    websiteHost,
    isRootDomain,
    city,
    state,
    address,
    normalizedAddress,
    phone,
    googlePlaceId: clean(input.googlePlaceId)
  });

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
