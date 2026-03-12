import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendReportEmail } from '@/lib/email';
import { recordConversionObservation } from '@/lib/shop-data';
import { checkReportActionRateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  email: z.string().email()
});

export async function POST(
  req: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
    const limit = checkReportActionRateLimit(`capture-email:${ip}:${params.scanId}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec || 60) } }
      );
    }

    const body = await req.json();
    const { email } = schema.parse(body);

    const existing = await prisma.scan.findUnique({
      where: { id: params.scanId },
      select: {
        id: true,
        email: true,
        shopName: true,
        scoreTotal: true
      }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (existing.email && existing.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json({ ok: true, sent: false, reason: 'Email already captured', deduped: true });
    }

    const scan = await prisma.scan.update({
      where: { id: params.scanId },
      data: { email },
      select: {
        id: true,
        shopId: true,
        organizationId: true,
        shopName: true,
        scoreTotal: true,
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
        eventType: 'report_email_captured',
        source: 'report_gate',
        value: {
          emailDomain: email.split('@')[1] || null
        }
      });
    }

    const origin =
      req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const reportUrl = `${origin}/report/${scan.id}`;

    const mail = await sendReportEmail({
      to: email,
      shopName: scan.shopName,
      score: scan.scoreTotal,
      reportUrl
    });

    return NextResponse.json({ ok: true, sent: mail.sent, reason: mail.reason || null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture email' },
      { status: 400 }
    );
  }
}
