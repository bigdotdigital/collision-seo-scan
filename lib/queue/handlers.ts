import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/json';
import { sendFollowupEmail } from '@/lib/email';
import { runScanExecution } from '@/lib/scan-job-runner';
import { runDailyObservationRefresh, runMarketIntelRefresh, runRankSnapshotCollect } from '@/lib/jobs';

export type QueueHandlerContext = {
  job: {
    id: string;
    type: string;
    scanId: string | null;
    traceId: string | null;
    attempts: number;
    maxAttempts: number;
    payloadJson: string | null;
  };
  lockOwner: string;
};

export type QueueHandlerResult = {
  kind: 'completed';
  details?: Record<string, unknown>;
};

export type QueueJobHandler = (context: QueueHandlerContext) => Promise<QueueHandlerResult>;

async function handleScanExecute(context: QueueHandlerContext) {
  const result = await runScanExecution({
    id: context.job.id,
    scanId: context.job.scanId,
    traceId: context.job.traceId,
    attempts: context.job.attempts,
    maxAttempts: context.job.maxAttempts
  });

  return { kind: 'completed' as const, details: result };
}

async function handleFollowupEmail(context: QueueHandlerContext) {
  const job = context.job;
  const scan = job.scanId
    ? await prisma.scan.findUnique({ where: { id: job.scanId } })
    : null;

  if (!scan || !scan.email || scan.bookedClicked || scan.followupSent) {
    return {
      kind: 'completed' as const,
      details: { skipped: true, reason: 'missing_email_or_already_handled' }
    };
  }

  const payload = parseJson<{ reportUrl?: string } | null>(job.payloadJson, null);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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

  return { kind: 'completed' as const, details: { sent: true, scanId: scan.id } };
}

async function handleDailyObservationRefresh() {
  const observations = await runDailyObservationRefresh();
  return { kind: 'completed' as const, details: observations };
}

async function handleRankSnapshotCollect() {
  const ranks = await runRankSnapshotCollect();
  return { kind: 'completed' as const, details: ranks };
}

async function handleDiscoverShopNeighbors() {
  return {
    kind: 'completed' as const,
    details: { queued: false, message: 'Discovery job scaffolded but not implemented yet.' }
  };
}

async function handleEnrichShopBasics() {
  return {
    kind: 'completed' as const,
    details: { queued: false, message: 'Enrichment job scaffolded but not implemented yet.' }
  };
}

async function handleBuildShopEdges() {
  return {
    kind: 'completed' as const,
    details: { queued: false, message: 'Graph edge rebuild scaffolded but not implemented yet.' }
  };
}

async function handleMarketIntelRefresh(context: QueueHandlerContext) {
  const payload = parseJson<{ marketSlug?: string } | null>(context.job.payloadJson, null);
  const intel = await runMarketIntelRefresh({ marketSlug: payload?.marketSlug || 'denver' });
  return { kind: 'completed' as const, details: intel };
}

export const queueHandlers: Record<string, QueueJobHandler> = {
  scan_execute: handleScanExecute,
  followup_email: handleFollowupEmail,
  daily_observation_refresh: handleDailyObservationRefresh,
  rank_snapshot_collect: handleRankSnapshotCollect,
  market_intel_refresh: handleMarketIntelRefresh,
  discover_shop_neighbors: handleDiscoverShopNeighbors,
  enrich_shop_basics: handleEnrichShopBasics,
  build_shop_edges: handleBuildShopEdges
};

export function knownQueueTypes() {
  return Object.keys(queueHandlers);
}
