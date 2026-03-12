import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordConversionObservation } from '@/lib/shop-data';
import { checkReportActionRateLimit } from '@/lib/security/rate-limit';

export async function POST(
  req: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
    const limit = checkReportActionRateLimit(`booked:${ip}:${params.scanId}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec || 60) } }
      );
    }

    const existing = await prisma.scan.findUnique({
      where: { id: params.scanId },
      select: {
        id: true,
        shopId: true,
        organizationId: true,
        bookedClicked: true,
        city: true,
        vertical: true,
        organization: {
          select: {
            state: true
          }
        }
      }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (existing.bookedClicked) {
      return NextResponse.json({ ok: true, deduped: true });
    }

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
