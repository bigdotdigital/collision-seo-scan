import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDashboardSession } from '@/lib/client-auth';

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
      const name = String(form.get('name') || '').trim();
      const address = String(form.get('address') || '').trim();
      const city = String(form.get('city') || '').trim();
      const state = String(form.get('state') || '').trim();
      const websiteUrl = String(form.get('websiteUrl') || '').trim();
      const gbpUrl = String(form.get('gbpUrl') || '').trim();

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
      const term = String(form.get('term') || '').trim().toLowerCase();
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
      const name = String(form.get('name') || '').trim();
      const websiteUrl = String(form.get('websiteUrl') || '').trim();
      if (!name) return toRedirect(req, 'competitor', false);
      const location = await getOrCreatePrimaryLocation(session.orgId);

      const existing = await prisma.trackedCompetitor.findFirst({
        where: { orgId: session.orgId, locationId: location.id, name }
      });

      if (existing) {
        await prisma.trackedCompetitor.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            websiteUrl: websiteUrl || existing.websiteUrl,
            source: 'manual'
          }
        });
      } else {
        await prisma.trackedCompetitor.create({
          data: {
            orgId: session.orgId,
            locationId: location.id,
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
