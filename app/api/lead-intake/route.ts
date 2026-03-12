import { NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertLead } from '@/lib/org-data';
import { prisma } from '@/lib/prisma';
import { recordConversionObservation } from '@/lib/shop-data';
import { checkLeadRateLimit } from '@/lib/security/rate-limit';

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
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
    const limit = checkLeadRateLimit(`lead:${ip}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many submissions from this network. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec || 60) } }
      );
    }

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

    if (input.email || input.phone) {
      const contactMatchers: Array<{ email: string } | { phone: string }> = [];
      if (input.email) contactMatchers.push({ email: input.email });
      if (input.phone) contactMatchers.push({ phone: input.phone });

      const duplicateLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          scanId: input.scanId || undefined,
          OR: contactMatchers,
          createdAt: {
            gte: new Date(Date.now() - 10 * 60 * 1000)
          }
        },
        select: { id: true }
      });
      if (duplicateLead) {
        return NextResponse.json({ ok: true, leadId: duplicateLead.id, deduped: true });
      }
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

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        shopId: true,
        city: true,
        state: true,
        verticalDefault: true
      }
    });

    if (organization?.shopId) {
      await recordConversionObservation({
        shopId: organization.shopId,
        organizationId,
        scanId: input.scanId || null,
        leadId: lead.id,
        city: organization.city,
        state: organization.state,
        vertical: organization.verticalDefault,
        eventType: 'lead_submitted',
        source: 'cta_form',
        value: {
          intent: input.intent || null,
          budgetRange: input.budgetRange || null,
          timeline: input.timeline || null,
          emailCaptured: Boolean(input.email),
          phoneCaptured: Boolean(input.phone)
        }
      });
    }

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lead intake failed' },
      { status: 400 }
    );
  }
}
