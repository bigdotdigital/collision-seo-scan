import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest, unauthorizedCronResponse } from '@/lib/cron-auth';
import { queueDailyObservationRefreshJobs } from '@/lib/jobs';

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return unauthorizedCronResponse();
  }

  const queued = await queueDailyObservationRefreshJobs();

  return NextResponse.json({
    ok: true,
    mode: 'scheduled',
    queued
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
