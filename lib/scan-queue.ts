import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';
import { claimNextJobs, heartbeatJobLease, releaseJobLease } from '@/lib/queue/claim-jobs';

const DEFAULT_SCAN_RETRY_DELAY_MS = 2 * 60 * 1000;

export function scanLifecycleLog(event: string, data: Record<string, unknown>) {
  console.info(`[scan-queue:${event}]`, JSON.stringify(data));
}

export async function enqueueScanExecution(args: {
  scanId: string;
  traceId?: string;
  runAt?: Date;
  payload?: Record<string, unknown>;
}) {
  return prisma.queueJob.create({
    data: {
      type: 'scan_execute',
      status: 'pending',
      traceId: args.traceId || undefined,
      scanId: args.scanId,
      runAt: args.runAt || new Date(),
      payloadJson: args.payload ? toJson(args.payload) : null,
      maxAttempts: 3
    }
  });
}

export async function claimQueueJobs(args: {
  type?: string;
  types?: string[];
  take?: number;
  lockOwner: string;
}) {
  const types = args.types || (args.type ? [args.type] : undefined);
  return claimNextJobs({ types, take: args.take, lockOwner: args.lockOwner });
}

export async function completeQueueJob(jobId: string, lockOwner?: string) {
  const job = await prisma.queueJob.update({
    where: { id: jobId },
    data: {
      status: 'done',
      processedAt: new Date(),
      finishedAt: new Date(),
      error: null,
      errorType: null,
      lockedAt: null,
      lockOwner: null
    }
  });

  if (lockOwner) {
    await releaseJobLease({ jobId, lockOwner });
  }

  return job;
}

export async function failQueueJob(args: {
  id: string;
  attempts: number;
  maxAttempts: number;
  error: unknown;
  retryDelayMs?: number;
  lockOwner?: string;
}) {
  const message = args.error instanceof Error ? args.error.message : 'Unknown failure';
  const errorType = args.error instanceof Error ? args.error.name : 'QueueJobError';
  const shouldRetry = args.attempts < args.maxAttempts;

  const job = await prisma.queueJob.update({
    where: { id: args.id },
    data: shouldRetry
      ? {
          status: 'pending',
          runAt: new Date(Date.now() + (args.retryDelayMs || DEFAULT_SCAN_RETRY_DELAY_MS)),
          error: message,
          errorType,
          finishedAt: new Date(),
          lockedAt: null,
          lockOwner: null
        }
      : {
          status: 'failed',
          processedAt: new Date(),
          finishedAt: new Date(),
          error: message,
          errorType,
          lockedAt: null,
          lockOwner: null
        }
  });

  if (args.lockOwner) {
    await releaseJobLease({ jobId: args.id, lockOwner: args.lockOwner });
  }

  return job;
}

export async function refreshQueueJobLease(args: { id: string; lockOwner: string }) {
  return heartbeatJobLease({ jobId: args.id, lockOwner: args.lockOwner });
}
