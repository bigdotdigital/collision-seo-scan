type Entry = { count: number; resetAt: number };

const globalState = globalThis as typeof globalThis & {
  __scanRateLimit?: Map<string, Entry>;
};

const store = globalState.__scanRateLimit ?? new Map<string, Entry>();
if (!globalState.__scanRateLimit) globalState.__scanRateLimit = store;

const SCAN_WINDOW_MS = 60 * 60_000;
const SCAN_LIMIT = 10;

function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (current.count >= options.limit) {
    return { ok: false, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  store.set(key, current);
  return { ok: true };
}

export function checkScanRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  return checkRateLimit(key, { limit: SCAN_LIMIT, windowMs: SCAN_WINDOW_MS });
}

export function checkLeadRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  return checkRateLimit(key, { limit: 5, windowMs: 60_000 });
}

export function checkReportActionRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  return checkRateLimit(key, { limit: 8, windowMs: 60_000 });
}
