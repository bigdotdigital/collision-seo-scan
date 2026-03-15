import { NextResponse } from 'next/server';
import { runDailyObservationRefresh, runRankSnapshotCollect } from '@/lib/jobs';

function authorized(req: Request) {
  const header = req.headers.get('x-cron-secret') || '';
  const expected = process.env.CRON_SECRET || '';
  return Boolean(expected && header === expected);
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [observations, ranks] = await Promise.all([
    runDailyObservationRefresh(),
    runRankSnapshotCollect()
  ]);

  return NextResponse.json({ ok: true, observations, ranks });
}
