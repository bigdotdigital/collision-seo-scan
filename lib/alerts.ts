import { prisma } from '@/lib/prisma';

function toDayStart(value: Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

type SnapshotRow = {
  keywordId: string;
  competitorId: string | null;
  rankPosition: number | null;
  snapshotDate: Date;
};

function indexRows(rows: SnapshotRow[]) {
  const map = new Map<string, SnapshotRow>();
  for (const row of rows) {
    map.set(`${row.keywordId}:${row.competitorId || 'shop'}`, row);
  }
  return map;
}

export async function generateAlertsForOrg(orgId: string) {
  const pref = await prisma.alertPreference.findUnique({
    where: { orgId }
  });
  if (!pref) return { ok: false as const, reason: 'no_preferences' as const };

  const latest = await prisma.keywordRankSnapshot.findFirst({
    where: { orgId },
    orderBy: { snapshotDate: 'desc' },
    select: { snapshotDate: true, locationId: true }
  });
  if (!latest) return { ok: false as const, reason: 'no_snapshots' as const };

  const currentRows = await prisma.keywordRankSnapshot.findMany({
    where: { orgId, snapshotDate: latest.snapshotDate }
  });
  const previousSnapshot = await prisma.keywordRankSnapshot.findFirst({
    where: { orgId, snapshotDate: { lt: latest.snapshotDate } },
    orderBy: { snapshotDate: 'desc' },
    select: { snapshotDate: true }
  });
  const previousRows = previousSnapshot
    ? await prisma.keywordRankSnapshot.findMany({
        where: { orgId, snapshotDate: previousSnapshot.snapshotDate }
      })
    : [];

  const currentMap = indexRows(currentRows);
  const previousMap = indexRows(previousRows);

  const existing = await prisma.alert.findMany({
    where: {
      orgId,
      createdAt: { gte: toDayStart(latest.snapshotDate) }
    },
    select: { payloadJson: true, type: true }
  });
  const existingKeys = new Set(existing.map((row) => `${row.type}:${row.payloadJson}`));

  let created = 0;

  for (const row of currentRows) {
    if (row.competitorId !== null) continue;
    const key = `${row.keywordId}:shop`;
    const previous = previousMap.get(key)?.rankPosition;
    if (typeof previous !== 'number' || typeof row.rankPosition !== 'number') continue;
    const delta = previous - row.rankPosition;

    if (delta <= -Math.abs(pref.rankDropThreshold)) {
      const payload = JSON.stringify({
        keywordId: row.keywordId,
        previous,
        current: row.rankPosition,
        snapshotDate: row.snapshotDate.toISOString()
      });
      const hash = `rank_drop:${payload}`;
      if (!existingKeys.has(hash)) {
        await prisma.alert.create({
          data: {
            orgId,
            locationId: row.locationId,
            type: 'rank_drop',
            severity: row.rankPosition > 10 ? 'critical' : 'warning',
            payloadJson: payload
          }
        });
        existingKeys.add(hash);
        created += 1;
      }
    }

    if (delta >= Math.abs(pref.rankGainThreshold)) {
      const payload = JSON.stringify({
        keywordId: row.keywordId,
        previous,
        current: row.rankPosition,
        snapshotDate: row.snapshotDate.toISOString()
      });
      const hash = `rank_gain:${payload}`;
      if (!existingKeys.has(hash)) {
        await prisma.alert.create({
          data: {
            orgId,
            locationId: row.locationId,
            type: 'rank_gain',
            severity: 'info',
            payloadJson: payload
          }
        });
        existingKeys.add(hash);
        created += 1;
      }
    }
  }

  if (pref.competitorMoveEnabled) {
    const competitorRows = currentRows.filter((row) => row.competitorId !== null);
    for (const comp of competitorRows) {
      const currentShop = currentMap.get(`${comp.keywordId}:shop`);
      if (!currentShop || currentShop.rankPosition === null || comp.rankPosition === null) continue;

      const prevShop = previousMap.get(`${comp.keywordId}:shop`)?.rankPosition;
      const prevComp = previousMap.get(`${comp.keywordId}:${comp.competitorId}`)?.rankPosition;
      if (typeof prevShop !== 'number' || typeof prevComp !== 'number') continue;

      const movedAbove = prevComp > prevShop && comp.rankPosition <= currentShop.rankPosition;
      if (!movedAbove) continue;

      const payload = JSON.stringify({
        keywordId: comp.keywordId,
        competitorId: comp.competitorId,
        previousShop: prevShop,
        previousCompetitor: prevComp,
        currentShop: currentShop.rankPosition,
        currentCompetitor: comp.rankPosition,
        snapshotDate: comp.snapshotDate.toISOString()
      });
      const hash = `competitor_moved_above:${payload}`;
      if (existingKeys.has(hash)) continue;

      await prisma.alert.create({
        data: {
          orgId,
          locationId: comp.locationId,
          type: 'competitor_moved_above',
          severity: 'warning',
          payloadJson: payload
        }
      });
      existingKeys.add(hash);
      created += 1;
    }
  }

  if (pref.newCompetitorEnabled) {
    const currentCompetitors = currentRows.filter((row) => row.competitorId !== null);
    for (const comp of currentCompetitors) {
      const previous = previousMap.get(`${comp.keywordId}:${comp.competitorId}`)?.rankPosition;
      if (previous !== undefined) continue;
      if (comp.rankPosition === null) continue;

      const payload = JSON.stringify({
        keywordId: comp.keywordId,
        competitorId: comp.competitorId,
        currentCompetitor: comp.rankPosition,
        snapshotDate: comp.snapshotDate.toISOString()
      });
      const hash = `new_competitor:${payload}`;
      if (existingKeys.has(hash)) continue;

      await prisma.alert.create({
        data: {
          orgId,
          locationId: comp.locationId,
          type: 'new_competitor',
          severity: 'info',
          payloadJson: payload
        }
      });
      existingKeys.add(hash);
      created += 1;
    }
  }

  return {
    ok: true as const,
    orgId,
    snapshotDate: latest.snapshotDate,
    created
  };
}

