import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';

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
  type: string;
  take?: number;
}) {
  const jobs = await prisma.queueJob.findMany({
    where: {
      type: args.type,
      status: 'pending',
      runAt: { lte: new Date() }
    },
    orderBy: { runAt: 'asc' },
    take: args.take || 10
  });

  const claimed = [];

  for (const job of jobs) {
    const result = await prisma.queueJob.updateMany({
      where: { id: job.id, status: 'pending' },
      data: {
        status: 'processing',
        startedAt: new Date(),
        attempts: { increment: 1 },
        error: null,
        errorType: null
      }
    });

    if (result.count === 1) {
      claimed.push({
        ...job,
        status: 'processing',
        attempts: job.attempts + 1
      });
    }
  }

  return claimed;
}

export async function completeQueueJob(jobId: string) {
  return prisma.queueJob.update({
    where: { id: jobId },
    data: {
      status: 'done',
      processedAt: new Date(),
      finishedAt: new Date(),
      error: null,
      errorType: null
    }
  });
}

export async function failQueueJob(args: {
  id: string;
  attempts: number;
  maxAttempts: number;
  error: unknown;
  retryDelayMs?: number;
}) {
  const message = args.error instanceof Error ? args.error.message : 'Unknown failure';
  const errorType = args.error instanceof Error ? args.error.name : 'QueueJobError';
  const shouldRetry = args.attempts < args.maxAttempts;

  return prisma.queueJob.update({
    where: { id: args.id },
    data: shouldRetry
      ? {
          status: 'pending',
          runAt: new Date(Date.now() + (args.retryDelayMs || DEFAULT_SCAN_RETRY_DELAY_MS)),
          error: message,
          errorType,
          finishedAt: new Date()
        }
      : {
          status: 'failed',
          processedAt: new Date(),
          finishedAt: new Date(),
          error: message,
          errorType
        }
  });
}
