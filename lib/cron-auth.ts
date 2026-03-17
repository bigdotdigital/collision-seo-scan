import { NextResponse } from 'next/server';

function bearerToken(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return '';
  return token || '';
}

export function isAuthorizedCronRequest(req: Request) {
  const expected = process.env.CRON_SECRET || '';
  if (!expected) return false;

  const headerToken = req.headers.get('x-cron-secret') || '';
  const authToken = bearerToken(req);
  return headerToken === expected || authToken === expected;
}

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
