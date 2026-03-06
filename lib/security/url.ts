import { promises as dns } from 'node:dns';
import net from 'node:net';

const PRIVATE_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
  }
  return PRIVATE_RANGES.some((r) => r.test(ip));
}

export function sanitizeInput(value: string, max = 200): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeWebsiteUrl(input: string): string | null {
  const raw = sanitizeInput(input, 512);
  if (!raw) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  const host = parsed.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local')) return null;
  if (net.isIP(host) && isPrivateIp(host)) return null;

  parsed.hash = '';
  return parsed.toString();
}

export async function assertPublicHostname(targetUrl: string): Promise<void> {
  const parsed = new URL(targetUrl);
  const host = parsed.hostname;

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('Private or loopback IPs are not allowed');
    return;
  }

  const records = await dns.lookup(host, { all: true }).catch(() => []);
  if (!records.length) throw new Error('Unable to resolve hostname');

  const hasPrivate = records.some((r) => isPrivateIp(r.address));
  if (hasPrivate) throw new Error('Private network targets are blocked');
}
