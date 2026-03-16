import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { upsertMarketFromInput } from '@/lib/shop-core';

export const SHOP_SOURCE_TYPES = [
  'WEBSITE',
  'GOOGLE_MAPS',
  'YELP',
  'FACEBOOK',
  'INSTAGRAM',
  'CARWISE',
  'NEWS',
  'REDDIT'
] as const;

export type ShopSourceType = (typeof SHOP_SOURCE_TYPES)[number];

function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

export function sourceConfidenceScore(sourceType: ShopSourceType) {
  if (sourceType === 'GOOGLE_MAPS' || sourceType === 'CARWISE' || sourceType === 'WEBSITE') return 0.95;
  if (sourceType === 'FACEBOOK' || sourceType === 'INSTAGRAM') return 0.8;
  if (sourceType === 'YELP' || sourceType === 'NEWS') return 0.65;
  return 0.35;
}

export async function recordShopSourceObservation(args: {
  shopId: string;
  marketId?: string | null;
  scanId?: string | null;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  sourceType: ShopSourceType;
  sourceUrl?: string | null;
  externalId?: string | null;
  observedName?: string | null;
  observedPhone?: string | null;
  observedAddress?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  followerCount?: number | null;
  postCount?: number | null;
  activityScore?: number | null;
  confidence?: number | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const observedAt = args.observedAt || new Date();
  const market =
    args.marketId
      ? { id: args.marketId }
      : await upsertMarketFromInput({
          city: args.city,
          state: args.state,
          vertical: args.vertical
        });

  if (!args.scanId) {
    const dayStart = startOfUtcDay(observedAt);
    const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const existing = await prisma.shopSourceObservation.findFirst({
      where: {
        shopId: args.shopId,
        sourceType: args.sourceType,
        observedAt: { gte: dayStart, lt: nextDay },
        ...(args.externalId ? { externalId: args.externalId } : {}),
        ...(args.externalId ? {} : args.sourceUrl ? { sourceUrl: args.sourceUrl } : {})
      },
      select: { id: true }
    });

    if (existing) {
      return prisma.shopSourceObservation.update({
        where: { id: existing.id },
        data: {
          marketId: market?.id || undefined,
          observedAt,
          sourceUrl: args.sourceUrl || undefined,
          externalId: args.externalId || undefined,
          observedName: args.observedName || undefined,
          observedPhone: args.observedPhone || undefined,
          observedAddress: args.observedAddress || undefined,
          city: args.city || undefined,
          state: args.state || undefined,
          rating: typeof args.rating === 'number' ? args.rating : undefined,
          reviewCount: typeof args.reviewCount === 'number' ? args.reviewCount : undefined,
          followerCount: typeof args.followerCount === 'number' ? args.followerCount : undefined,
          postCount: typeof args.postCount === 'number' ? args.postCount : undefined,
          activityScore: typeof args.activityScore === 'number' ? args.activityScore : undefined,
          confidence: typeof args.confidence === 'number' ? args.confidence : sourceConfidenceScore(args.sourceType),
          metadata: args.metadata
        }
      });
    }
  }

  return prisma.shopSourceObservation.create({
    data: {
      shopId: args.shopId,
      marketId: market?.id || undefined,
      scanId: args.scanId || undefined,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl || undefined,
      externalId: args.externalId || undefined,
      observedName: args.observedName || undefined,
      observedPhone: args.observedPhone || undefined,
      observedAddress: args.observedAddress || undefined,
      city: args.city || undefined,
      state: args.state || undefined,
      rating: typeof args.rating === 'number' ? args.rating : undefined,
      reviewCount: typeof args.reviewCount === 'number' ? args.reviewCount : undefined,
      followerCount: typeof args.followerCount === 'number' ? args.followerCount : undefined,
      postCount: typeof args.postCount === 'number' ? args.postCount : undefined,
      activityScore: typeof args.activityScore === 'number' ? args.activityScore : undefined,
      confidence: typeof args.confidence === 'number' ? args.confidence : sourceConfidenceScore(args.sourceType),
      metadata: args.metadata,
      observedAt
    }
  });
}

export async function refreshShopDigitalPresenceSnapshot(args: { shopId: string }) {
  const shop = await prisma.shop.findUnique({
    where: { id: args.shopId },
    select: {
      id: true,
      websiteUrl: true,
      scans: {
        where: { executionStatus: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { scoreTotal: true, createdAt: true }
      },
      reviewObservations: {
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: { reviewCount: true, observedAt: true }
      },
      sourceObservations: {
        orderBy: { observedAt: 'desc' },
        select: {
          sourceType: true,
          observedAt: true,
          reviewCount: true,
          followerCount: true,
          postCount: true,
          activityScore: true
        }
      }
    }
  });

  if (!shop) return null;

  const latestBySource = new Map<string, (typeof shop.sourceObservations)[number]>();
  for (const row of shop.sourceObservations) {
    if (!latestBySource.has(row.sourceType)) latestBySource.set(row.sourceType, row);
  }

  const hasWebsite = Boolean(shop.websiteUrl);
  const hasGoogleProfile = latestBySource.has('GOOGLE_MAPS') || Boolean(shop.reviewObservations[0]?.reviewCount);
  const hasYelp = latestBySource.has('YELP');
  const hasFacebook = latestBySource.has('FACEBOOK');
  const hasInstagram = latestBySource.has('INSTAGRAM');
  const hasCarwise = latestBySource.has('CARWISE');
  const hasNewsMentions = latestBySource.has('NEWS');
  const hasRedditMentions = latestBySource.has('REDDIT');

  const googleReviewCount =
    latestBySource.get('GOOGLE_MAPS')?.reviewCount ?? shop.reviewObservations[0]?.reviewCount ?? null;
  const yelpReviewCount = latestBySource.get('YELP')?.reviewCount ?? null;
  const instagramActivity =
    latestBySource.get('INSTAGRAM')?.activityScore ??
    latestBySource.get('INSTAGRAM')?.postCount ??
    latestBySource.get('INSTAGRAM')?.followerCount ??
    null;
  const facebookActivity =
    latestBySource.get('FACEBOOK')?.activityScore ??
    latestBySource.get('FACEBOOK')?.postCount ??
    latestBySource.get('FACEBOOK')?.followerCount ??
    null;

  const coverageFlags = [
    hasWebsite,
    hasGoogleProfile,
    hasYelp,
    hasFacebook,
    hasInstagram,
    hasCarwise
  ];
  const sourceCoverageScore = Number(((coverageFlags.filter(Boolean).length / coverageFlags.length) * 100).toFixed(1));
  const latestScanScore = shop.scans[0]?.scoreTotal ?? null;
  const hiddenOperatorScore = Number(
    (
      Math.min(60, Math.log10((googleReviewCount || 0) + 1) * 22) +
      (hasCarwise ? 18 : 0) +
      (!hasWebsite ? 12 : 0) +
      (latestScanScore === null ? 10 : Math.max(0, 35 - latestScanScore) * 0.5)
    ).toFixed(1)
  );
  const lastObservedAt = [shop.reviewObservations[0]?.observedAt, ...shop.sourceObservations.map((row) => row.observedAt)]
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return prisma.shopDigitalPresenceSnapshot.upsert({
    where: { shopId: shop.id },
    create: {
      shopId: shop.id,
      hasWebsite,
      hasGoogleProfile,
      hasYelp,
      hasFacebook,
      hasInstagram,
      hasCarwise,
      hasNewsMentions,
      hasRedditMentions,
      googleReviewCount: googleReviewCount ?? undefined,
      yelpReviewCount: yelpReviewCount ?? undefined,
      instagramActivity: typeof instagramActivity === 'number' ? instagramActivity : undefined,
      facebookActivity: typeof facebookActivity === 'number' ? facebookActivity : undefined,
      sourceCoverageScore,
      hiddenOperatorScore,
      lastObservedAt
    },
    update: {
      hasWebsite,
      hasGoogleProfile,
      hasYelp,
      hasFacebook,
      hasInstagram,
      hasCarwise,
      hasNewsMentions,
      hasRedditMentions,
      googleReviewCount: googleReviewCount ?? undefined,
      yelpReviewCount: yelpReviewCount ?? undefined,
      instagramActivity: typeof instagramActivity === 'number' ? instagramActivity : undefined,
      facebookActivity: typeof facebookActivity === 'number' ? facebookActivity : undefined,
      sourceCoverageScore,
      hiddenOperatorScore,
      lastObservedAt
    }
  });
}
