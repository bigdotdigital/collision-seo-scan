'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';

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

export async function saveLocationDetails(formData: FormData) {
  const ctx = await requireDashboardContext();
  const name = String(formData.get('name') || '').trim();
  const address = String(formData.get('address') || '').trim();
  const city = String(formData.get('city') || '').trim();
  const state = String(formData.get('state') || '').trim();
  const websiteUrl = String(formData.get('websiteUrl') || '').trim();
  const gbpUrl = String(formData.get('gbpUrl') || '').trim();
  const nextPath = String(formData.get('nextPath') || '').trim();

  const location = await getOrCreatePrimaryLocation(ctx.orgId);

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
    where: { id: ctx.orgId },
    data: {
      name: name || undefined,
      address: address || null,
      city: city || null,
      state: state || null,
      websiteUrl: websiteUrl || null
    }
  });

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard');
  if (nextPath.startsWith('/dashboard/')) {
    redirect(nextPath);
  }
}

export async function addTrackedKeyword(formData: FormData) {
  const ctx = await requireDashboardContext();
  const term = String(formData.get('term') || '').trim().toLowerCase();
  const nextPath = String(formData.get('nextPath') || '').trim();
  if (!term) return;

  const location = await getOrCreatePrimaryLocation(ctx.orgId);

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
      orgId: ctx.orgId,
      locationId: location.id,
      term,
      source: 'manual',
      isActive: true
    }
  });

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/rankings');
  revalidatePath('/dashboard');
  if (nextPath.startsWith('/dashboard/')) {
    redirect(nextPath);
  }
}

export async function addTrackedCompetitor(formData: FormData) {
  const ctx = await requireDashboardContext();
  const name = String(formData.get('name') || '').trim();
  const websiteUrl = String(formData.get('websiteUrl') || '').trim();
  const nextPath = String(formData.get('nextPath') || '').trim();
  if (!name) return;

  const location = await getOrCreatePrimaryLocation(ctx.orgId);

  const existing = await prisma.trackedCompetitor.findFirst({
    where: { orgId: ctx.orgId, locationId: location.id, name }
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
        orgId: ctx.orgId,
        locationId: location.id,
        name,
        websiteUrl: websiteUrl || null,
        source: 'manual',
        isActive: true
      }
    });
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/competitors');
  revalidatePath('/dashboard');
  if (nextPath.startsWith('/dashboard/')) {
    redirect(nextPath);
  }
}
