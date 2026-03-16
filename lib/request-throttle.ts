import crypto from 'node:crypto';

type ThrottleBucket = {
  count: number;
  resetAt: number;
};

type ThrottleInput = {
  bucket: string;
  keyParts: Array<string | null | undefined>;
  limit: number;
  windowMs: number;
};

type ThrottleResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const throttleStore = globalThis as typeof globalThis & {
  __bigDotRequestThrottle?: Map<string, ThrottleBucket>;
};

function getStore() {
  if (!throttleStore.__bigDotRequestThrottle) {
    throttleStore.__bigDotRequestThrottle = new Map<string, ThrottleBucket>();
  }
  return throttleStore.__bigDotRequestThrottle;
}

function stableKey(parts: Array<string | null | undefined>) {
  const value = parts
    .map((part) => (part || '').trim().toLowerCase())
    .filter(Boolean)
    .join('|');
  return crypto.createHash('sha256').update(value || 'anonymous').digest('hex');
}

export function consumeRequestThrottle(input: ThrottleInput): ThrottleResult {
  const store = getStore();
  const now = Date.now();
  const key = `${input.bucket}:${stableKey(input.keyParts)}`;

  for (const [entryKey, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(entryKey);
  }

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + input.windowMs
    });

    return {
      ok: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000)
    };
  }

  if (existing.count >= input.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    ok: true,
    remaining: Math.max(0, input.limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  };
}
