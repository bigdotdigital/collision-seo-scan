import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runScan } from '@/lib/scan-engine';
import { sendReportEmail } from '@/lib/email';
import { parseJson, toJson } from '@/lib/json';
import { toWebsiteUrl } from '@/lib/utils';
import { scanInputSchema } from '@/lib/validation';
import { computeScoreV01 } from '@/lib/scoring';
import { runPageSpeed, type PageSpeedResult } from '@/lib/pagespeed';
import { saveScanRecord, type ScanRecord } from '@/lib/scan-store';
import { logEnvWarningsOnce } from '@/lib/env-check';
import { checkScanRateLimit } from '@/lib/security/rate-limit';
import { buildReportPayload } from '@/lib/report-payload';
import {
  assertPublicHostname,
  normalizeWebsiteUrl,
  sanitizeInput
} from '@/lib/security/url';
import {
  createScanRecord,
  createSnapshot,
  storeRawProviderResponse,
  upsertLead,
  upsertOrganizationFromInput
} from '@/lib/org-data';

export const dynamic = 'force-dynamic';

const EMPTY_PAGESPEED: PageSpeedResult = {
  status: 'error',
  message: 'PageSpeed data is not available for this scan yet.',
  performanceScore: null,
  lcpMs: null,
  cls: null,
  tbtMs: null,
  speedIndexMs: null,
  diagnostics: []
};

async function getRecentSuccessfulPageSpeed(websiteUrl: string): Promise<PageSpeedResult | null> {
  const recent = await prisma.scan.findMany({
    where: { websiteUrl },
    select: { pagespeedJson: true },
    orderBy: { createdAt: 'desc' },
    take: 12
  });

  for (const row of recent) {
    const parsed = parseJson<PageSpeedResult>(row.pagespeedJson, EMPTY_PAGESPEED);
    if (parsed.status === 'ok') return parsed;
  }

  return null;
}

function modeledPageSpeedFromScan(result: Awaited<ReturnType<typeof runScan>>): PageSpeedResult {
  const diagnostics = result.scores.issues.slice(0, 5).map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.why,
    impact:
      issue.severity === 'High'
        ? ('high' as const)
        : issue.severity === 'Med'
          ? ('med' as const)
          : ('low' as const),
    recommendation: issue.fix
  }));

  return {
    status: 'ok',
    message: 'Modeled from on-site checks while live PageSpeed data is unavailable.',
    performanceScore: result.checks.performanceScore,
    lcpMs: null,
    cls: null,
    tbtMs: null,
    speedIndexMs: null,
    diagnostics
  };
}

function validateAndNormalizeUrl(input: string): string | null {
  const candidate = toWebsiteUrl(input);
  if (!candidate) return null;
  return normalizeWebsiteUrl(candidate);
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  const traceId = randomUUID();
  try {
    logEnvWarningsOnce();
    const ip = getClientIp(req);
    const limit = checkScanRateLimit(`scan:${ip}`);
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: 'Too many scans from this network. Please try again in a minute.',
          traceId
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(limit.retryAfterSec || 60)
          }
        }
      );
    }

    const body = await req.json();
    const input = scanInputSchema.parse(body);

    const websiteUrl = validateAndNormalizeUrl(String(input.website_url || ''));
    if (!websiteUrl) {
      return NextResponse.json({ error: 'Invalid website URL', traceId }, { status: 400 });
    }

    await assertPublicHostname(websiteUrl);

    const normalizedCity = sanitizeInput(input.city_or_zip, 80);
    const normalizedShop = sanitizeInput(input.shop_name, 120);
    const normalizedEmail = sanitizeInput(input.email || '', 160);
    const normalizedPhone = sanitizeInput(input.phone || '', 40);

    if (normalizedCity.length < 2 || normalizedShop.length < 2) {
      return NextResponse.json(
        { error: 'City and shop name must be at least 2 characters.', traceId },
        { status: 400 }
      );
    }

    const pagespeedLive = await runPageSpeed(websiteUrl);
    const result = await runScan(
      websiteUrl,
      normalizedCity,
      normalizedShop,
      {
        hasICar: input.has_i_car,
        hasOEM: input.has_oem,
        hasAdas: input.has_adas,
        hasAluminum: input.has_aluminum
      },
      pagespeedLive
    );

    let pagespeed = pagespeedLive;
    let pageSpeedStatus: 'live' | 'cached' | 'modeled' = 'live';
    if (pagespeed.status === 'error') {
      const cached = await getRecentSuccessfulPageSpeed(websiteUrl).catch(() => null);
      if (cached) {
        pagespeed = {
          ...cached,
          message: 'Showing recent PageSpeed data while live test is unavailable.'
        };
        pageSpeedStatus = 'cached';
      } else {
        pagespeed = modeledPageSpeedFromScan(result);
        pageSpeedStatus = 'modeled';
      }
    }
    console.info(`PAGESPEED_STATUS=${pageSpeedStatus} url=${websiteUrl}`);
    const reportPayload = buildReportPayload({
      city: normalizedCity,
      shopName: normalizedShop,
      checks: result.checks,
      categoryScores: result.categoryScores,
      detectedSignals: result.detectedSignals,
      missingSignals: result.missingSignals,
      capabilityMissing: result.capabilityMissing,
      topFixes: result.topFixes,
      competitorAdvantages: result.competitorAdvantages,
      missingPages: result.missingPages,
      pageFetchMeta: result.pageFetchMeta,
      scanDurationMs: result.scanDurationMs,
      competitors: result.competitors,
      sources: {
        pagespeed: pageSpeedStatus,
        serp: result.sources.serp,
        aiSummary: result.sources.aiSummary,
        reviews: 'modeled',
        mapPack: result.sources.serp === 'fallback' ? 'fallback' : 'modeled',
        competitors: result.sources.serp,
        keywords: result.sources.keywords
      }
    });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      const org = await upsertOrganizationFromInput({
        shop_name: normalizedShop,
        website_url: websiteUrl,
        phone: normalizedPhone || null,
        city_or_zip: normalizedCity,
        vertical: input.vertical
      });

      const seedScan = await createScanRecord(
        {
          website_url: websiteUrl,
          city_or_zip: normalizedCity,
          shop_name: normalizedShop,
          email: normalizedEmail || '',
          phone: normalizedPhone || '',
          has_i_car: input.has_i_car,
          has_oem: input.has_oem,
          has_adas: input.has_adas,
          has_aluminum: input.has_aluminum,
          vertical: input.vertical
        },
        org.id
      );

      const scan = await prisma.scan.update({
        where: { id: seedScan.id },
        data: {
          scoreTotal: result.scores.total,
          scoreWebsite: result.scores.website,
          scoreLocal: result.scores.local,
          scoreIntent: result.scores.intent,
          issuesJson: toJson(result.scores.issues),
          moneyKeywordsJson: toJson(result.moneyKeywords),
          competitorsJson: toJson(result.competitors),
          rawChecksJson: toJson(reportPayload),
          pagespeedJson: toJson(pagespeed),
          aiSummary: result.aiSummary || null,
          thirtyDayPlanJson: toJson(result.thirtyDayPlan)
        }
      });

      await Promise.all([
        storeRawProviderResponse({
          scanId: scan.id,
          organizationId: org.id,
          provider: 'website_audit',
          endpoint: 'runScan',
          cacheKey: `website:${websiteUrl}`,
          request: {
            websiteUrl,
            city: input.city_or_zip,
            shop: input.shop_name,
            vertical: input.vertical
          },
          response: result
        }),
        storeRawProviderResponse({
          scanId: scan.id,
          organizationId: org.id,
          provider: 'pagespeed',
          endpoint: 'runPagespeed',
          cacheKey: `pagespeed:mobile:${websiteUrl}`,
          request: {
            websiteUrl,
            strategy: 'mobile',
            categories: ['performance', 'seo', 'best-practices', 'accessibility']
          },
          response: pagespeed
        })
      ]);

      const rankPositions: Record<string, number | null> = {};
      result.moneyKeywords.forEach((item, idx) => {
        rankPositions[item.keyword] = idx < 3 ? idx + 3 : null;
      });

      const scoreV01 = computeScoreV01({
        reviewCount: null,
        reviewRating: null,
        rankPositions,
        hasWebsite: Boolean(websiteUrl)
      });

      const snapshot = await createSnapshot({
        scanId: scan.id,
        organizationId: org.id,
        visibilityScore: scoreV01.visibilityScore,
        scoringModelVersion: scoreV01.scoringModelVersion,
        reviewCount: null,
        reviewRating: null,
        keywordsChecked: result.moneyKeywords.map((k) => k.keyword),
        rankPositions,
        topCompetitors: result.competitors,
        lostDemandEstimate: {
          modeledFromScore: scan.scoreTotal,
          categoryScores: result.categoryScores
        },
        recommendations: result.topFixes,
        componentScores: scoreV01.componentScores,
        vertical: input.vertical
      });

      if (normalizedEmail || normalizedPhone) {
        await upsertLead({
          organizationId: org.id,
          scanId: scan.id,
          email: normalizedEmail || null,
          phone: normalizedPhone || null,
          source: 'scan_gate',
          consented: input.consented,
          vertical: input.vertical
        });
      }

      const reportUrl = `${origin}/report/${scan.id}`;

      let emailResult: { sent: boolean; reason?: string } = {
        sent: false,
        reason: 'No email provided'
      };

      if (normalizedEmail) {
        emailResult = await sendReportEmail({
          to: normalizedEmail,
          shopName: normalizedShop,
          score: result.scores.total,
          reportUrl,
          categoryScores: result.categoryScores,
          topFixes: result.topFixes,
          detectedSignals: result.detectedSignals.map((s) => s.signal_name),
          missingSignals: result.missingSignals
        });

        await prisma.queueJob.create({
          data: {
            type: 'followup_email',
            runAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            scanId: scan.id,
            status: 'pending',
            payloadJson: toJson({ reportUrl })
          }
        });
      }

      return NextResponse.json({
        ok: true,
        scanId: scan.id,
        reportUrl: `/report/${scan.id}`,
        score: scoreV01.visibilityScore,
        emailSent: emailResult.sent,
        emailReason: emailResult.reason || null,
        snapshotId: snapshot.id
      });
    } catch (dbError) {
      console.error('[scan:db-fallback]', dbError);

      const scanId = randomUUID();
      const memoryRecord: ScanRecord = {
        id: scanId,
        createdAt: new Date().toISOString(),
        url: websiteUrl,
        shopName: normalizedShop,
        city: normalizedCity,
        email: normalizedEmail || null,
        phone: normalizedPhone || null,
        pagespeed,
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
          ...reportPayload
        }
      };

      saveScanRecord(memoryRecord);

      if (normalizedEmail) {
        const reportUrl = `${origin}/report/${scanId}`;
        await sendReportEmail({
          to: normalizedEmail,
          shopName: normalizedShop,
          score: result.scores.total,
          reportUrl,
          categoryScores: result.categoryScores,
          topFixes: result.topFixes,
          detectedSignals: result.detectedSignals.map((s) => s.signal_name),
          missingSignals: result.missingSignals
        });
      }

      return NextResponse.json({
        ok: true,
        scanId,
        reportUrl: `/report/${scanId}`,
        score: pagespeed.performanceScore ?? result.scores.website,
        emailSent: Boolean(normalizedEmail),
        emailReason: normalizedEmail ? null : 'No email provided',
        snapshotId: null
      });
    }
  } catch (error) {
    console.error('[scan:error]', { traceId, error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? 'Scan failed. Please retry in a moment.'
            : 'Scan failed. Please retry in a moment.',
        traceId
      },
      { status: 400 }
    );
  }
}
