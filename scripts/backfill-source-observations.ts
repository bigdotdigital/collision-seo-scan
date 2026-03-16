import { prisma } from '../lib/prisma.ts';
import { parseJson } from '../lib/json.ts';
import type { GooglePlaceProfile } from '../lib/google-places.ts';
import { recordShopSourceObservation, refreshShopDigitalPresenceSnapshot } from '../lib/shop-data.ts';

type RawReportPayload = {
  googlePlace?: GooglePlaceProfile;
  checks?: {
    checkedUrls?: string[];
    estimateCtaDetected?: boolean;
    onlineEstimateFlow?: boolean;
    reviewProofPresent?: boolean;
  };
};

async function main() {
  const scans = await prisma.scan.findMany({
    where: {
      shopId: { not: null },
      executionStatus: 'completed'
    },
    select: {
      id: true,
      shopId: true,
      createdAt: true,
      city: true,
      websiteUrl: true,
      shopName: true,
      phone: true,
      organization: { select: { state: true, address: true } },
      rawChecksJson: true
    },
    orderBy: { createdAt: 'asc' },
    take: 1000
  });

  let websiteObservations = 0;
  let googleObservations = 0;
  const touchedShopIds = new Set<string>();

  for (const scan of scans) {
    if (!scan.shopId) continue;
    const raw = parseJson<RawReportPayload>(scan.rawChecksJson, {});
    await recordShopSourceObservation({
      shopId: scan.shopId,
      scanId: scan.id,
      observedAt: scan.createdAt,
      city: raw.googlePlace?.city || scan.city,
      state: raw.googlePlace?.state || scan.organization?.state || null,
      sourceType: 'WEBSITE',
      sourceUrl: scan.websiteUrl,
      observedName: scan.shopName,
      observedPhone: scan.phone || raw.googlePlace?.nationalPhoneNumber || null,
      observedAddress: scan.organization?.address || raw.googlePlace?.formattedAddress || null,
      activityScore: raw.checks?.checkedUrls?.length || 1,
      metadata: {
        checkedUrlCount: raw.checks?.checkedUrls?.length || 1,
        hasEstimateCta: Boolean(raw.checks?.estimateCtaDetected),
        hasOnlineEstimateFlow: Boolean(raw.checks?.onlineEstimateFlow),
        hasReviewProof: Boolean(raw.checks?.reviewProofPresent)
      }
    });
    websiteObservations += 1;

    if (raw.googlePlace?.placeId) {
      await recordShopSourceObservation({
        shopId: scan.shopId,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: raw.googlePlace.city || scan.city,
        state: raw.googlePlace.state || scan.organization?.state || null,
        sourceType: 'GOOGLE_MAPS',
        sourceUrl: raw.googlePlace.googleMapsUri,
        externalId: raw.googlePlace.placeId,
        observedName: raw.googlePlace.name,
        observedPhone: raw.googlePlace.nationalPhoneNumber,
        observedAddress: raw.googlePlace.formattedAddress,
        rating: raw.googlePlace.rating,
        reviewCount: raw.googlePlace.userRatingCount,
        metadata: {
          websiteUri: raw.googlePlace.websiteUri,
          primaryTypeDisplayName: raw.googlePlace.primaryTypeDisplayName,
          lat: raw.googlePlace.lat,
          lng: raw.googlePlace.lng
        }
      });
      googleObservations += 1;
    }

    touchedShopIds.add(scan.shopId);
  }

  const shops = await prisma.shop.findMany({
    where: {
      googlePlaceId: { not: null }
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      address: true,
      phone: true,
      googlePlaceId: true,
      reviewObservations: {
        where: {
          googlePlaceId: { not: null }
        },
        orderBy: { observedAt: 'desc' },
        take: 1,
        select: {
          observedAt: true,
          rating: true,
          reviewCount: true,
          googlePlaceId: true,
          googleMapsUri: true
        }
      }
    }
  });

  for (const shop of shops) {
    const latestReview = shop.reviewObservations[0];
    if (!shop.googlePlaceId || !latestReview) continue;
    await recordShopSourceObservation({
      shopId: shop.id,
      observedAt: latestReview.observedAt,
      city: shop.city,
      state: shop.state,
      sourceType: 'GOOGLE_MAPS',
      sourceUrl: latestReview.googleMapsUri,
      externalId: latestReview.googlePlaceId || shop.googlePlaceId,
      observedName: shop.name,
      observedPhone: shop.phone,
      observedAddress: shop.address,
      rating: latestReview.rating,
      reviewCount: latestReview.reviewCount
    });
    googleObservations += 1;
    touchedShopIds.add(shop.id);
  }

  for (const shopId of touchedShopIds) {
    await refreshShopDigitalPresenceSnapshot({ shopId });
  }

  console.log(
    JSON.stringify(
      {
        scansConsidered: scans.length,
        websiteObservations,
        googleObservations,
        snapshotsRefreshed: touchedShopIds.size
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
