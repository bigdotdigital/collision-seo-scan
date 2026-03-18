import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { logEnvWarningsOnce } from '@/lib/env-check';
import { sanitizeInput } from '@/lib/security/url';
import { checkScanRateLimit } from '@/lib/security/rate-limit';
import { checkScanSubmissionGuard } from '@/lib/security/scan-submit-guard';
import { scanInputSchema } from '@/lib/validation';
import { upsertLead, upsertOrganizationFromInput, createScanRecord } from '@/lib/org-data';
import { normalizeScanWebsiteUrl } from '@/lib/scan-workflow';
import { enqueueScanExecution, scanLifecycleLog } from '@/lib/scan-queue';

export const dynamic = 'force-dynamic';

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function appBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin || 'http://localhost:3000';
}

function badRequest(message: string, traceId: string, status = 400) {
  return NextResponse.json({ error: message, traceId }, { status });
}

function cleanedInput(input: ReturnType<typeof scanInputSchema.parse>) {
  return {
    city: sanitizeInput(input.city_or_zip, 80),
    shop: sanitizeInput(input.shop_name, 120),
    email: sanitizeInput(input.email || '', 160),
    phone: sanitizeInput(input.phone || '', 40)
  };
}

export async function POST(req: Request) {
  const traceId = randomUUID();

  try {
    logEnvWarningsOnce();

    const body = await req.json();
    const input = scanInputSchema.parse(body);
    const clean = cleanedInput(input);
    const websiteUrl = normalizeScanWebsiteUrl(String(input.website_url || ''));

    if (!websiteUrl) {
      return badRequest('Invalid website URL', traceId);
    }

    const submissionGuard = await checkScanSubmissionGuard({ websiteUrl });
    if (!submissionGuard.ok) {
      const baseUrl = appBaseUrl(req);
      const existingReportUrl = submissionGuard.existingScanId ? `${baseUrl}/report/${submissionGuard.existingScanId}` : `${baseUrl}/collision`;

      return NextResponse.json(
        {
          ok: true,
          queued: false,
          reused: true,
          traceId,
          scanId: submissionGuard.existingScanId || null,
          reportUrl: existingReportUrl,
          nextUrl: existingReportUrl,
          statusUrl: submissionGuard.existingScanId ? `${baseUrl}/api/scan/${submissionGuard.existingScanId}` : null,
          monitoringUrl: null,
          score: null,
          emailSent: false,
          emailReason:
            submissionGuard.reason === 'scan_in_progress'
              ? 'A scan is already in progress for this site. Opening the active report.'
              : 'A recent scan already exists for this site. Opening the latest report.',
          snapshotId: null
        },
        {
          status: 200,
          headers: submissionGuard.retryAfterSec ? { 'Retry-After': String(submissionGuard.retryAfterSec) } : undefined
        }
      );
    }

    const limit = checkScanRateLimit(`scan:${clientIp(req)}`);
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: 'Too many new scans from this network right now. Please try again shortly.',
          traceId
        },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSec || 60) }
        }
      );
    }

    if (clean.city.length < 2 || clean.shop.length < 2) {
      return badRequest('City and shop name must be at least 2 characters.', traceId);
    }

    const org = await upsertOrganizationFromInput({
      shop_name: clean.shop,
      website_url: websiteUrl,
      phone: clean.phone || null,
      city_or_zip: clean.city,
      vertical: input.vertical
    });

    const scan = await createScanRecord(
      {
        website_url: websiteUrl,
        city_or_zip: clean.city,
        shop_name: clean.shop,
        email: clean.email || '',
        phone: clean.phone || '',
        vertical: input.vertical,
        executionStatus: 'queued',
        traceId,
        queuedAt: new Date()
      },
      org.id,
      org.shopId || undefined
    );

    if (clean.email || clean.phone) {
      await upsertLead({
        organizationId: org.id,
        scanId: scan.id,
        email: clean.email || null,
        phone: clean.phone || null,
        source: 'scan_gate',
        consented: input.consented,
        vertical: input.vertical
      });
    }

    await enqueueScanExecution({
      scanId: scan.id,
      traceId,
      payload: {
        source: 'public_scan',
        city: clean.city,
        shopName: clean.shop
      }
    });

    scanLifecycleLog('queued', {
      traceId,
      scanId: scan.id,
      organizationId: org.id,
      shopId: org.shopId || null
    });

    const baseUrl = appBaseUrl(req);
    const reportPath = `${baseUrl}/report/${scan.id}`;
    const statusUrl = `${baseUrl}/api/scan/${scan.id}`;
    const monitoringUrl = `${baseUrl}/monitoring?scanId=${encodeURIComponent(scan.id)}&orgId=${encodeURIComponent(org.id)}`;

    return NextResponse.json({
      ok: true,
      queued: true,
      traceId,
      scanId: scan.id,
      reportUrl: reportPath,
      nextUrl: reportPath,
      statusUrl,
      monitoringUrl,
      score: null,
      emailSent: false,
      emailReason: clean.email ? 'Scan queued. Report email will send after completion.' : 'No email provided',
      snapshotId: null
    });
  } catch (error) {
    console.error('[scan:queue-submit:error]', { traceId, error });
    return badRequest('Scan failed. Please retry in a moment.', traceId, 500);
  }
}
