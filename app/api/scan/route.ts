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

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    logEnvWarningsOnce();
    const body = await req.json();
    const input = scanInputSchema.parse(body);

    const websiteUrl = validateAndNormalizeUrl(input.website_url);
    if (!websiteUrl) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    const [result, pagespeedLive] = await Promise.all([
      runScan(websiteUrl, input.city_or_zip, input.shop_name, {
        hasICar: input.has_i_car,
        hasOEM: input.has_oem,
        hasAdas: input.has_adas,
        hasAluminum: input.has_aluminum
      }),
      runPageSpeed(websiteUrl)
    ]);

    let pagespeed = pagespeedLive;
    if (pagespeed.status === 'error') {
      const cached = await getRecentSuccessfulPageSpeed(websiteUrl).catch(() => null);
      if (cached) {
        pagespeed = {
          ...cached,
          message: 'Showing recent PageSpeed data while live test is unavailable.'
        };
      } else {
        pagespeed = modeledPageSpeedFromScan(result);
      }
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      const org = await upsertOrganizationFromInput({
        shop_name: input.shop_name,
        website_url: websiteUrl,
        phone: input.phone || null,
        city_or_zip: input.city_or_zip,
        vertical: input.vertical
      });

      const seedScan = await createScanRecord(
        {
          website_url: websiteUrl,
          city_or_zip: input.city_or_zip,
          shop_name: input.shop_name,
          email: input.email || '',
          phone: input.phone || '',
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
          rawChecksJson: toJson({
            checks: result.checks,
            capabilities: {
              has_i_car: Boolean(input.has_i_car),
              has_oem: Boolean(input.has_oem),
              has_adas: Boolean(input.has_adas),
              has_aluminum: Boolean(input.has_aluminum)
            }
          }),
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
          modeledFromScore: scan.scoreTotal
        },
        recommendations: result.scores.issues.map((issue) => issue.fix),
        componentScores: scoreV01.componentScores,
        vertical: input.vertical
      });

      if (input.email || input.phone) {
        await upsertLead({
          organizationId: org.id,
          scanId: scan.id,
          email: input.email || null,
          phone: input.phone || null,
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

      if (input.email) {
        emailResult = await sendReportEmail({
          to: input.email,
          shopName: input.shop_name,
          score: result.scores.total,
          reportUrl
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
        shopName: input.shop_name,
        city: input.city_or_zip,
        email: input.email || null,
        phone: input.phone || null,
        pagespeed,
        scoreTotal: result.scores.total,
        scoreWebsite: result.scores.website,
        scoreLocal: result.scores.local,
        scoreIntent: result.scores.intent,
        issues: result.scores.issues,
        moneyKeywords: result.moneyKeywords,
        competitors: result.competitors,
        thirtyDayPlan: result.thirtyDayPlan,
        aiSummary: result.aiSummary || null
      };

      saveScanRecord(memoryRecord);

      if (input.email) {
        const reportUrl = `${origin}/report/${scanId}`;
        await sendReportEmail({
          to: input.email,
          shopName: input.shop_name,
          score: result.scores.total,
          reportUrl
        });
      }

      return NextResponse.json({
        ok: true,
        scanId,
        reportUrl: `/report/${scanId}`,
        score: pagespeed.performanceScore ?? result.scores.website,
        emailSent: Boolean(input.email),
        emailReason: input.email ? null : 'No email provided',
        snapshotId: null
      });
    }
  } catch (error) {
    console.error('[scan:error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 400 }
    );
  }
}
