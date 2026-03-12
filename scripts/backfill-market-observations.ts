import { prisma } from '../lib/prisma';
import { parseJson } from '../lib/json';
import {
  recordCompetitorObservations,
  recordConversionObservation,
  recordKeywordObservations,
  recordReviewObservation,
  recordSerpObservations,
  recordSiteFeatureObservation
} from '../lib/shop-data';
import type { Competitor, MapPackResult, MoneyKeyword, ScanChecks } from '../lib/types';
import type { GooglePlaceProfile } from '../lib/google-places';

type RawReportPayload = {
  checks?: ScanChecks;
  missingPages?: string[];
  googlePlace?: GooglePlaceProfile;
  mapPack?: MapPackResult;
};

async function main() {
  const scans = await prisma.scan.findMany({
    where: {
      shopId: { not: null }
    },
    select: {
      id: true,
      shopId: true,
      createdAt: true,
      city: true,
      vertical: true,
      moneyKeywordsJson: true,
      competitorsJson: true,
      rawChecksJson: true,
      bookedClicked: true,
      email: true,
      organization: {
        select: {
          state: true
        }
      },
      leads: {
        select: {
          id: true
        },
        take: 1
      }
    },
    orderBy: { createdAt: 'asc' },
    take: 500
  });

  let keywordsBackfilled = 0;
  let competitorsBackfilled = 0;
  let siteFeaturesBackfilled = 0;
  let reviewsBackfilled = 0;
  let serpBackfilled = 0;
  let conversionsBackfilled = 0;

  for (const scan of scans) {
    if (!scan.shopId) continue;

    const [keywordCount, competitorCount, siteFeatureCount, reviewCount, serpCount, conversionCount] = await Promise.all([
      prisma.shopKeywordObservation.count({ where: { scanId: scan.id } }),
      prisma.shopCompetitorObservation.count({ where: { scanId: scan.id } }),
      prisma.shopSiteFeatureObservation.count({ where: { scanId: scan.id } }),
      prisma.shopReviewObservation.count({ where: { scanId: scan.id } }),
      prisma.shopSerpObservation.count({ where: { scanId: scan.id } }),
      prisma.shopConversionObservation.count({ where: { scanId: scan.id } })
    ]);

    const keywords = parseJson<MoneyKeyword[]>(scan.moneyKeywordsJson, []);
    const competitors = parseJson<Competitor[]>(scan.competitorsJson, []);
    const raw = parseJson<RawReportPayload>(scan.rawChecksJson, {});

    if (keywordCount === 0 && keywords.length > 0) {
      await recordKeywordObservations({
        shopId: scan.shopId,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: scan.city,
        keywords
      });
      keywordsBackfilled += keywords.length;
    }

    if (competitorCount === 0 && competitors.length > 0) {
      await recordCompetitorObservations({
        sourceShopId: scan.shopId,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: scan.city,
        state: scan.organization?.state || null,
        vertical: scan.vertical,
        competitors
      });
      competitorsBackfilled += competitors.length;
    }

    if (siteFeatureCount === 0 && raw.checks) {
      await recordSiteFeatureObservation({
        shopId: scan.shopId,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: scan.city,
        state: scan.organization?.state || null,
        vertical: scan.vertical,
        checks: raw.checks,
        missingPages: raw.missingPages || []
      });
      siteFeaturesBackfilled += 1;
    }

    if (reviewCount === 0 && raw.googlePlace?.placeId) {
      await recordReviewObservation({
        shopId: scan.shopId,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: scan.city,
        state: scan.organization?.state || null,
        vertical: scan.vertical,
        profile: raw.googlePlace
      });
      reviewsBackfilled += 1;
    }

    if (serpCount === 0 && raw.mapPack?.queries?.length) {
      await recordSerpObservations({
        shopId: scan.shopId,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: scan.city,
        state: scan.organization?.state || null,
        vertical: scan.vertical,
        mapPack: raw.mapPack
      });
      serpBackfilled += raw.mapPack.queries.length;
    }

    if (conversionCount === 0) {
      await recordConversionObservation({
        shopId: scan.shopId,
        organizationId: null,
        scanId: scan.id,
        observedAt: scan.createdAt,
        city: scan.city,
        state: scan.organization?.state || null,
        vertical: scan.vertical,
        eventType: 'scan_completed',
        source: 'historical_backfill'
      });
      conversionsBackfilled += 1;

      if (scan.email) {
        await recordConversionObservation({
          shopId: scan.shopId,
          scanId: scan.id,
          observedAt: scan.createdAt,
          city: scan.city,
          state: scan.organization?.state || null,
          vertical: scan.vertical,
          eventType: 'report_email_captured',
          source: 'historical_backfill'
        });
        conversionsBackfilled += 1;
      }

      if (scan.bookedClicked) {
        await recordConversionObservation({
          shopId: scan.shopId,
          scanId: scan.id,
          observedAt: scan.createdAt,
          city: scan.city,
          state: scan.organization?.state || null,
          vertical: scan.vertical,
          eventType: 'call_book_clicked',
          source: 'historical_backfill'
        });
        conversionsBackfilled += 1;
      }

      if (scan.leads[0]?.id) {
        await recordConversionObservation({
          shopId: scan.shopId,
          scanId: scan.id,
          leadId: scan.leads[0].id,
          observedAt: scan.createdAt,
          city: scan.city,
          state: scan.organization?.state || null,
          vertical: scan.vertical,
          eventType: 'lead_submitted',
          source: 'historical_backfill'
        });
        conversionsBackfilled += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        scansConsidered: scans.length,
        keywordsBackfilled,
        competitorsBackfilled,
        siteFeaturesBackfilled,
        reviewsBackfilled,
        serpBackfilled,
        conversionsBackfilled
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
