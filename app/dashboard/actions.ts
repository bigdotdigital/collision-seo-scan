'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { refreshOrganizationScan } from '@/lib/dashboard-refresh';

export async function refreshDashboardData() {
  const ctx = await requireDashboardContext();

  const [org, location] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        name: true,
        websiteUrl: true,
        city: true,
        state: true,
        phone: true,
        verticalDefault: true,
        address: true
      }
    }),
    prisma.location.findFirst({
      where: { orgId: ctx.orgId, isPrimary: true },
      select: {
        name: true,
        websiteUrl: true,
        city: true,
        state: true,
        address: true
      }
    })
  ]);

  const shopName = location?.name || org?.name || '';
  const websiteUrl = location?.websiteUrl || org?.websiteUrl || '';
  const city = location?.city || org?.city || '';
  const state = location?.state || org?.state || null;
  const address = location?.address || org?.address || null;

  if (!shopName || !websiteUrl || !city) {
    redirect('/dashboard?refresh=missing');
  }

  try {
    await refreshOrganizationScan({
      orgId: ctx.orgId,
      shopName,
      websiteUrl,
      city,
      state,
      address,
      phone: org?.phone || null,
      vertical: org?.verticalDefault || 'collision'
    });
  } catch (error) {
    console.error('[dashboard:refresh:error]', {
      orgId: ctx.orgId,
      error: error instanceof Error ? error.message : 'unknown'
    });
    redirect('/dashboard?refresh=error');
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/rankings');
  revalidatePath('/dashboard/competitors');
  revalidatePath('/dashboard/reports');
  redirect('/dashboard?refresh=done');
}
