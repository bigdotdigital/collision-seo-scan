'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import { hashPortalPassword, verifyPortalPassword } from '@/lib/client-auth';
import { isLikelyNonShopCompetitor } from '@/lib/competitor-filter';
import { deriveCompetitorSuggestions, deriveKeywordSuggestions } from '@/lib/dashboard-suggestions';
import { toJson } from '@/lib/json';
import { resolveCompetitorShop } from '@/lib/shop-data';

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

function revalidateDashboardPaths() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/rankings');
  revalidatePath('/dashboard/competitors');
  revalidatePath('/dashboard/settings');
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

  revalidateDashboardPaths();
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

  revalidateDashboardPaths();
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
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { city: true, state: true, verticalDefault: true }
  });
  const competitorShop = await resolveCompetitorShop({
    name,
    websiteUrl: websiteUrl || null,
    city: location.city || org?.city || null,
    state: location.state || org?.state || null,
    vertical: org?.verticalDefault || 'collision'
  });

  const existing = await prisma.trackedCompetitor.findFirst({
    where: { orgId: ctx.orgId, locationId: location.id, name }
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
        orgId: ctx.orgId,
        locationId: location.id,
        shopId: competitorShop.id,
        name,
        websiteUrl: websiteUrl || null,
        source: 'manual',
        isActive: true
      }
    });
  }

  revalidateDashboardPaths();
  if (nextPath.startsWith('/dashboard/')) {
    redirect(nextPath);
  }
}

export async function importLatestScanSuggestions(formData: FormData) {
  const ctx = await requireDashboardContext();
  const importType = String(formData.get('importType') || 'all');
  const nextPath = String(formData.get('nextPath') || '/dashboard/settings');
  const location = await getOrCreatePrimaryLocation(ctx.orgId);

  const [org, latestScan] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { name: true, city: true, state: true, websiteUrl: true, verticalDefault: true }
    }),
    prisma.scan.findFirst({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        shopName: true,
        city: true,
        websiteUrl: true,
        moneyKeywordsJson: true,
        competitorsJson: true,
        rawChecksJson: true
      }
    })
  ]);

  if (!latestScan) {
    redirect(`${nextPath}?support=error&reason=no_scan`);
  }

  if (importType === 'all' || importType === 'keywords') {
    const keywordSuggestions = await deriveKeywordSuggestions({
      shopName: latestScan.shopName || org?.name || 'Shop',
      city: latestScan.city || org?.city || '',
      websiteUrl: latestScan.websiteUrl || org?.websiteUrl || '',
      moneyKeywordsJson: latestScan.moneyKeywordsJson,
      competitorsJson: latestScan.competitorsJson,
      rawChecksJson: latestScan.rawChecksJson,
      allowAi: true
    });

    for (const suggestion of keywordSuggestions.slice(0, 12)) {
      await prisma.trackedKeyword.upsert({
        where: {
          locationId_term: {
            locationId: location.id,
            term: suggestion.term
          }
        },
        update: {
          isActive: true,
          source: suggestion.note.includes('AI-assisted') ? 'ai_suggested' : 'scan_suggested'
        },
        create: {
          orgId: ctx.orgId,
          locationId: location.id,
          term: suggestion.term,
          source: suggestion.note.includes('AI-assisted') ? 'ai_suggested' : 'scan_suggested',
          isActive: true
        }
      });
    }
  }

  if (importType === 'all' || importType === 'competitors') {
    const competitorSuggestions = deriveCompetitorSuggestions({
      shopName: latestScan.shopName || org?.name || 'Shop',
      city: latestScan.city || org?.city || '',
      websiteUrl: latestScan.websiteUrl || org?.websiteUrl || '',
      competitorsJson: latestScan.competitorsJson,
      rawChecksJson: latestScan.rawChecksJson
    });

    for (const suggestion of competitorSuggestions.slice(0, 6)) {
      const existing = await prisma.trackedCompetitor.findFirst({
        where: { orgId: ctx.orgId, locationId: location.id, name: suggestion.name }
      });
      if (existing) {
        await prisma.trackedCompetitor.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            websiteUrl: suggestion.websiteUrl || existing.websiteUrl,
            shopId: (
              await resolveCompetitorShop({
                name: suggestion.name,
                websiteUrl: suggestion.websiteUrl,
                city: latestScan.city || org?.city || null,
                state: org?.state || null,
                vertical: org?.verticalDefault || 'collision'
              })
            ).id,
            source: 'scan_suggested'
          }
        });
      } else {
        const competitorShop = await resolveCompetitorShop({
          name: suggestion.name,
          websiteUrl: suggestion.websiteUrl,
          city: latestScan.city || org?.city || null,
          state: org?.state || null,
          vertical: org?.verticalDefault || 'collision'
        });
        await prisma.trackedCompetitor.create({
          data: {
            orgId: ctx.orgId,
            locationId: location.id,
            shopId: competitorShop.id,
            name: suggestion.name,
            websiteUrl: suggestion.websiteUrl || null,
            source: 'scan_suggested',
            isActive: true
          }
        });
      }
    }
  }

  revalidateDashboardPaths();
  redirect(`${nextPath}?support=imported`);
}

export async function createSupportTicket(formData: FormData) {
  const ctx = await requireDashboardContext();
  const subject = String(formData.get('subject') || '').trim();
  const message = String(formData.get('message') || '').trim();
  const priority = String(formData.get('priority') || 'normal').trim();

  if (!subject || !message) {
    redirect('/dashboard/settings?support=error&reason=missing_fields');
  }

  const user = ctx.userId.startsWith('legacy-client-')
    ? null
    : await prisma.user.findUnique({
        where: { id: ctx.userId },
        select: { email: true, name: true }
      });

  await prisma.queueJob.create({
    data: {
      runAt: new Date(),
      type: 'dashboard_support_ticket',
      status: 'pending',
      payloadJson: toJson({
        orgId: ctx.orgId,
        userId: ctx.userId,
        subject,
        message,
        priority,
        requesterEmail: user?.email || null,
        requesterName: user?.name || null
      })
    }
  });

  redirect('/dashboard/settings?support=ok');
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
