import { prisma } from '@/lib/prisma';
import { sendReportEmail } from '@/lib/email';
import { toJson } from '@/lib/json';
import { prepareScan, savePreparedScan } from '@/lib/scan-workflow';
import { completeQueueJob, failQueueJob, scanLifecycleLog } from '@/lib/scan-queue';

async function queueFollowup(scanId: string, reportUrl: string) {
  await prisma.queueJob.create({
    data: {
      type: 'followup_email',
      runAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scanId,
      status: 'pending',
      payloadJson: toJson({ reportUrl })
    }
  });
}

export async function runScanExecutionJob(job: {
  id: string;
  scanId: string | null;
  traceId: string | null;
  attempts: number;
  maxAttempts: number;
}) {
  if (!job.scanId) {
    await failQueueJob({
      id: job.id,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error: new Error('Missing scan id on scan job')
    });
    return { ok: false as const, reason: 'missing_scan_id' };
  }

  const scan = await prisma.scan.findUnique({
    where: { id: job.scanId },
    select: {
      id: true,
      organizationId: true,
      shopId: true,
      shopName: true,
      city: true,
      websiteUrl: true,
      email: true,
      phone: true,
      vertical: true,
      organization: {
        select: {
          address: true,
          state: true
        }
      }
    }
  });

  if (!scan?.organizationId) {
    await failQueueJob({
      id: job.id,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error: new Error('Queued scan is missing organization context')
    });
    return { ok: false as const, reason: 'missing_org' };
  }

  const startedAt = new Date();
  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      executionStatus: 'running',
      startedAt,
      executionAttempts: { increment: 1 },
      errorType: null,
      errorMessage: null
    }
  });

  scanLifecycleLog('start', {
    scanId: scan.id,
    traceId: job.traceId,
    organizationId: scan.organizationId,
    shopId: scan.shopId,
    attempt: job.attempts
  });

  try {
    const prepared = await prepareScan({
      shopName: scan.shopName,
      websiteUrl: scan.websiteUrl,
      city: scan.city,
      state: scan.organization?.state || null,
      address: scan.organization?.address || null,
      phone: scan.phone || null,
      vertical: scan.vertical
    });

    const saved = await savePreparedScan({
      scanId: scan.id,
      orgId: scan.organizationId,
      shopName: scan.shopName,
      city: scan.city,
      state: scan.organization?.state || null,
      address: scan.organization?.address || null,
      phone: scan.phone || null,
      email: scan.email || null,
      vertical: scan.vertical,
      prepared,
      conversionSource: 'scan_submission',
      conversionValue: {
        scoreTotal: prepared.result.scores.total,
        emailCaptured: Boolean(scan.email),
        phoneCaptured: Boolean(scan.phone)
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const reportUrl = `${baseUrl}/report/${saved.scan.id}`;

    if (scan.email) {
      await sendReportEmail({
        to: scan.email,
        shopName: scan.shopName,
        score: prepared.result.scores.total,
        reportUrl,
        categoryScores: prepared.result.categoryScores,
        topFixes: prepared.result.topFixes,
        detectedSignals: prepared.result.detectedSignals.map((signal) => signal.signal_name),
        missingSignals: prepared.result.missingSignals
      });
      await queueFollowup(saved.scan.id, reportUrl);
    }

    await completeQueueJob(job.id);
    scanLifecycleLog('complete', {
      scanId: saved.scan.id,
      traceId: job.traceId,
      organizationId: scan.organizationId,
      shopId: saved.shop.id,
      durationMs: saved.scan.durationMs
    });

    return { ok: true as const, scanId: saved.scan.id };
  } catch (error) {
    const finishedAt = new Date();
    await prisma.scan.update({
      where: { id: scan.id },
      data: {
        executionStatus: 'failed',
        finishedAt,
        durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
        errorType: error instanceof Error ? error.name : 'ScanExecutionError',
        errorMessage: error instanceof Error ? error.message : 'Unknown scan failure'
      }
    });

    await failQueueJob({
      id: job.id,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error
    });

    scanLifecycleLog('failed', {
      scanId: scan.id,
      traceId: job.traceId,
      organizationId: scan.organizationId,
      shopId: scan.shopId,
      error: error instanceof Error ? error.message : 'Unknown scan failure'
    });

    return { ok: false as const, reason: 'scan_failed' };
  }
}
