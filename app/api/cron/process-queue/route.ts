import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest, unauthorizedCronResponse } from '@/lib/cron-auth';
import { runQueueWorkerOnce } from '@/lib/queue/worker';

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return unauthorizedCronResponse();
  }

  const result = await runQueueWorkerOnce({ take: 10 });

  return NextResponse.json({
    ok: true,
    mode: 'manual_fallback',
    result
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
