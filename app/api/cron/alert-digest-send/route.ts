import { NextResponse } from 'next/server';
import { runAlertDigestSend } from '@/lib/jobs';

function authorized(req: Request) {
  const header = req.headers.get('x-cron-secret') || '';
  const expected = process.env.CRON_SECRET || '';
  return Boolean(expected && header === expected);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runAlertDigestSend();
  return NextResponse.json({ ok: true, ...result });
}

