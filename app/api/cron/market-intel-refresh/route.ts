import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest, unauthorizedCronResponse } from '@/lib/cron-auth';
import { runMarketIntelRefresh } from '@/lib/jobs';

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return unauthorizedCronResponse();
  }

  const result = await runMarketIntelRefresh({ marketSlug: 'denver' });
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
