import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';

export async function enqueueScheduledJob(args: {
  type: string;
  runAt?: Date;
  payload?: Record<string, unknown>;
  uniqueWindowHours?: number;
}) {
  const runAt = args.runAt || new Date();
  const uniqueWindowHours = Math.max(1, Math.min(args.uniqueWindowHours || 24, 168));
  const since = new Date(runAt.getTime() - uniqueWindowHours * 60 * 60 * 1000);

  const existing = await prisma.queueJob.findFirst({
    where: {
      type: args.type,
      createdAt: { gte: since },
      status: { in: ['pending', 'processing'] }
    },
    select: { id: true }
  });

  if (existing) {
    return { jobId: existing.id, created: false as const };
  }

  const job = await prisma.queueJob.create({
    data: {
      type: args.type,
      status: 'pending',
      runAt,
      payloadJson: args.payload ? toJson(args.payload) : null
    },
    select: { id: true }
  });

  return { jobId: job.id, created: true as const };
}
