import { prisma } from '@/lib/prisma';
import { createMetricSnapshot } from '@/lib/client-services';
import { sendFollowupEmail } from '@/lib/email';
import { parseJson } from '@/lib/json';
import { collectRankSnapshotsForOrg } from '@/lib/rank-snapshot-engine';
import { generateAlertsForOrg } from '@/lib/alerts';

export async function processFollowupQueue(baseUrl: string) {
  const dueJobs = await prisma.queueJob.findMany({
    where: {
      status: 'pending',
      type: 'followup_email',
      runAt: { lte: new Date() }
    },
    orderBy: { runAt: 'asc' },
    take: 50
  });

  let processed = 0;

  for (const job of dueJobs) {
    processed += 1;
    try {
      await prisma.queueJob.update({
        where: { id: job.id },
        data: { status: 'processing', attempts: { increment: 1 } }
      });

      const scan = job.scanId
        ? await prisma.scan.findUnique({ where: { id: job.scanId } })
        : null;

      if (!scan || !scan.email || scan.bookedClicked || scan.followupSent) {
        await prisma.queueJob.update({
          where: { id: job.id },
          data: {
            status: 'done',
            processedAt: new Date(),
            error: 'Skipped (missing email / already booked / already sent)'
          }
        });
        continue;
      }

      const payload = parseJson<{ reportUrl?: string } | null>(job.payloadJson, null);
      const reportUrl = payload?.reportUrl || `${baseUrl}/report/${scan.id}`;

      await sendFollowupEmail({
        to: scan.email,
        shopName: scan.shopName,
        reportUrl
      });

      await prisma.scan.update({
        where: { id: scan.id },
        data: { followupSent: true }
      });

      await prisma.queueJob.update({
        where: { id: job.id },
        data: {
          status: 'done',
          processedAt: new Date(),
          error: null
        }
      });
    } catch (error) {
      await prisma.queueJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown failure',
          processedAt: new Date()
        }
      });
    }
  }

  return { processed };
}

export async function runWeeklyRefresh() {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  let snapshotsCreated = 0;

  for (const client of clients) {
    const created = await createMetricSnapshot(client.id);
    if (created) snapshotsCreated += 1;
  }

  return { clients: clients.length, snapshotsCreated };
}

export async function runRankSnapshotCollect() {
  const orgs = await prisma.organization.findMany({
    where: { locations: { some: {} }, trackedKeywords: { some: { isActive: true } } },
    select: { id: true }
  });

  let processed = 0;
  let inserted = 0;
  const skipped: string[] = [];

  for (const org of orgs) {
    const result = await collectRankSnapshotsForOrg({ orgId: org.id });
    if (!result.ok) {
      skipped.push(`${org.id}:${result.reason}`);
      continue;
    }
    processed += 1;
    inserted += result.inserted;
  }

  return { organizations: orgs.length, processed, inserted, skipped };
}

export async function runAlertGeneration() {
  const orgs = await prisma.organization.findMany({
    where: { rankSnapshots: { some: {} } },
    select: { id: true }
  });

  let processed = 0;
  let alertsCreated = 0;
  const skipped: string[] = [];

  for (const org of orgs) {
    const result = await generateAlertsForOrg(org.id);
    if (!result.ok) {
      skipped.push(`${org.id}:${result.reason}`);
      continue;
    }
    processed += 1;
    alertsCreated += result.created;
  }

  return { organizations: orgs.length, processed, alertsCreated, skipped };
}

export async function runAlertDigestSend() {
  const prefs = await prisma.alertPreference.findMany({
    where: {
      digestFrequency: { not: 'off' }
    },
    select: {
      orgId: true,
      digestEmail: true
    }
  });

  let processed = 0;
  let alertsMarked = 0;

  for (const pref of prefs) {
    if (!pref.digestEmail) continue;

    const pending = await prisma.alert.findMany({
      where: {
        orgId: pref.orgId,
        digestSentAt: null
      },
      take: 200,
      orderBy: { createdAt: 'asc' }
    });

    if (pending.length === 0) continue;

    await prisma.alert.updateMany({
      where: {
        id: { in: pending.map((row) => row.id) }
      },
      data: {
        digestSentAt: new Date()
      }
    });

    processed += 1;
    alertsMarked += pending.length;
  }

  return { organizationsProcessed: processed, alertsMarked };
}
