export const TTL = {
  google_places: 14 * 24 * 60 * 60 * 1000,
  maps_serp: 48 * 60 * 60 * 1000,
  website_audit: 7 * 24 * 60 * 60 * 1000
} as const;

export function computeExpiry(
  provider: keyof typeof TTL,
  fetchedAt = new Date()
): Date {
  return new Date(fetchedAt.getTime() + TTL[provider]);
}

export function isExpired(expiresAt?: Date | null): boolean {
  return !expiresAt || expiresAt.getTime() <= Date.now();
}
