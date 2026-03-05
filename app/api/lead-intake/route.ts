import { NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertLead } from '@/lib/org-data';

const schema = z.object({
  orgId: z.string().min(1),
  scanId: z.string().optional(),
  intent: z.string().optional(),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  name: z.string().optional()
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = schema.parse(body);

    const lead = await upsertLead({
      organizationId: input.orgId,
      scanId: input.scanId,
      intent: input.intent || null,
      budgetRange: input.budgetRange || null,
      timeline: input.timeline || null,
      email: input.email || null,
      phone: input.phone || null,
      name: input.name || null,
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
