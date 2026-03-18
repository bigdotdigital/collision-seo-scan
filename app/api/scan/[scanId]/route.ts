import { NextResponse } from 'next/server';
import { getScanRecord } from '@/lib/scan-store';
import { runQueueWorkerOnce } from '@/lib/queue/worker';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { scanId: string } }
) {
  const scan = await getScanRecord(params.scanId);
  if (!scan) {
    return NextResponse.json(
      { error: 'Scan not found' },
      { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }

  if (scan.executionStatus === 'queued') {
    try {
      await runQueueWorkerOnce({ take: 1, types: ['scan_execute'] });
    } catch (error) {
      console.error('[scan-status:queue-kick-failed]', {
        scanId: params.scanId,
        error: error instanceof Error ? error.message : 'Unknown worker failure'
      });
    }
  }

  return NextResponse.json(
    { scan },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
