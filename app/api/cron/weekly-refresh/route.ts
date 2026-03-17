import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest, unauthorizedCronResponse } from '@/lib/cron-auth';
import { runMarketIntelRefresh, runWeeklyRefresh } from '@/lib/jobs';

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return unauthorizedCronResponse();
  }

  const [result, marketIntel] = await Promise.all([
    runWeeklyRefresh(),
    runMarketIntelRefresh({ marketSlug: 'denver' })
  ]);
  return NextResponse.json({ ok: true, ...result, marketIntel });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
