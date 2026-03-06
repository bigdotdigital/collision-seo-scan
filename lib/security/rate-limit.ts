type Entry = { count: number; resetAt: number };

const globalState = globalThis as typeof globalThis & {
  __scanRateLimit?: Map<string, Entry>;
};

const store = globalState.__scanRateLimit ?? new Map<string, Entry>();
if (!globalState.__scanRateLimit) globalState.__scanRateLimit = store;

const WINDOW_MS = 60_000;
const LIMIT = 8;

export function checkScanRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (current.count >= LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  store.set(key, current);
  return { ok: true };
}
