'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { hashPortalPassword, verifyPortalPassword } from '@/lib/client-auth';
import { isLikelyNonShopCompetitor } from '@/lib/competitor-filter';

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
  if (!name || isLikelyNonShopCompetitor(name, websiteUrl)) {
    redirect('/dashboard/settings?updated=competitor&error=1');
  }

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

export async function saveAccountCredentials(formData: FormData) {
  const ctx = await requireDashboardContext();
  const nextPath = '/dashboard/settings';
  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const name = String(formData.get('name') || '').trim();

  if (!ctx.userId || ctx.userId.startsWith('legacy-client-')) {
    redirect(`${nextPath}?account=error&reason=legacy`);
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, passwordHash: true, name: true }
  });

  if (!user) {
    redirect(`${nextPath}?account=error&reason=missing`);
  }

  if (!currentPassword || !verifyPortalPassword(currentPassword, user.passwordHash)) {
    redirect(`${nextPath}?account=error&reason=current`);
  }

  if (newPassword && newPassword.length < 8) {
    redirect(`${nextPath}?account=error&reason=length`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: name || user.name || undefined,
      passwordHash: newPassword ? hashPortalPassword(newPassword) : undefined
    }
  });

  revalidatePath('/dashboard/settings');
  redirect('/dashboard/settings?account=ok');
}
