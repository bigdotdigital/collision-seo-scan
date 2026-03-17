import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest, unauthorizedCronResponse } from '@/lib/cron-auth';
import { runRankSnapshotCollect } from '@/lib/jobs';

async function handle(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return unauthorizedCronResponse();
  }

  const result = await runRankSnapshotCollect();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
