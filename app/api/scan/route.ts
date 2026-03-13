import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReportEmail } from '@/lib/email';
import { toJson } from '@/lib/json';
import { saveScanRecord, type ScanRecord } from '@/lib/scan-store';
import { logEnvWarningsOnce } from '@/lib/env-check';
import { checkScanRateLimit } from '@/lib/security/rate-limit';
import { sanitizeInput } from '@/lib/security/url';
import { upsertLead, upsertOrganizationFromInput } from '@/lib/org-data';
import { scanInputSchema } from '@/lib/validation';
import { prepareScan, normalizeScanWebsiteUrl, savePreparedScan } from '@/lib/scan-workflow';

export const dynamic = 'force-dynamic';

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
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

function memoryScan(args: {
  scanId: string;
  shopName: string;
  city: string;
  email: string;
  phone: string;
  prepared: Awaited<ReturnType<typeof prepareScan>>;
}) {
  const result = args.prepared.result;
  const record: ScanRecord = {
    id: args.scanId,
    createdAt: new Date().toISOString(),
    url: args.prepared.websiteUrl,
    shopName: args.shopName,
    city: args.city,
    email: args.email || null,
    phone: args.phone || null,
    pagespeed: args.prepared.pagespeed,
    scoreTotal: result.scores.total,
    scoreWebsite: result.scores.website,
    scoreLocal: result.scores.local,
    scoreIntent: result.scores.intent,
    issues: result.scores.issues,
    moneyKeywords: result.moneyKeywords,
    competitors: result.competitors,
    thirtyDayPlan: result.thirtyDayPlan,
    aiSummary: result.aiSummary || null,
    rawChecks: {
      ...args.prepared.reportPayload
    }
  };

  saveScanRecord(record);
}

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

async function sendReport(args: {
  email: string;
  shopName: string;
  reportUrl: string;
  prepared: Awaited<ReturnType<typeof prepareScan>>;
}) {
  return sendReportEmail({
    to: args.email,
    shopName: args.shopName,
    score: args.prepared.result.scores.total,
    reportUrl: args.reportUrl,
    categoryScores: args.prepared.result.categoryScores,
    topFixes: args.prepared.result.topFixes,
    detectedSignals: args.prepared.result.detectedSignals.map((signal) => signal.signal_name),
    missingSignals: args.prepared.result.missingSignals
  });
}

export async function POST(req: Request) {
  const traceId = randomUUID();

  try {
    logEnvWarningsOnce();

    const limit = checkScanRateLimit(`scan:${clientIp(req)}`);
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: 'Too many scans from this network. Please try again in a minute.',
          traceId
        },
        {
          status: 429,
          headers: { 'Retry-After': String(limit.retryAfterSec || 60) }
        }
      );
    }

    const body = await req.json();
    const input = scanInputSchema.parse(body);
    const clean = cleanedInput(input);
    const websiteUrl = normalizeScanWebsiteUrl(String(input.website_url || ''));

    if (!websiteUrl) {
      return badRequest('Invalid website URL', traceId);
    }

    if (clean.city.length < 2 || clean.shop.length < 2) {
      return badRequest('City and shop name must be at least 2 characters.', traceId);
    }

    const prepared = await prepareScan({
      shopName: clean.shop,
      websiteUrl,
      city: clean.city,
      phone: clean.phone || null,
      vertical: input.vertical,
      capabilities: {
        hasICar: input.has_i_car,
        hasOEM: input.has_oem,
        hasAdas: input.has_adas,
        hasAluminum: input.has_aluminum
      }
    });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      const googlePlace = prepared.googlePlaceResult.profile;
      const org = await upsertOrganizationFromInput({
        shop_name: clean.shop,
        website_url: prepared.websiteUrl,
        phone: clean.phone || googlePlace?.nationalPhoneNumber || null,
        city_or_zip: clean.city,
        vertical: input.vertical,
        googlePlaceId: googlePlace?.placeId || undefined,
        address: googlePlace?.formattedAddress || undefined,
        city: googlePlace?.city || undefined,
        state: googlePlace?.state || undefined,
        lat: googlePlace?.lat || undefined,
        lng: googlePlace?.lng || undefined,
        primaryCategory: googlePlace?.primaryTypeDisplayName || undefined
      });

      const saved = await savePreparedScan({
        orgId: org.id,
        shopName: clean.shop,
        city: clean.city,
        state: googlePlace?.state || null,
        address: googlePlace?.formattedAddress || null,
        phone: clean.phone || googlePlace?.nationalPhoneNumber || null,
        email: clean.email || null,
        vertical: input.vertical,
        prepared,
        conversionSource: 'scan_submission',
        conversionValue: {
          scoreTotal: prepared.result.scores.total,
          emailCaptured: Boolean(clean.email),
          phoneCaptured: Boolean(clean.phone)
        }
      });

      if (clean.email || clean.phone) {
        await upsertLead({
          organizationId: org.id,
          scanId: saved.scan.id,
          email: clean.email || null,
          phone: clean.phone || null,
          source: 'scan_gate',
          consented: input.consented,
          vertical: input.vertical
        });
      }

      const reportPath = `/report/${saved.scan.id}`;
      const reportUrl = `${origin}${reportPath}`;
      const monitoringUrl = `/monitoring?scanId=${encodeURIComponent(saved.scan.id)}&orgId=${encodeURIComponent(org.id)}`;

      let emailResult: { sent: boolean; reason?: string } = {
        sent: false,
        reason: 'No email provided'
      };

      if (clean.email) {
        emailResult = await sendReport({
          email: clean.email,
          shopName: clean.shop,
          reportUrl,
          prepared
        });
        await queueFollowup(saved.scan.id, reportUrl);
      }

      return NextResponse.json({
        ok: true,
        scanId: saved.scan.id,
        reportUrl: reportPath,
        nextUrl: reportPath,
        monitoringUrl,
        score: saved.score.visibilityScore,
        emailSent: emailResult.sent,
        emailReason: emailResult.reason || null,
        snapshotId: saved.snapshot.id
      });
    } catch (dbError) {
      console.error('[scan:db-fallback]', dbError);

      const scanId = randomUUID();
      memoryScan({
        scanId,
        shopName: clean.shop,
        city: clean.city,
        email: clean.email,
        phone: clean.phone,
        prepared
      });

      if (clean.email) {
        await sendReport({
          email: clean.email,
          shopName: clean.shop,
          reportUrl: `${origin}/report/${scanId}`,
          prepared
        });
      }

      return NextResponse.json({
        ok: true,
        scanId,
        reportUrl: `/report/${scanId}`,
        nextUrl: `/report/${scanId}`,
        monitoringUrl: `/monitoring?scanId=${encodeURIComponent(scanId)}`,
        score: prepared.pagespeed.performanceScore ?? prepared.result.scores.website,
        emailSent: Boolean(clean.email),
        emailReason: clean.email ? null : 'No email provided',
        snapshotId: null
      });
    }
  } catch (error) {
    console.error('[scan:error]', { traceId, error });
    return badRequest('Scan failed. Please retry in a moment.', traceId);
  }
}
