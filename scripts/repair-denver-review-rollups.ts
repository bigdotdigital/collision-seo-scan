import { prisma } from '../lib/prisma.ts';
import { recordReviewObservation } from '../lib/shop-data.ts';
import { refreshShopDigitalPresenceSnapshot } from '../lib/shop-source-observations.ts';
import type { GooglePlaceProfile } from '../lib/google-places.ts';

const DENVER_MARKET_CITIES = [
  'Denver',
  'Aurora',
  'Lakewood',
  'Littleton',
  'Englewood',
  'Arvada',
  'Westminster',
  'Thornton',
  'Centennial',
  'Broomfield',
  'Wheat Ridge',
  'Sheridan',
  'Glendale',
  'Greenwood Village',
  'Highlands Ranch',
  'Northglenn',
  'Commerce City',
  'Golden'
] as const;

async function main() {
  const shops = await prisma.shop.findMany({
    where: {
      city: { in: [...DENVER_MARKET_CITIES] }
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      address: true,
      websiteUrl: true,
      googlePlaceId: true,
      digitalPresenceSnapshot: {
        select: {
          googleReviewCount: true,
          hasWebsite: true,
          hasGoogleProfile: true
        }
      },
      reviewObservations: {
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: {
          reviewCount: true,
          observedAt: true
        }
      },
      sourceObservations: {
        where: { sourceType: 'GOOGLE_MAPS' },
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: {
          observedAt: true,
          reviewCount: true,
          sourceUrl: true,
          externalId: true,
          observedName: true,
          observedPhone: true,
          observedAddress: true,
          city: true,
          state: true,
          rating: true,
          metadata: true
        }
      }
    }
  });

  let reviewBackfills = 0;
  let snapshotRefreshes = 0;

  for (const shop of shops) {
    const latestReview = shop.reviewObservations[0] || null;
    const latestSource = shop.sourceObservations[0] || null;
    const snapshot = shop.digitalPresenceSnapshot;
    const needsReviewBackfill =
      !latestReview?.reviewCount && typeof latestSource?.reviewCount === 'number' && latestSource.reviewCount > 0;

    if (needsReviewBackfill) {
      const metadata = (latestSource.metadata as { googleMapsUri?: string | null; websiteUri?: string | null } | null) || null;
      const profile: GooglePlaceProfile = {
        placeId: latestSource.externalId || shop.googlePlaceId || '',
        name: latestSource.observedName || shop.name,
        formattedAddress: latestSource.observedAddress || shop.address || null,
        city: latestSource.city || shop.city || null,
        state: latestSource.state || shop.state || null,
        lat: null,
        lng: null,
        rating: latestSource.rating ?? null,
        userRatingCount: latestSource.reviewCount ?? null,
        websiteUri: metadata?.websiteUri || shop.websiteUrl || null,
        googleMapsUri: latestSource.sourceUrl || metadata?.googleMapsUri || null,
        nationalPhoneNumber: latestSource.observedPhone || null,
        primaryTypeDisplayName: null
      };

      await recordReviewObservation({
        shopId: shop.id,
        observedAt: latestSource.observedAt,
        city: profile.city,
        state: profile.state,
        vertical: 'collision',
        source: 'google_places_profile_backfill',
        confidence: 'live',
        profile
      });

      reviewBackfills += 1;
    }

    const needsSnapshotRefresh =
      !snapshot ||
      (Boolean(shop.websiteUrl) && !snapshot.hasWebsite) ||
      (typeof latestSource?.reviewCount === 'number' && latestSource.reviewCount > 0 && (snapshot.googleReviewCount || 0) === 0);

    if (needsSnapshotRefresh) {
      await refreshShopDigitalPresenceSnapshot({ shopId: shop.id });
      snapshotRefreshes += 1;
    }
  }

  console.log(JSON.stringify({ scanned: shops.length, reviewBackfills, snapshotRefreshes }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
