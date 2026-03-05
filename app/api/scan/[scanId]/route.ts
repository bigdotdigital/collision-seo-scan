import { NextResponse } from 'next/server';
import { getScanRecord } from '@/lib/scan-store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { scanId: string } }
) {
  const scan = await getScanRecord(params.scanId);
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json({ scan });
}
