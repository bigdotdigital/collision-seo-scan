import type { GooglePlaceProfile } from '@/lib/google-places';
import { prisma } from '@/lib/prisma';

export type ShopFallbackIntel = {
  googlePlace: GooglePlaceProfile | null;
  reviewCount: number | null;
  reviewRating: number | null;
} | null;

export async function getShopFallbackIntel(args: {
  shopId?: string | null;
  organizationId?: string | null;
}) {
  let shopId = args.shopId || null;

  if (!shopId && args.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { shopId: true }
    });
    shopId = org?.shopId || null;
  }

  if (!shopId) return null;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      address: true,
      city: true,
      state: true,
      websiteUrl: true,
      phone: true,
      googlePlaceId: true,
      lat: true,
      lng: true,
      primaryCategory: true,
      reviewObservations: {
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: {
          rating: true,
          reviewCount: true,
          googlePlaceId: true,
          googleMapsUri: true
        }
      },
      sourceObservations: {
        where: { sourceType: 'GOOGLE_MAPS' },
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: {
          sourceUrl: true,
          externalId: true,
          observedName: true,
          observedPhone: true,
          observedAddress: true,
          city: true,
          state: true,
          rating: true,
          reviewCount: true,
          metadata: true
        }
      },
      digitalPresenceSnapshot: {
        select: {
          googleReviewCount: true,
          hasGoogleProfile: true
        }
      }
    }
  });

  if (!shop) return null;

  const source = shop.sourceObservations[0] || null;
  const review = shop.reviewObservations[0] || null;
  const metadata = (source?.metadata as { websiteUri?: string | null; primaryTypeDisplayName?: string | null } | null) || null;
  const reviewCount = source?.reviewCount ?? review?.reviewCount ?? shop.digitalPresenceSnapshot?.googleReviewCount ?? null;
  const reviewRating = source?.rating ?? review?.rating ?? null;

  if (!source && !review && !shop.digitalPresenceSnapshot?.hasGoogleProfile) return null;

  return {
    googlePlace: {
      placeId: source?.externalId || review?.googlePlaceId || shop.googlePlaceId || '',
      name: source?.observedName || shop.name,
      formattedAddress: source?.observedAddress || shop.address || null,
      city: source?.city || shop.city || null,
      state: source?.state || shop.state || null,
      lat: shop.lat,
      lng: shop.lng,
      rating: reviewRating,
      userRatingCount: reviewCount,
      websiteUri: metadata?.websiteUri || shop.websiteUrl || null,
      googleMapsUri: source?.sourceUrl || review?.googleMapsUri || null,
      nationalPhoneNumber: source?.observedPhone || shop.phone || null,
      primaryTypeDisplayName: metadata?.primaryTypeDisplayName || shop.primaryCategory || null
    },
    reviewCount,
    reviewRating
  } satisfies NonNullable<ShopFallbackIntel>;
}
