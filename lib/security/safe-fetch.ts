import { assertPublicHostname } from '@/lib/security/url';

export type SafeFetchResult = {
  ok: boolean;
  status: number;
  text: string;
  finalUrl: string;
  durationMs: number;
  bytes: number;
};

const MAX_REDIRECTS = 3;
const MAX_BYTES = 1024 * 1024 * 2;

async function readBodyLimited(res: Response, maxBytes: number): Promise<{ text: string; bytes: number }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: await res.text(), bytes: 0 };

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel();
      throw new Error('Response too large');
    }
    chunks.push(value);
  }

  const decoder = new TextDecoder();
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.byteLength;
  }

  return { text: decoder.decode(combined), bytes: total };
}

export async function safeFetchText(
  url: string,
  options?: { timeoutMs?: number; userAgent?: string; accept?: string }
): Promise<SafeFetchResult> {
  await assertPublicHostname(url);

  const started = Date.now();
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 10_000);

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': options?.userAgent || 'CollisionSEOScan/2.1',
          accept: options?.accept || 'text/html,application/xml,application/json'
        },
        cache: 'no-store'
      });
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
    if (isRedirect) {
      const location = res.headers.get('location');
      if (!location) break;
      if (redirectCount >= MAX_REDIRECTS) throw new Error('Too many redirects');
      currentUrl = new URL(location, currentUrl).toString();
      await assertPublicHostname(currentUrl);
      continue;
    }

    const contentType = res.headers.get('content-type') || '';
    const allowed =
      contentType.includes('text/html') ||
      contentType.includes('xml') ||
      contentType.includes('text/plain') ||
      contentType.includes('json') ||
      contentType === '';

    if (!allowed) {
      return {
        ok: false,
        status: res.status,
        text: '',
        finalUrl: currentUrl,
        durationMs: Date.now() - started,
        bytes: 0
      };
    }

    const body = await readBodyLimited(res, MAX_BYTES);
    return {
      ok: res.ok,
      status: res.status,
      text: body.text,
      finalUrl: currentUrl,
      durationMs: Date.now() - started,
      bytes: body.bytes
    };
  }

  return {
    ok: false,
    status: 0,
    text: '',
    finalUrl: currentUrl,
    durationMs: Date.now() - started,
    bytes: 0
  };
}
