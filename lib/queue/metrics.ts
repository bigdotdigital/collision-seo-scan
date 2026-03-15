import { prisma } from '@/lib/prisma';

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return sorted[middle];
}

export async function getQueueMetrics() {
  const [statusGroups, recentJobs] = await Promise.all([
    prisma.queueJob.groupBy({
      by: ['status'],
      _count: { _all: true }
    }),
    prisma.queueJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        type: true,
        attempts: true,
        startedAt: true,
        finishedAt: true,
        status: true
      }
    })
  ]);

  const counts = {
    pending: 0,
    processing: 0,
    done: 0,
    failed: 0
  };

  for (const group of statusGroups) {
    if (group.status in counts) {
      counts[group.status as keyof typeof counts] = group._count._all;
    }
  }

  const durationsByType = new Map<string, number[]>();
  const retriesByType = new Map<string, number>();

  for (const job of recentJobs) {
    if (job.attempts > 1) {
      retriesByType.set(job.type, (retriesByType.get(job.type) || 0) + (job.attempts - 1));
    }

    if (!job.startedAt || !job.finishedAt) continue;
    const duration = Math.max(0, job.finishedAt.getTime() - job.startedAt.getTime());
    const list = durationsByType.get(job.type) || [];
    list.push(duration);
    durationsByType.set(job.type, list);
  }

  return {
    counts,
    medianDurationMsByType: Object.fromEntries(
      Array.from(durationsByType.entries()).map(([type, values]) => [type, median(values)])
    ),
    retriesByType: Object.fromEntries(retriesByType.entries())
  };
}
