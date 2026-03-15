import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../lib/prisma.ts';
import { createScanRecord, upsertOrganizationFromInput } from '../lib/org-data.ts';
import { enqueueScanExecution } from '../lib/scan-queue.ts';
import { runQueueWorkerOnce } from '../lib/queue/worker.ts';
import { publicMarketSlug } from '../lib/public-report.ts';

type SeedShop = {
  shopName: string;
  websiteUrl: string;
  city: string;
  state?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

function arg(name: string, fallback?: string) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

function batchId() {
  const explicit = arg('batch');
  if (explicit) return explicit;
  const now = new Date();
  const parts = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0')
  ];
  return `denver-first-${parts.join('')}`;
}

async function loadSeed(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as SeedShop[];
}

async function queueSeedScan(args: {
  seed: SeedShop;
  batchId: string;
  index: number;
  force?: boolean;
}) {
  if (!args.force) {
    const recent = await prisma.scan.findFirst({
      where: {
        websiteUrl: args.seed.websiteUrl,
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
    shop_name: args.seed.shopName,
    website_url: args.seed.websiteUrl,
    phone: args.seed.phone || null,
    city_or_zip: args.seed.city,
    address: args.seed.address || null,
    state: args.seed.state || null,
    vertical: 'collision'
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      address: args.seed.address || null,
      city: args.seed.city,
      state: args.seed.state || null,
      phone: args.seed.phone || null,
      websiteUrl: args.seed.websiteUrl
    }
  });

  const traceId = `${args.batchId}:${String(args.index + 1).padStart(3, '0')}`;
  const scan = await createScanRecord(
    {
      website_url: args.seed.websiteUrl,
      city_or_zip: args.seed.city,
      shop_name: args.seed.shopName,
      email: args.seed.email || '',
      phone: args.seed.phone || '',
      vertical: 'collision',
      executionStatus: 'queued',
      traceId,
      queuedAt: new Date()
    },
    org.id,
    org.shopId || undefined
  );

  await enqueueScanExecution({
    scanId: scan.id,
    traceId,
    payload: {
      source: 'denver_first_crawl',
      batchId: args.batchId,
      shopName: args.seed.shopName,
      city: args.seed.city
    }
  });

  return { queued: true as const, scanId: scan.id, orgId: org.id, traceId };
}

async function summarizeBatch(batch: string) {
  const scans = await prisma.scan.findMany({
    where: { traceId: { startsWith: batch } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      shopName: true,
      websiteUrl: true,
      city: true,
      executionStatus: true,
      durationMs: true,
      publicStatus: true,
      scoreTotal: true,
      createdAt: true,
      finishedAt: true,
      errorType: true,
      errorMessage: true,
      shop: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          publicProfileSlug: true,
          normalizedWebsiteHost: true
        }
      }
    }
  });

  const scanIds = scans.map((row) => row.id);
  const [siteFeatureCount, insurerCount] = await Promise.all([
    prisma.shopSiteFeatureObservation.count({ where: { scanId: { in: scanIds } } }),
    prisma.shopInsuranceRelationshipObservation.count({ where: { scanId: { in: scanIds } } })
  ]);

  const completed = scans.filter((row) => row.executionStatus === 'completed');
  const failed = scans.filter((row) => row.executionStatus === 'failed');
  const queued = scans.filter((row) => row.executionStatus === 'queued');
  const running = scans.filter((row) => row.executionStatus === 'running');
  const published = scans.filter((row) => row.publicStatus === 'published');
  const uniqueShopIds = new Set(scans.map((row) => row.shop?.id).filter(Boolean));
  const durations = completed.map((row) => row.durationMs || 0).filter((value) => value > 0).sort((a, b) => a - b);
  const medianDurationMs =
    durations.length === 0
      ? null
      : durations.length % 2 === 0
        ? Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2)
        : durations[Math.floor(durations.length / 2)];

  const hostCounts = new Map<string, number>();
  const shopCounts = new Map<string, { shopName: string; count: number; websites: Set<string> }>();
  for (const scan of scans) {
    const host = scan.shop?.normalizedWebsiteHost;
    if (host) {
      hostCounts.set(host, (hostCounts.get(host) || 0) + 1);
    }

    const shopId = scan.shop?.id;
    if (!shopId) continue;
    const existing = shopCounts.get(shopId) || {
      shopName: scan.shopName,
      count: 0,
      websites: new Set<string>()
    };
    existing.count += 1;
    existing.websites.add(scan.websiteUrl);
    shopCounts.set(shopId, existing);
  }

  return {
    batchId: batch,
    totals: {
      queued: scans.length,
      completed: completed.length,
      failed: failed.length,
      stillQueued: queued.length,
      running: running.length,
      published: published.length,
      uniqueShops: uniqueShopIds.size
    },
    observations: {
      siteFeatureCount,
      insurerSignalCount: insurerCount
    },
    medianDurationMs,
    duplicateWarnings: Array.from(hostCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([host, count]) => ({ host, count })),
    canonicalizationWarnings: Array.from(shopCounts.entries())
      .filter(([, row]) => row.count > 1 && row.websites.size > 1)
      .map(([shopId, row]) => ({
        shopId,
        shopName: row.shopName,
        scanCount: row.count,
        websiteCount: row.websites.size
      })),
    failed: failed.map((row) => ({
      scanId: row.id,
      shopName: row.shopName,
      errorType: row.errorType,
      errorMessage: row.errorMessage
    })),
    publicPages: published
      .filter((row) => row.shop?.publicProfileSlug)
      .map((row) => ({
        shopName: row.shopName,
        url: `/collision-repair-seo-report/${publicMarketSlug(row.shop?.state || 'co')}/${publicMarketSlug(
          row.shop?.city || row.city
        )}/${row.shop?.publicProfileSlug}`
      }))
      .slice(0, 12)
  };
}

async function main() {
  const seedPath = arg('seed', path.resolve(process.cwd(), 'data/denver-first-crawl.json'))!;
  const limit = Math.max(1, Math.min(Number(arg('limit', '25')), 50));
  const batch = batchId();
  const maxMinutes = Math.max(1, Math.min(Number(arg('max-minutes', '20')), 60));
  const workerTake = Math.max(1, Math.min(Number(arg('worker-batch', '2')), 5));
  const force = arg('force', '0') === '1';

  const allSeed = await loadSeed(seedPath);
  const seed = allSeed.slice(0, limit);

  const queuedResults = [];
  for (let i = 0; i < seed.length; i += 1) {
    queuedResults.push(await queueSeedScan({ seed: seed[i], batchId: batch, index: i, force }));
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
        seedPath,
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
    console.error('crawl-batch failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
