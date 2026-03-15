import { knownQueueTypes, queueHandlers, type QueueHandlerResult } from '@/lib/queue/handlers';
import { completeQueueJob, failQueueJob, refreshQueueJobLease, scanLifecycleLog } from '@/lib/scan-queue';
import { claimNextJobs, queueLeaseMs } from '@/lib/queue/claim-jobs';

export type WorkerTickResult = {
  lockOwner: string;
  claimed: number;
  completed: number;
  failed: number;
  skipped: number;
  results: Array<{ jobId: string; type: string; status: 'completed' | 'failed' | 'skipped' }>;
};

function queuePollIntervalMs() {
  const parsed = Number(process.env.QUEUE_POLL_INTERVAL_MS || 2_000);
  return Number.isFinite(parsed) && parsed >= 250 ? parsed : 2_000;
}

function queueBatchSize() {
  const parsed = Number(process.env.QUEUE_BATCH_SIZE || 5);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 25) : 5;
}

function queueHeartbeatMs() {
  const lease = queueLeaseMs();
  const parsed = Number(process.env.QUEUE_HEARTBEAT_MS || Math.floor(lease / 3));
  return Number.isFinite(parsed) && parsed >= 5_000 ? Math.min(parsed, Math.floor(lease / 2)) : Math.floor(lease / 3);
}

export function createWorkerLockOwner() {
  return process.env.WORKER_ID || `${process.pid}@${process.env.HOSTNAME || 'local'}`;
}

async function runWithLeaseHeartbeat<T>(args: {
  jobId: string;
  lockOwner: string;
  run: () => Promise<T>;
}) {
  const interval = setInterval(() => {
    refreshQueueJobLease({ id: args.jobId, lockOwner: args.lockOwner }).catch((error) => {
      console.error('[queue-worker:heartbeat_failed]', { jobId: args.jobId, error });
    });
  }, queueHeartbeatMs());

  interval.unref?.();

  try {
    return await args.run();
  } finally {
    clearInterval(interval);
  }
}

export async function runQueueWorkerOnce(args?: {
  lockOwner?: string;
  take?: number;
  types?: string[];
}) {
  const lockOwner = args?.lockOwner || createWorkerLockOwner();
  const jobs = await claimNextJobs({
    lockOwner,
    take: args?.take || queueBatchSize(),
    types: args?.types && args.types.length > 0 ? args.types : knownQueueTypes()
  });

  const result: WorkerTickResult = {
    lockOwner,
    claimed: jobs.length,
    completed: 0,
    failed: 0,
    skipped: 0,
    results: []
  };

  for (const job of jobs) {
    const handler = queueHandlers[job.type];
    if (!handler) {
      await failQueueJob({
        id: job.id,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lockOwner,
        error: new Error(`No queue handler registered for ${job.type}`)
      });
      result.failed += 1;
      result.results.push({ jobId: job.id, type: job.type, status: 'failed' });
      continue;
    }

    scanLifecycleLog('job_start', {
      jobId: job.id,
      jobType: job.type,
      scanId: job.scanId,
      lockOwner,
      attempts: job.attempts,
      startedAt: new Date().toISOString()
    });

    const startedAt = Date.now();

    try {
      const handlerResult = await runWithLeaseHeartbeat({
        jobId: job.id,
        lockOwner,
        run: () => handler({ job, lockOwner })
      });

      await completeQueueJob(job.id, lockOwner);
      logJobOutcome('job_complete', job.id, job.type, handlerResult, {
        scanId: job.scanId,
        startedAt,
        status: 'completed'
      });
      result.completed += 1;
      result.results.push({ jobId: job.id, type: job.type, status: 'completed' });
    } catch (error) {
      const finishedAt = Date.now();
      await failQueueJob({
        id: job.id,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        lockOwner,
        error
      });
      console.error('[queue-worker:job_failed]', {
        jobId: job.id,
        jobType: job.type,
        lockOwner,
        scanId: job.scanId,
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: Math.max(0, finishedAt - startedAt),
        error: error instanceof Error ? error.message : 'Unknown queue failure'
      });
      result.failed += 1;
      result.results.push({ jobId: job.id, type: job.type, status: 'failed' });
    }
  }

  return result;
}

function logJobOutcome(
  event: string,
  jobId: string,
  jobType: string,
  result: QueueHandlerResult,
  extra: { scanId: string | null; startedAt: number; status: string }
) {
  const finishedAt = Date.now();
  console.info(
    `[queue-worker:${event}]`,
    JSON.stringify({
      jobId,
      jobType,
      scanId: extra.scanId,
      status: extra.status,
      startedAt: new Date(extra.startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: Math.max(0, finishedAt - extra.startedAt),
      ...result.details
    })
  );
}

export async function runQueueWorkerLoop(args?: {
  lockOwner?: string;
  pollIntervalMs?: number;
  take?: number;
  types?: string[];
}) {
  const lockOwner = args?.lockOwner || createWorkerLockOwner();
  const pollIntervalMs = args?.pollIntervalMs || queuePollIntervalMs();
  let shuttingDown = false;

  const stop = () => {
    shuttingDown = true;
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  console.info('[queue-worker:boot]', JSON.stringify({ lockOwner, pollIntervalMs }));

  try {
    while (!shuttingDown) {
      try {
        const tick = await runQueueWorkerOnce({
          lockOwner,
          take: args?.take,
          types: args?.types
        });

        if (tick.claimed === 0) {
          await sleep(pollIntervalMs);
        }
      } catch (error) {
        console.error('[queue-worker:tick_failed]', {
          lockOwner,
          error: error instanceof Error ? error.message : 'Unknown worker failure'
        });
        await sleep(pollIntervalMs);
      }
    }
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    console.info('[queue-worker:shutdown]', JSON.stringify({ lockOwner }));
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
