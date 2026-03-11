import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDashboardSession } from '@/lib/client-auth';
import { normalizeWebsiteUrl, sanitizeInput } from '@/lib/security/url';
import { isLikelyNonShopCompetitor } from '@/lib/competitor-filter';
import { resolveCompetitorShop } from '@/lib/shop-data';

export const dynamic = 'force-dynamic';

async function getOrCreatePrimaryLocation(orgId: string) {
  const existing = await prisma.location.findFirst({
    where: { orgId, isPrimary: true },
    orderBy: { createdAt: 'asc' }
  });
  if (existing) return existing;
  return prisma.location.create({
    data: {
      orgId,
      isPrimary: true,
      name: 'Primary Location'
    }
  });
}

function toRedirect(req: Request, updated: string, ok = true) {
  const url = new URL('/dashboard/onboarding', req.url);
  url.searchParams.set('updated', updated);
  if (!ok) url.searchParams.set('error', '1');
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  const session = await getDashboardSession();
  if (!session?.orgId) {
    return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || '';
  const form = await req.formData();

  try {
    if (type === 'location') {
      const name = sanitizeInput(String(form.get('name') || ''), 120);
      const address = sanitizeInput(String(form.get('address') || ''), 180);
      const city = sanitizeInput(String(form.get('city') || ''), 80);
      const state = sanitizeInput(String(form.get('state') || ''), 40);
      const websiteUrlInput = sanitizeInput(String(form.get('websiteUrl') || ''), 240);
      const gbpUrlInput = sanitizeInput(String(form.get('gbpUrl') || ''), 240);
      const websiteUrl = websiteUrlInput ? normalizeWebsiteUrl(websiteUrlInput) : null;
      const gbpUrl = gbpUrlInput ? normalizeWebsiteUrl(gbpUrlInput) : null;

      const location = await getOrCreatePrimaryLocation(session.orgId);

      await prisma.location.update({
        where: { id: location.id },
        data: {
          name: name || location.name,
          address: address || null,
          city: city || null,
          state: state || null,
          websiteUrl: websiteUrl || null,
          gbpUrl: gbpUrl || null
        }
      });

      await prisma.organization.update({
        where: { id: session.orgId },
        data: {
          name: name || undefined,
          address: address || null,
          city: city || null,
          state: state || null,
          websiteUrl: websiteUrl || null
        }
      });

      return toRedirect(req, 'location');
    }

    if (type === 'keyword') {
      const term = sanitizeInput(String(form.get('term') || ''), 120).toLowerCase();
      if (!term) return toRedirect(req, 'keyword', false);
      const location = await getOrCreatePrimaryLocation(session.orgId);
      await prisma.trackedKeyword.upsert({
        where: {
          locationId_term: {
            locationId: location.id,
            term
          }
        },
        update: {
          isActive: true,
          source: 'manual'
        },
        create: {
          orgId: session.orgId,
          locationId: location.id,
          term,
          source: 'manual',
          isActive: true
        }
      });
      return toRedirect(req, 'keyword');
    }

    if (type === 'competitor') {
      const name = sanitizeInput(String(form.get('name') || ''), 120);
      const websiteUrlInput = sanitizeInput(String(form.get('websiteUrl') || ''), 240);
      const websiteUrl = websiteUrlInput ? normalizeWebsiteUrl(websiteUrlInput) : null;
      if (!name || isLikelyNonShopCompetitor(name, websiteUrl)) return toRedirect(req, 'competitor', false);
      const location = await getOrCreatePrimaryLocation(session.orgId);
      const org = await prisma.organization.findUnique({
        where: { id: session.orgId },
        select: { city: true, state: true, verticalDefault: true }
      });
      const competitorShop = await resolveCompetitorShop({
        name,
        websiteUrl,
        city: location.city || org?.city || null,
        state: location.state || org?.state || null,
        vertical: org?.verticalDefault || 'collision'
      });

      const existing = await prisma.trackedCompetitor.findFirst({
        where: { orgId: session.orgId, locationId: location.id, name }
      });

      if (existing) {
        await prisma.trackedCompetitor.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            websiteUrl: websiteUrl || existing.websiteUrl,
            shopId: competitorShop.id,
            source: 'manual'
          }
        });
      } else {
        await prisma.trackedCompetitor.create({
          data: {
            orgId: session.orgId,
            locationId: location.id,
            shopId: competitorShop.id,
            name,
            websiteUrl: websiteUrl || null,
            source: 'manual',
            isActive: true
          }
        });
      }

      return toRedirect(req, 'competitor');
    }

    return toRedirect(req, 'unknown', false);
  } catch {
    return toRedirect(req, type || 'unknown', false);
  }
}
