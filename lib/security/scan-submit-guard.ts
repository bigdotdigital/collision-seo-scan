import { prisma } from '@/lib/prisma';

const DOMAIN_WINDOW_MS = 24 * 60 * 60_000;
const DOMAIN_DAILY_SCAN_LIMIT = 100;

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
  const candidates = await prisma.scan.findMany({
    where: {
      createdAt: { gte: dayAgo },
      executionStatus: { in: ['queued', 'running', 'completed'] }
    },
    select: {
      id: true,
      createdAt: true,
      executionStatus: true,
      websiteUrl: true,
      shop: {
        select: {
          normalizedWebsiteHost: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 500
  });

  const matching = candidates.filter((scan) => {
    const shopHost = (scan.shop?.normalizedWebsiteHost || '').replace(/^www\./i, '').toLowerCase();
    const scanHost = scanHostKey(scan.websiteUrl || '');
    return shopHost === host || scanHost === host;
  });

  const inFlight = matching.find((scan) => scan.executionStatus === 'queued' || scan.executionStatus === 'running');
  const completedRecent = matching.filter((scan) => scan.executionStatus === 'completed');

  if (inFlight) {
    return {
      ok: false as const,
      reason: 'scan_in_progress',
      retryAfterSec: 15 * 60,
      existingScanId: inFlight.id
    };
  }

  if (completedRecent.length >= DOMAIN_DAILY_SCAN_LIMIT) {
    const oldestAllowed = completedRecent[DOMAIN_DAILY_SCAN_LIMIT - 1];
    return {
      ok: false as const,
      reason: 'domain_daily_limit',
      retryAfterSec: Math.max(60, Math.ceil((oldestAllowed.createdAt.getTime() + DOMAIN_WINDOW_MS - Date.now()) / 1000)),
      existingScanId: completedRecent[0]?.id
    };
  }

  return { ok: true as const };
}
