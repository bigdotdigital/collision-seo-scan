import { NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertLead } from '@/lib/org-data';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  orgId: z.string().min(1).optional(),
  scanId: z.string().optional(),
  intent: z.string().optional(),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  vertical: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  name: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = schema.parse(body);
    let organizationId = input.orgId;

    if (!organizationId && input.scanId) {
      const scan = await prisma.scan.findUnique({
        where: { id: input.scanId },
        select: { organizationId: true }
      });
      organizationId = scan?.organizationId || undefined;
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId or scanId is required' }, { status: 400 });
    }

    const lead = await upsertLead({
      organizationId,
      scanId: input.scanId,
      intent: input.intent || null,
      budgetRange: input.budgetRange || null,
      timeline: input.timeline || null,
      email: input.email || null,
      phone: input.phone || null,
      name: input.name || null,
      vertical: input.vertical || null,
      source: 'cta_form',
      consented: true
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lead intake failed' },
      { status: 400 }
    );
  }
}
