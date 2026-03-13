import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { resolveCompetitorShop } from '@/lib/shop-data';

export async function getOrCreatePrimaryLocation(orgId: string) {
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

export function revalidateDashboardPaths() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/rankings');
  revalidatePath('/dashboard/competitors');
  revalidatePath('/dashboard/settings');
}

export async function upsertTrackedKeyword({
  orgId,
  locationId,
  term,
  source
}: {
  orgId: string;
  locationId: string;
  term: string;
  source: string;
}) {
  return prisma.trackedKeyword.upsert({
    where: {
      locationId_term: {
        locationId,
        term
      }
    },
    update: {
      isActive: true,
      source
    },
    create: {
      orgId,
      locationId,
      term,
      source,
      isActive: true
    }
  });
}

export async function upsertTrackedCompetitor({
  orgId,
  locationId,
  name,
  websiteUrl,
  city,
  state,
  vertical,
  source
}: {
  orgId: string;
  locationId: string;
  name: string;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
  vertical: string;
  source: string;
}) {
  const shop = await resolveCompetitorShop({
    name,
    websiteUrl: websiteUrl || null,
    city: city || null,
    state: state || null,
    vertical
  });

  const existing = await prisma.trackedCompetitor.findFirst({
    where: { orgId, locationId, name }
  });

  if (existing) {
    return prisma.trackedCompetitor.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        websiteUrl: websiteUrl || existing.websiteUrl,
        shopId: shop.id,
        source
      }
    });
  }

  return prisma.trackedCompetitor.create({
    data: {
      orgId,
      locationId,
      shopId: shop.id,
      name,
      websiteUrl: websiteUrl || null,
      source,
      isActive: true
    }
  });
}
