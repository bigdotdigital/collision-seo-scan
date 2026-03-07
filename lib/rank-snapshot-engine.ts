import { prisma } from '@/lib/prisma';
import type { RankProvider } from '@/lib/rank-providers/provider';
import { StubRankProvider } from '@/lib/rank-providers/stub-provider';

export async function collectRankSnapshotsForOrg(args: {
  orgId: string;
  provider?: RankProvider;
  snapshotDate?: Date;
}) {
  const location = await prisma.location.findFirst({
    where: { orgId: args.orgId, isPrimary: true }
  });
  if (!location) return { ok: false as const, reason: 'no_primary_location' as const };

  const [keywords, competitors] = await Promise.all([
    prisma.trackedKeyword.findMany({
      where: { orgId: args.orgId, locationId: location.id, isActive: true },
      select: { id: true, term: true }
    }),
    prisma.trackedCompetitor.findMany({
      where: { orgId: args.orgId, locationId: location.id, isActive: true },
      select: { id: true, name: true }
    })
  ]);

  if (keywords.length === 0) {
    return { ok: false as const, reason: 'no_keywords' as const, orgId: args.orgId };
  }

  const provider = args.provider || new StubRankProvider();
  const result = await provider.getKeywordRanks({
    location: { city: location.city, state: location.state },
    keywords,
    competitors
  });

  const snapshotDate = args.snapshotDate || result.collectedAt;

  const previousRows = await prisma.keywordRankSnapshot.findMany({
    where: { orgId: args.orgId, locationId: location.id },
    orderBy: { snapshotDate: 'desc' },
    take: 1500
  });

  const previousByKey = new Map<string, number | null>();
  for (const row of previousRows) {
    const key = `${row.keywordId}:${row.competitorId || 'shop'}`;
    if (previousByKey.has(key)) continue;
    previousByKey.set(key, row.rankPosition);
  }

  const rowsToInsert = result.rows.map((row) => {
    const baselineKey = `${row.keywordId}:${row.competitorId || 'shop'}`;
    const previous = previousByKey.get(baselineKey);
    const delta =
      typeof previous === 'number' && typeof row.rankPosition === 'number'
        ? previous - row.rankPosition
        : null;

    return {
      orgId: args.orgId,
      locationId: location.id,
      keywordId: row.keywordId,
      competitorId: row.competitorId || null,
      snapshotDate,
      rankPosition: row.rankPosition,
      delta,
      source: result.source,
      rawJson: JSON.stringify({
        keyword: row.keyword,
        competitorName: row.competitorName || null,
        source: result.source
      })
    };
  });

  const createResult = await prisma.keywordRankSnapshot.createMany({
    data: rowsToInsert,
    skipDuplicates: true
  });

  return {
    ok: true as const,
    orgId: args.orgId,
    locationId: location.id,
    source: result.source,
    inserted: createResult.count
  };
}
