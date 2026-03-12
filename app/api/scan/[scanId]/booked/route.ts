import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordConversionObservation } from '@/lib/shop-data';

export async function POST(
  _req: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    const scan = await prisma.scan.update({
      where: { id: params.scanId },
      data: { bookedClicked: true },
      select: {
        id: true,
        shopId: true,
        organizationId: true,
        city: true,
        vertical: true,
        organization: {
          select: {
            state: true
          }
        }
      }
    });

    if (scan.shopId) {
      await recordConversionObservation({
        shopId: scan.shopId,
        organizationId: scan.organizationId,
        scanId: scan.id,
        city: scan.city,
        state: scan.organization?.state || null,
        vertical: scan.vertical,
        eventType: 'call_book_clicked',
        source: 'report_cta'
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to mark booking click' },
      { status: 400 }
    );
  }
}
