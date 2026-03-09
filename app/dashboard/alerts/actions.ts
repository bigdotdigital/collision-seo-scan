'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireDashboardContext } from '@/lib/dashboard-auth';
import type { DigestFrequency } from '@prisma/client';

export async function saveAlertPreferences(formData: FormData) {
  const ctx = await requireDashboardContext();

  const rankThresholdRaw = Number(String(formData.get('rankDropThreshold') || '3'));
  const rankDropThreshold = Number.isFinite(rankThresholdRaw)
    ? Math.min(20, Math.max(1, Math.round(rankThresholdRaw)))
    : 3;

  const digestFrequency = (() => {
    const raw = String(formData.get('digestFrequency') || 'daily');
    if (raw === 'off' || raw === 'weekly' || raw === 'daily') return raw as DigestFrequency;
    return 'daily' as DigestFrequency;
  })();

  const competitorMoveEnabled = formData.get('competitorMoveEnabled') === 'on';
  const newCompetitorEnabled = formData.get('newCompetitorEnabled') === 'on';
  const gbpIssueEnabled = formData.get('gbpIssueEnabled') === 'on';

  await prisma.alertPreference.upsert({
    where: { orgId: ctx.orgId },
    update: {
      rankDropThreshold,
      rankGainThreshold: rankDropThreshold,
      competitorMoveEnabled,
      newCompetitorEnabled,
      gbpIssueEnabled,
      digestFrequency
    },
    create: {
      orgId: ctx.orgId,
      rankDropThreshold,
      rankGainThreshold: rankDropThreshold,
      competitorMoveEnabled,
      newCompetitorEnabled,
      gbpIssueEnabled,
      digestFrequency
    }
  });

  revalidatePath('/dashboard/alerts');
  revalidatePath('/dashboard/settings');
}

