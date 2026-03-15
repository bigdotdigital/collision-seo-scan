import { Prisma, type QueueJob } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type ClaimedQueueJob = QueueJob;

export function queueLeaseMs() {
  const parsed = Number(process.env.QUEUE_LEASE_MS || 15 * 60 * 1000);
  return Number.isFinite(parsed) && parsed > 30_000 ? parsed : 15 * 60 * 1000;
}

export async function claimNextJobs(args: {
  types?: string[];
  take?: number;
  lockOwner: string;
}) {
  const now = new Date();
  const leaseCutoff = new Date(now.getTime() - queueLeaseMs());
  const take = Math.max(1, Math.min(args.take || 5, 25));

  const typeFilter =
    args.types && args.types.length > 0
      ? Prisma.sql`AND q."type" IN (${Prisma.join(args.types)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<ClaimedQueueJob[]>(Prisma.sql`
    WITH next_jobs AS (
      SELECT q.id
      FROM "QueueJob" q
      WHERE (
        (q.status = 'pending' AND q."runAt" <= ${now})
        OR (q.status = 'processing' AND q."lockedAt" IS NOT NULL AND q."lockedAt" <= ${leaseCutoff})
      )
      ${typeFilter}
      ORDER BY q."runAt" ASC
      LIMIT ${take}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "QueueJob" q
    SET status = 'processing',
        attempts = q.attempts + 1,
        "startedAt" = CASE
          WHEN q.status = 'processing' THEN ${now}
          ELSE COALESCE(q."startedAt", ${now})
        END,
        "lockedAt" = ${now},
        "lockOwner" = ${args.lockOwner},
        error = NULL,
        "errorType" = NULL
    FROM next_jobs
    WHERE q.id = next_jobs.id
    RETURNING q.*;
  `);

  return rows;
}

export async function heartbeatJobLease(args: { jobId: string; lockOwner: string }) {
  const result = await prisma.queueJob.updateMany({
    where: {
      id: args.jobId,
      status: 'processing',
      lockOwner: args.lockOwner
    },
    data: {
      lockedAt: new Date()
    }
  });

  return result.count === 1;
}

export async function releaseJobLease(args: { jobId: string; lockOwner: string }) {
  await prisma.queueJob.updateMany({
    where: {
      id: args.jobId,
      lockOwner: args.lockOwner
    },
    data: {
      lockedAt: null,
      lockOwner: null
    }
  });
}
