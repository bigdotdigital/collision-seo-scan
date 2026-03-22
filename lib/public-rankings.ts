import { prisma } from '@/lib/prisma';
import { hostnameOf } from '@/lib/shop-core';

const DENVER_METRO_CITIES = [
  'Denver',
  'Aurora',
  'Lakewood',
  'Littleton',
  'Englewood',
  'Arvada',
  'Westminster',
  'Thornton',
  'Centennial',
  'Broomfield'
] as const;

type RankingRow = {
  shopId: string;
  name: string;
  city: string;
  websiteUrl: string | null;
  websiteHost: string;
  reviews: number;
  scoreTotal: number;
  scoreWebsite: number;
  scoreLocal: number;
  scoreIntent: number;
  oemSignalCount: number;
  hasEstimateFlow: boolean;
  hasReviewProof: boolean;
  hasMapEmbed: boolean;
  finishedAt: Date;
};

export type DenverCollisionRankings = {
  updatedAt: Date | null;
  totals: {
    shopsAnalyzed: number;
    shopsWithPublishedScans: number;
    shopsWithWebsites: number;
    averageScore: number;
  };
  highlights: {
    topTenAverageScore: number;
    topTenEstimateFlowPct: number;
    topTenOemAvg: number;
    marketEstimateFlowPct: number;
  };
  rankings: RankingRow[];
};

function readableHostLabel(host: string) {
  const base = host
    .replace(/\.(com|net|org|co|io|biz|shop)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return base
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function cleanShopName(name: string, websiteUrl?: string | null) {
  const trimmed = (name || '').trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) return trimmed;
  const host = hostnameOf(websiteUrl);
  return host ? readableHostLabel(host) : 'Unnamed Shop';
}

export async function getDenverCollisionRankings(): Promise<DenverCollisionRankings> {
  const shops = await prisma.shop.findMany({
    where: {
      city: { in: [...DENVER_METRO_CITIES] },
      verticalDefault: 'collision'
    },
    select: {
      id: true,
      name: true,
      city: true,
      websiteUrl: true,
      digitalPresenceSnapshot: {
        select: {
          googleReviewCount: true,
          hasWebsite: true
        }
      },
      scans: {
        where: {
          executionStatus: 'completed',
          publicStatus: 'published'
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 1,
        select: {
          createdAt: true,
          finishedAt: true,
          scoreTotal: true,
          scoreWebsite: true,
          scoreLocal: true,
          scoreIntent: true
        }
      },
      siteFeatureObservations: {
        orderBy: [{ observedAt: 'desc' }],
        take: 1,
        select: {
          oemSignalCount: true,
          hasOnlineEstimateFlow: true,
          hasReviewProof: true,
          hasMapEmbed: true
        }
      }
    }
  });

  const rankings = shops
    .map((shop) => {
      const latestScan = shop.scans[0];
      if (!latestScan) return null;
      const latestFeatures = shop.siteFeatureObservations[0];
      const websiteHost = hostnameOf(shop.websiteUrl);
      return {
        shopId: shop.id,
        name: cleanShopName(shop.name, shop.websiteUrl),
        city: shop.city || 'Denver',
        websiteUrl: shop.websiteUrl,
        websiteHost,
        reviews: shop.digitalPresenceSnapshot?.googleReviewCount || 0,
        scoreTotal: latestScan.scoreTotal,
        scoreWebsite: latestScan.scoreWebsite,
        scoreLocal: latestScan.scoreLocal,
        scoreIntent: latestScan.scoreIntent,
        oemSignalCount: latestFeatures?.oemSignalCount || 0,
        hasEstimateFlow: latestFeatures?.hasOnlineEstimateFlow || false,
        hasReviewProof: latestFeatures?.hasReviewProof || false,
        hasMapEmbed: latestFeatures?.hasMapEmbed || false,
        finishedAt: latestScan.finishedAt || latestScan.createdAt
      };
    })
    .filter((row): row is RankingRow => Boolean(row))
    .sort((a, b) => {
      const scoreDelta = b.scoreTotal - a.scoreTotal;
      if (scoreDelta !== 0) return scoreDelta;
      const reviewDelta = b.reviews - a.reviews;
      if (reviewDelta !== 0) return reviewDelta;
      return (b.finishedAt?.getTime() || 0) - (a.finishedAt?.getTime() || 0);
    });

  const topTen = rankings.slice(0, 10);
  const estimateFlowCount = rankings.filter((row) => row.hasEstimateFlow).length;
  const latestUpdated = rankings
    .map((row) => row.finishedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;

  return {
    updatedAt: latestUpdated,
    totals: {
      shopsAnalyzed: shops.length,
      shopsWithPublishedScans: rankings.length,
      shopsWithWebsites: shops.filter((shop) => Boolean(shop.websiteUrl || shop.digitalPresenceSnapshot?.hasWebsite)).length,
      averageScore: Math.round(
        rankings.reduce((sum, row) => sum + row.scoreTotal, 0) / Math.max(rankings.length, 1)
      )
    },
    highlights: {
      topTenAverageScore: Math.round(topTen.reduce((sum, row) => sum + row.scoreTotal, 0) / Math.max(topTen.length, 1)),
      topTenEstimateFlowPct: Math.round((topTen.filter((row) => row.hasEstimateFlow).length / Math.max(topTen.length, 1)) * 100),
      topTenOemAvg: Number(
        (topTen.reduce((sum, row) => sum + row.oemSignalCount, 0) / Math.max(topTen.length, 1)).toFixed(1)
      ),
      marketEstimateFlowPct: Math.round((estimateFlowCount / Math.max(rankings.length, 1)) * 100)
    },
    rankings
  };
}
