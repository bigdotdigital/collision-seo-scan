import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toJson } from '@/lib/json';

const schema = z.object({
  shopId: z.string().min(1),
  scanId: z.string().min(1),
  action: z.enum(['claim', 'update', 'rescan', 'opt_out']),
  email: z.string().email().optional(),
  message: z.string().max(1000).optional()
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const input = parsed.data;
  await prisma.queueJob.create({
    data: {
      type: 'public_shop_request',
      status: 'pending',
      runAt: new Date(),
      scanId: input.scanId,
      payloadJson: toJson({
        shopId: input.shopId,
        action: input.action,
        email: input.email || null,
        message: input.message || null
      })
    }
  });

  return NextResponse.json({ ok: true });
}
