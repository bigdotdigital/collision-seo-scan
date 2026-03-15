import { prisma } from '@/lib/prisma';

const DOMAIN_WINDOW_MS = 24 * 60 * 60_000;

export function scanHostKey(websiteUrl: string) {
  try {
    return new URL(websiteUrl).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

export async function checkScanSubmissionGuard(args: { websiteUrl: string }) {
  const host = scanHostKey(args.websiteUrl);
  if (!host) {
    return { ok: true as const };
  }

  const dayAgo = new Date(Date.now() - DOMAIN_WINDOW_MS);

  const [inFlight, recent] = await Promise.all([
    prisma.scan.findFirst({
      where: {
        createdAt: { gte: dayAgo },
        executionStatus: { in: ['queued', 'running'] },
        shop: { normalizedWebsiteHost: host }
      },
      select: {
        id: true,
        createdAt: true,
        executionStatus: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.scan.findFirst({
      where: {
        createdAt: { gte: dayAgo },
        executionStatus: { in: ['queued', 'running', 'completed'] },
        shop: { normalizedWebsiteHost: host }
      },
      select: {
        id: true,
        createdAt: true,
        executionStatus: true
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  if (inFlight) {
    return {
      ok: false as const,
      reason: 'scan_in_progress',
      retryAfterSec: 15 * 60,
      existingScanId: inFlight.id
    };
  }

  if (recent) {
    return {
      ok: false as const,
      reason: 'domain_daily_limit',
      retryAfterSec: Math.max(60, Math.ceil((recent.createdAt.getTime() + DOMAIN_WINDOW_MS - Date.now()) / 1000)),
      existingScanId: recent.id
    };
  }

  return { ok: true as const };
}
