import { prisma } from '@/lib/prisma';
import { createMetricSnapshot } from '@/lib/client-services';
import { sendFollowupEmail } from '@/lib/email';
import { parseJson } from '@/lib/json';
import { collectRankSnapshotsForOrg } from '@/lib/rank-snapshot-engine';
import { generateAlertsForOrg } from '@/lib/alerts';

function startOfUtcDay(input = new Date()) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function average(values: Array<number | null | undefined>) {
  const usable = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (usable.length === 0) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

export async function processFollowupQueue(baseUrl: string) {
  const dueJobs = await prisma.queueJob.findMany({
    where: {
      status: 'pending',
      type: 'followup_email',
      runAt: { lte: new Date() }
    },
    orderBy: { runAt: 'asc' },
    take: 50
  });

  let processed = 0;

  for (const job of dueJobs) {
    processed += 1;
    try {
      await prisma.queueJob.update({
        where: { id: job.id },
        data: { status: 'processing', attempts: { increment: 1 } }
      });

      const scan = job.scanId
        ? await prisma.scan.findUnique({ where: { id: job.scanId } })
        : null;

      if (!scan || !scan.email || scan.bookedClicked || scan.followupSent) {
        await prisma.queueJob.update({
          where: { id: job.id },
          data: {
            status: 'done',
            processedAt: new Date(),
            error: 'Skipped (missing email / already booked / already sent)'
          }
        });
        continue;
      }

      const payload = parseJson<{ reportUrl?: string } | null>(job.payloadJson, null);
      const reportUrl = payload?.reportUrl || `${baseUrl}/report/${scan.id}`;

      await sendFollowupEmail({
        to: scan.email,
        shopName: scan.shopName,
        reportUrl
      });

      await prisma.scan.update({
        where: { id: scan.id },
        data: { followupSent: true }
      });

      await prisma.queueJob.update({
        where: { id: job.id },
        data: {
          status: 'done',
          processedAt: new Date(),
          error: null
        }
      });
    } catch (error) {
      await prisma.queueJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown failure',
          processedAt: new Date()
        }
      });
    }
  }

  return { processed };
}

export async function runWeeklyRefresh() {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  let snapshotsCreated = 0;

  for (const client of clients) {
    const created = await createMetricSnapshot(client.id);
    if (created) snapshotsCreated += 1;
  }

  return { clients: clients.length, snapshotsCreated };
}

export async function runRankSnapshotCollect() {
  const orgs = await prisma.organization.findMany({
    where: { locations: { some: {} }, trackedKeywords: { some: { isActive: true } } },
    select: { id: true }
  });

  let processed = 0;
  let inserted = 0;
  const skipped: string[] = [];

  for (const org of orgs) {
    const result = await collectRankSnapshotsForOrg({ orgId: org.id });
    if (!result.ok) {
      skipped.push(`${org.id}:${result.reason}`);
      continue;
    }
    processed += 1;
    inserted += result.inserted;
  }

  return { organizations: orgs.length, processed, inserted, skipped };
}

export async function runAlertGeneration() {
  const orgs = await prisma.organization.findMany({
    where: { rankSnapshots: { some: {} } },
    select: { id: true }
  });

  let processed = 0;
  let alertsCreated = 0;
  const skipped: string[] = [];

  for (const org of orgs) {
    const result = await generateAlertsForOrg(org.id);
    if (!result.ok) {
      skipped.push(`${org.id}:${result.reason}`);
      continue;
    }
    processed += 1;
    alertsCreated += result.created;
  }

  return { organizations: orgs.length, processed, alertsCreated, skipped };
}

export async function runAlertDigestSend() {
  const prefs = await prisma.alertPreference.findMany({
    where: {
      digestFrequency: { not: 'off' }
    },
    select: {
      orgId: true,
      digestEmail: true
    }
  });

  let processed = 0;
  let alertsMarked = 0;

  for (const pref of prefs) {
    if (!pref.digestEmail) continue;

    const pending = await prisma.alert.findMany({
      where: {
        orgId: pref.orgId,
        digestSentAt: null
      },
      take: 200,
      orderBy: { createdAt: 'asc' }
    });

    if (pending.length === 0) continue;

    await prisma.alert.updateMany({
      where: {
        id: { in: pending.map((row) => row.id) }
      },
      data: {
        digestSentAt: new Date()
      }
    });

    processed += 1;
    alertsMarked += pending.length;
  }

  return { organizationsProcessed: processed, alertsMarked };
}

export async function runMarketBenchmarkRollup(args?: { sinceDays?: number }) {
  const sinceDays = Math.max(30, Math.min(args?.sinceDays || 90, 365));
  const observedAt = startOfUtcDay();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);

  const markets = await prisma.market.findMany({
    where: {
      OR: [
        { siteFeatureObservations: { some: { observedAt: { gte: since } } } },
        { shops: { some: { scans: { some: { createdAt: { gte: since } } } } } }
      ]
    },
    select: {
      id: true,
      city: true,
      state: true,
      vertical: true
    }
  });

  let processed = 0;
  let upserted = 0;
  const skipped: string[] = [];

  for (const market of markets) {
    const [featureRows, recentScans, recentSnapshots, keywordRows, competitorRows, reviewRows, rankRows, serpRows, conversionRows] = await Promise.all([
      prisma.shopSiteFeatureObservation.findMany({
        where: {
          marketId: market.id,
          observedAt: { gte: since }
        },
        orderBy: { observedAt: 'desc' }
      }),
      prisma.scan.findMany({
        where: {
          shop: { marketId: market.id },
          createdAt: { gte: since }
        },
        select: {
          id: true,
          shopId: true,
          scoreTotal: true,
          scoreWebsite: true,
          scoreLocal: true,
          scoreIntent: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.scanSnapshot.findMany({
        where: {
          organization: { shop: { marketId: market.id } },
          createdAt: { gte: since }
        },
        select: {
          scanId: true,
          reviewCount: true,
          reviewRating: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.shopKeywordObservation.findMany({
        where: {
          shop: { marketId: market.id },
          observedAt: { gte: since }
        },
        select: {
          keyword: true,
          searchVolume: true,
          rankPosition: true,
          observedAt: true,
          shopId: true
        },
        orderBy: { observedAt: 'desc' },
        take: 300
      }),
      prisma.shopCompetitorObservation.findMany({
        where: {
          sourceShop: { marketId: market.id },
          observedAt: { gte: since }
        },
        select: {
          competitorShopId: true,
          sourceShopId: true
        }
      }),
      prisma.shopReviewObservation.findMany({
        where: {
          marketId: market.id,
          observedAt: { gte: since }
        },
        select: {
          shopId: true,
          rating: true,
          reviewCount: true,
          observedAt: true
        },
        orderBy: { observedAt: 'desc' }
      }),
      prisma.shopRankObservation.findMany({
        where: {
          marketId: market.id,
          observedAt: { gte: since }
        },
        select: {
          shopId: true,
          keyword: true,
          rankPosition: true,
          observedAt: true
        },
        orderBy: { observedAt: 'desc' },
        take: 500
      }),
      prisma.shopSerpObservation.findMany({
        where: {
          marketId: market.id,
          observedAt: { gte: since }
        },
        select: {
          shopId: true,
          query: true,
          yourRankPosition: true,
          observedAt: true
        },
        orderBy: { observedAt: 'desc' },
        take: 500
      }),
      prisma.shopConversionObservation.findMany({
        where: {
          marketId: market.id,
          observedAt: { gte: since }
        },
        select: {
          shopId: true,
          eventType: true,
          observedAt: true
        },
        orderBy: { observedAt: 'desc' }
      })
    ]);

    const latestFeatureByShop = new Map<string, (typeof featureRows)[number]>();
    for (const row of featureRows) {
      if (!latestFeatureByShop.has(row.shopId)) latestFeatureByShop.set(row.shopId, row);
    }

    const latestScanByShop = new Map<string, (typeof recentScans)[number]>();
    for (const row of recentScans) {
      if (row.shopId && !latestScanByShop.has(row.shopId)) latestScanByShop.set(row.shopId, row);
    }

    const latestSnapshotByScan = new Map<string, (typeof recentSnapshots)[number]>();
    for (const row of recentSnapshots) {
      if (!latestSnapshotByScan.has(row.scanId)) latestSnapshotByScan.set(row.scanId, row);
    }

    const latestReviewByShop = new Map<string, (typeof reviewRows)[number]>();
    for (const row of reviewRows) {
      if (!latestReviewByShop.has(row.shopId)) latestReviewByShop.set(row.shopId, row);
    }

    const latestSerpByShopQuery = new Map<string, (typeof serpRows)[number]>();
    for (const row of serpRows) {
      const key = `${row.shopId}:${row.query}`;
      if (!latestSerpByShopQuery.has(key)) latestSerpByShopQuery.set(key, row);
    }

    const latestFeatures = [...latestFeatureByShop.values()];
    const latestScans = [...latestScanByShop.values()];
    const latestReviews = [...latestReviewByShop.values()];
    const latestSerp = [...latestSerpByShopQuery.values()];
    const shopCount = new Set([
      ...latestFeatures.map((row) => row.shopId),
      ...latestScans.map((row) => row.shopId).filter(Boolean)
    ]).size;

    if (shopCount === 0) {
      skipped.push(`${market.city}, ${market.state || 'NA'}:no_shops`);
      continue;
    }

    const featureRate = (predicate: (row: (typeof latestFeatures)[number]) => boolean) =>
      latestFeatures.length > 0
        ? Number((latestFeatures.filter(predicate).length / latestFeatures.length).toFixed(4))
        : null;

    const keywordCounts = new Map<string, { count: number; totalVolume: number; bestRank: number | null }>();
    for (const row of keywordRows) {
      const current = keywordCounts.get(row.keyword) || { count: 0, totalVolume: 0, bestRank: null };
      current.count += 1;
      current.totalVolume += row.searchVolume || 0;
      current.bestRank =
        typeof row.rankPosition === 'number'
          ? current.bestRank === null
            ? row.rankPosition
            : Math.min(current.bestRank, row.rankPosition)
          : current.bestRank;
      keywordCounts.set(row.keyword, current);
    }

    for (const row of rankRows) {
      const current = keywordCounts.get(row.keyword) || { count: 0, totalVolume: 0, bestRank: null };
      current.count += 1;
      current.bestRank =
        typeof row.rankPosition === 'number'
          ? current.bestRank === null
            ? row.rankPosition
            : Math.min(current.bestRank, row.rankPosition)
          : current.bestRank;
      keywordCounts.set(row.keyword, current);
    }

    const keywordHighlights = [...keywordCounts.entries()]
      .sort((a, b) => {
        const volumeDiff = b[1].totalVolume - a[1].totalVolume;
        if (volumeDiff !== 0) return volumeDiff;
        return b[1].count - a[1].count;
      })
      .slice(0, 8)
      .map(([keyword, stats]) => ({
        keyword,
        observedShops: stats.count,
        totalVolume: stats.totalVolume,
        bestRank: stats.bestRank
      }));

    const competitorPairs = new Set(
      competitorRows.map((row) => `${row.sourceShopId}:${row.competitorShopId}`)
    );

    const featureRates = {
      estimateCtaRate: featureRate((row) => row.hasEstimateCta),
      onlineEstimateRate: featureRate((row) => row.hasOnlineEstimateFlow),
      reviewProofRate: featureRate((row) => row.hasReviewProof),
      reviewSchemaRate: featureRate((row) => row.hasReviewSchema),
      mapEmbedRate: featureRate((row) => row.hasMapEmbed),
      directionsCtaRate: featureRate((row) => row.hasDirectionsCta),
      locationFinderRate: featureRate((row) => row.hasLocationFinder),
      insuranceGuidanceRate: featureRate((row) => row.hasInsuranceGuidance),
      warrantyRate: featureRate((row) => row.hasWarranty),
      adasContentRate: featureRate((row) => row.hasAdasContent),
      certificationPageRate: featureRate((row) => row.hasCertificationPage),
      avgOemSignalCount: average(latestFeatures.map((row) => row.oemSignalCount)),
      avgCheckedUrls: average(latestFeatures.map((row) => row.checkedUrlCount)),
      avgServicePageCount: average(latestFeatures.map((row) => row.servicePageCount)),
      mapPackTop3Rate:
        latestSerp.length > 0
          ? Number(
              (
                latestSerp.filter(
                  (row) => typeof row.yourRankPosition === 'number' && row.yourRankPosition <= 3
                ).length / latestSerp.length
              ).toFixed(4)
            )
          : null,
      mapPackObservedRate:
        latestSerp.length > 0
          ? Number(
              (
                latestSerp.filter((row) => typeof row.yourRankPosition === 'number').length /
                latestSerp.length
              ).toFixed(4)
            )
          : null
    };

    const snapshotReviewRows = latestScans
      .map((scan) => latestSnapshotByScan.get(scan.id))
      .filter(Boolean);

    const conversionStats = {
      totalEvents: conversionRows.length,
      scansCompleted: conversionRows.filter((row) => row.eventType === 'scan_completed').length,
      leadsSubmitted: conversionRows.filter((row) => row.eventType === 'lead_submitted').length,
      reportEmailsCaptured: conversionRows.filter((row) => row.eventType === 'report_email_captured').length,
      callsBookedClicks: conversionRows.filter((row) => row.eventType === 'call_book_clicked').length
    };

    await prisma.benchmarkSnapshot.upsert({
      where: {
        marketId_snapshotType_observedAt: {
          marketId: market.id,
          snapshotType: 'city_market',
          observedAt
        }
      },
      create: {
        marketId: market.id,
        observedAt,
        snapshotType: 'city_market',
        source: 'aggregated',
        vertical: market.vertical,
        shopCount,
        scanCount: recentScans.length,
        avgOverallScore: average(latestScans.map((row) => row.scoreTotal)),
        avgWebsiteScore: average(latestScans.map((row) => row.scoreWebsite)),
        avgLocalScore: average(latestScans.map((row) => row.scoreLocal)),
        avgIntentScore: average(latestScans.map((row) => row.scoreIntent)),
        avgReviewCount: average(
          latestReviews.length > 0
            ? latestReviews.map((row) => row.reviewCount)
            : snapshotReviewRows.map((row) => row?.reviewCount)
        ),
        avgReviewRating: average(
          latestReviews.length > 0
            ? latestReviews.map((row) => row.rating)
            : snapshotReviewRows.map((row) => row?.reviewRating)
        ),
        featureRatesJson: JSON.stringify(featureRates),
        keywordHighlightsJson: JSON.stringify(keywordHighlights),
        competitorStatsJson: JSON.stringify({
          uniqueCompetitorPairs: competitorPairs.size,
          uniqueObservedCompetitors: new Set(competitorRows.map((row) => row.competitorShopId)).size,
          conversions: conversionStats
        })
      },
      update: {
        source: 'aggregated',
        vertical: market.vertical,
        shopCount,
        scanCount: recentScans.length,
        avgOverallScore: average(latestScans.map((row) => row.scoreTotal)),
        avgWebsiteScore: average(latestScans.map((row) => row.scoreWebsite)),
        avgLocalScore: average(latestScans.map((row) => row.scoreLocal)),
        avgIntentScore: average(latestScans.map((row) => row.scoreIntent)),
        avgReviewCount: average(
          latestReviews.length > 0
            ? latestReviews.map((row) => row.reviewCount)
            : snapshotReviewRows.map((row) => row?.reviewCount)
        ),
        avgReviewRating: average(
          latestReviews.length > 0
            ? latestReviews.map((row) => row.rating)
            : snapshotReviewRows.map((row) => row?.reviewRating)
        ),
        featureRatesJson: JSON.stringify(featureRates),
        keywordHighlightsJson: JSON.stringify(keywordHighlights),
        competitorStatsJson: JSON.stringify({
          uniqueCompetitorPairs: competitorPairs.size,
          uniqueObservedCompetitors: new Set(competitorRows.map((row) => row.competitorShopId)).size,
          conversions: conversionStats
        })
      }
    });

    processed += 1;
    upserted += 1;
  }

  return { markets: markets.length, processed, upserted, skipped, sinceDays };
}
