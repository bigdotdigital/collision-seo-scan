import { NextResponse } from 'next/server';
import { adminCookieMatches } from '@/lib/admin-auth';
import { parseJson } from '@/lib/json';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!adminCookieMatches()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city')?.trim() || undefined;
  const state = searchParams.get('state')?.trim().toUpperCase() || undefined;
  const marketId = searchParams.get('marketId')?.trim() || undefined;
  const format = searchParams.get('format')?.trim().toLowerCase() || 'json';
  const take = Math.min(Math.max(Number(searchParams.get('take') || 12), 1), 50);

  const snapshots = await prisma.benchmarkSnapshot.findMany({
    where: {
      market: {
        id: marketId || undefined,
        city: city || undefined,
        state: state || undefined
      }
    },
    orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }],
    take,
    include: {
      market: {
        select: {
          id: true,
          city: true,
          state: true,
          vertical: true,
          regionKey: true
        }
      }
    }
  });

  const basePayload = {
    ok: true,
    count: snapshots.length,
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      observedAt: snapshot.observedAt,
      snapshotType: snapshot.snapshotType,
      vertical: snapshot.vertical,
      shopCount: snapshot.shopCount,
      scanCount: snapshot.scanCount,
      avgOverallScore: snapshot.avgOverallScore,
      avgWebsiteScore: snapshot.avgWebsiteScore,
      avgLocalScore: snapshot.avgLocalScore,
      avgIntentScore: snapshot.avgIntentScore,
      avgReviewCount: snapshot.avgReviewCount,
      avgReviewRating: snapshot.avgReviewRating,
      featureRates: parseJson(snapshot.featureRatesJson, {}),
      keywordHighlights: parseJson(snapshot.keywordHighlightsJson, []),
      competitorStats: parseJson(snapshot.competitorStatsJson, {}),
      market: snapshot.market
    }))
  };

  if (format === 'csv') {
    const header = [
      'observedAt',
      'regionKey',
      'city',
      'state',
      'vertical',
      'shopCount',
      'scanCount',
      'avgOverallScore',
      'avgWebsiteScore',
      'avgLocalScore',
      'avgIntentScore',
      'avgReviewCount',
      'avgReviewRating'
    ];

    const rows = snapshots.map((snapshot) => [
      snapshot.observedAt.toISOString(),
      snapshot.market.regionKey,
      snapshot.market.city,
      snapshot.market.state || '',
      snapshot.market.vertical,
      String(snapshot.shopCount),
      String(snapshot.scanCount),
      snapshot.avgOverallScore?.toFixed(2) || '',
      snapshot.avgWebsiteScore?.toFixed(2) || '',
      snapshot.avgLocalScore?.toFixed(2) || '',
      snapshot.avgIntentScore?.toFixed(2) || '',
      snapshot.avgReviewCount?.toFixed(2) || '',
      snapshot.avgReviewRating?.toFixed(2) || ''
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="benchmark-report.csv"'
      }
    });
  }

  const marketDrilldown = marketId
    ? await prisma.market.findUnique({
        where: { id: marketId },
        include: {
          shops: {
            orderBy: { updatedAt: 'desc' },
            take: 25,
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              websiteUrl: true,
              updatedAt: true,
              _count: {
                select: {
                  scans: true,
                  organizations: true,
                  trackedAsCompetitor: true
                }
              }
            }
          }
        }
      })
    : null;

  return NextResponse.json({
    ...basePayload,
    ...(marketDrilldown
      ? {
          market: {
            id: marketDrilldown.id,
            city: marketDrilldown.city,
            state: marketDrilldown.state,
            vertical: marketDrilldown.vertical,
            regionKey: marketDrilldown.regionKey
          },
          shops: marketDrilldown.shops
        }
      : {})
  });
}
