import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';
import type { MapPackResult } from '@/lib/types';
import { resolveCompetitorShop } from '@/lib/shop-data';

function startOfUtcDay(input: Date) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function edgeKey(args: {
  sourceShopId: string;
  targetShopId: string;
  edgeType: string;
  observedDay: Date;
  scanId?: string | null;
}) {
  return [
    args.sourceShopId,
    args.targetShopId,
    args.edgeType,
    args.observedDay.toISOString(),
    args.scanId || 'none'
  ].join(':');
}

async function upsertShopGraphEdge(args: {
  sourceShopId: string;
  targetShopId: string;
  edgeType: string;
  observedAt: Date;
  scanId?: string | null;
  strength?: number | null;
  metadata?: unknown;
}) {
  if (args.sourceShopId === args.targetShopId) return null;

  const observedDay = startOfUtcDay(args.observedAt);
  const key = edgeKey({
    sourceShopId: args.sourceShopId,
    targetShopId: args.targetShopId,
    edgeType: args.edgeType,
    observedDay,
    scanId: args.scanId || null
  });

  return prisma.shopGraphEdge.upsert({
    where: { edgeKey: key },
    update: {
      observedAt: args.observedAt,
      strength: args.strength ?? undefined,
      metadataJson: args.metadata ? toJson(args.metadata) : undefined,
      scanId: args.scanId || undefined
    },
    create: {
      edgeKey: key,
      sourceShopId: args.sourceShopId,
      targetShopId: args.targetShopId,
      edgeType: args.edgeType,
      observedAt: args.observedAt,
      observedDay,
      scanId: args.scanId || undefined,
      strength: args.strength ?? undefined,
      metadataJson: args.metadata ? toJson(args.metadata) : undefined
    }
  });
}

export async function recordTrackedCompetitorEdgesForOrg(args: { orgId: string; observedAt?: Date }) {
  const observedAt = args.observedAt || new Date();
  const organization = await prisma.organization.findUnique({
    where: { id: args.orgId },
    select: { shopId: true }
  });
  if (!organization?.shopId) return { count: 0 };

  const competitors = await prisma.trackedCompetitor.findMany({
    where: { orgId: args.orgId, isActive: true, shopId: { not: null } },
    select: { shopId: true, name: true, websiteUrl: true, source: true }
  });

  let count = 0;
  for (const competitor of competitors) {
    if (!competitor.shopId) continue;
    await upsertShopGraphEdge({
      sourceShopId: organization.shopId,
      targetShopId: competitor.shopId,
      edgeType: 'TRACKED_COMPETITOR',
      observedAt,
      metadata: {
        source: competitor.source,
        name: competitor.name,
        websiteUrl: competitor.websiteUrl
      }
    });
    count += 1;
  }

  return { count };
}

export async function recordMapPackEdges(args: {
  sourceShopId: string;
  scanId?: string | null;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  mapPack: MapPackResult;
}) {
  const observedAt = args.observedAt || new Date();
  const names = new Set<string>();

  for (const row of args.mapPack.queries) {
    [row.rank1, row.rank2, row.rank3]
      .filter(Boolean)
      .forEach((name) => names.add(name));
  }

  let count = 0;
  for (const name of names) {
    const shop = await resolveCompetitorShop({
      name,
      city: args.city,
      state: args.state,
      vertical: args.vertical
    });

    await upsertShopGraphEdge({
      sourceShopId: args.sourceShopId,
      targetShopId: shop.id,
      edgeType: 'MAP_PACK_COMPETITOR',
      observedAt,
      scanId: args.scanId || undefined,
      metadata: {
        source: args.mapPack.source,
        queries: args.mapPack.queries
          .filter((row) => [row.rank1, row.rank2, row.rank3].includes(name))
          .map((row) => row.query)
      }
    });
    count += 1;
  }

  return { count };
}

export async function recordScanCompetitorEdges(args: {
  sourceShopId: string;
  scanId?: string | null;
  observedAt?: Date;
  city?: string | null;
  state?: string | null;
  vertical?: string | null;
  competitors: Array<{ name: string; url?: string | null; note?: string | null }>;
}) {
  const observedAt = args.observedAt || new Date();
  let count = 0;

  for (const competitor of args.competitors) {
    const shop = await resolveCompetitorShop({
      name: competitor.name,
      websiteUrl: competitor.url || null,
      city: args.city,
      state: args.state,
      vertical: args.vertical
    });

    await upsertShopGraphEdge({
      sourceShopId: args.sourceShopId,
      targetShopId: shop.id,
      edgeType: 'MARKET_COMPETITOR',
      observedAt,
      scanId: args.scanId || undefined,
      metadata: {
        note: competitor.note || null,
        websiteUrl: competitor.url || null
      }
    });
    count += 1;
  }

  return { count };
}
