import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendReportEmail } from '@/lib/email';

const schema = z.object({
  email: z.string().email()
});

export async function POST(
  req: Request,
  { params }: { params: { scanId: string } }
) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const scan = await prisma.scan.update({
      where: { id: params.scanId },
      data: { email },
      select: { id: true, shopName: true, scoreTotal: true }
    });

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
