import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'collision_admin_auth';

export function adminCookieMatches() {
  const expected = process.env.ADMIN_PASSWORD || '';
  const current = cookies().get(ADMIN_COOKIE_NAME)?.value || '';
  return Boolean(expected && current && current === expected);
}

