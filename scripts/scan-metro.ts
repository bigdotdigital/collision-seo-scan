import { prisma } from '../lib/prisma.ts';
import { createScanRecord, upsertOrganizationFromInput } from '../lib/org-data.ts';
import { enqueueScanExecution } from '../lib/scan-queue.ts';
import { runQueueWorkerOnce } from '../lib/queue/worker.ts';

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
];

function arg(name: string, fallback?: string) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

function batchId() {
  const explicit = arg('batch');
  if (explicit) return explicit;
  const now = new Date();
  return `metro-${now.toISOString().replace(/[:.]/g, '-').slice(0, 16)}`;
}

function asSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function loadMetroShops(cities: string[]) {
  const markets = await prisma.market.findMany({
    where: {
      vertical: 'collision',
      city: { in: cities }
    },
    select: { id: true }
  });

  const marketIds = markets.map((row) => row.id);
  if (!marketIds.length) return [];

  return prisma.shop.findMany({
    where: {
      marketId: { in: marketIds },
      websiteUrl: { not: null }
    },
    orderBy: [{ city: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      websiteUrl: true,
      city: true,
      state: true,
      address: true,
      phone: true
    }
  });
}

async function queueMetroShop(args: {
  shop: Awaited<ReturnType<typeof loadMetroShops>>[number];
  batchId: string;
  index: number;
  force: boolean;
}) {
  const websiteUrl = args.shop.websiteUrl!;

  if (!args.force) {
    const recent = await prisma.scan.findFirst({
      where: {
        websiteUrl,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        executionStatus: true
      }
    });

    if (recent && recent.executionStatus !== 'failed') {
      return { queued: false as const, skipped: 'recent_scan', scanId: recent.id };
    }
  }

  const org = await upsertOrganizationFromInput({
    shop_name: args.shop.name,
    website_url: websiteUrl,
    phone: args.shop.phone || null,
    city_or_zip: args.shop.city || 'Denver',
    address: args.shop.address || null,
    state: args.shop.state || null,
    vertical: 'collision'
  });

  const traceId = `${args.batchId}:${String(args.index + 1).padStart(3, '0')}`;
  const scan = await createScanRecord(
    {
      website_url: websiteUrl,
      city_or_zip: args.shop.city || 'Denver',
      shop_name: args.shop.name,
      email: '',
      phone: args.shop.phone || '',
      vertical: 'collision',
      executionStatus: 'queued',
      traceId,
      queuedAt: new Date()
    },
    org.id,
    args.shop.id
  );

  await enqueueScanExecution({
    scanId: scan.id,
    traceId,
    payload: {
      source: 'metro_scan',
      batchId: args.batchId,
      shopName: args.shop.name,
      city: args.shop.city || 'Denver'
    }
  });

  return { queued: true as const, scanId: scan.id, traceId };
}

async function summarizeBatch(batch: string) {
  const scans = await prisma.scan.findMany({
    where: { traceId: { startsWith: batch } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      shopName: true,
      city: true,
      executionStatus: true,
      durationMs: true,
      publicStatus: true,
      errorType: true,
      errorMessage: true,
      shopId: true
    }
  });

  const completed = scans.filter((row) => row.executionStatus === 'completed');
  const failed = scans.filter((row) => row.executionStatus === 'failed');
  const queued = scans.filter((row) => row.executionStatus === 'queued');
  const running = scans.filter((row) => row.executionStatus === 'running');
  const published = scans.filter((row) => row.publicStatus === 'published');
  const durations = completed.map((row) => row.durationMs || 0).filter((value) => value > 0).sort((a, b) => a - b);
  const uniqueShopIds = new Set(scans.map((row) => row.shopId).filter(Boolean));

  return {
    totals: {
      queued: scans.length,
      completed: completed.length,
      failed: failed.length,
      running: running.length,
      stillQueued: queued.length,
      published: published.length,
      uniqueShops: uniqueShopIds.size
    },
    medianDurationMs:
      durations.length === 0
        ? null
        : durations.length % 2 === 0
          ? Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2)
          : durations[Math.floor(durations.length / 2)],
    failed: failed.map((row) => ({
      scanId: row.id,
      shopName: row.shopName,
      city: row.city,
      errorType: row.errorType,
      errorMessage: row.errorMessage
    }))
  };
}

async function main() {
  const batch = batchId();
  const maxMinutes = Math.max(1, Math.min(Number(arg('max-minutes', '120')), 360));
  const workerTake = Math.max(1, Math.min(Number(arg('worker-batch', '2')), 5));
  const force = arg('force', '0') === '1';
  const cityArg = arg('cities');
  const cities = cityArg
    ? cityArg.split(',').map((item) => item.trim()).filter(Boolean)
    : DENVER_METRO_CITIES;

  const shops = await loadMetroShops(cities);
  const queuedResults = [];
  for (let i = 0; i < shops.length; i += 1) {
    queuedResults.push(await queueMetroShop({ shop: shops[i], batchId: batch, index: i, force }));
  }

  const started = Date.now();
  let timedOut = false;
  while (Date.now() - started < maxMinutes * 60 * 1000) {
    await runQueueWorkerOnce({ take: workerTake, types: ['scan_execute'] });
    const status = await summarizeBatch(batch);
    if (status.totals.stillQueued === 0 && status.totals.running === 0) {
      break;
    }
  }

  if (Date.now() - started >= maxMinutes * 60 * 1000) {
    timedOut = true;
  }

  const summary = await summarizeBatch(batch);
  console.log(
    JSON.stringify(
      {
        batchId: batch,
        cities: cities.map((city) => ({ city, slug: asSlug(city) })),
        timedOut,
        queuedResults,
        summary
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('scan-metro failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
