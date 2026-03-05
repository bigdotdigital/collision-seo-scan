import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runScan } from '@/lib/scan-engine';
import { sendReportEmail } from '@/lib/email';
import { toJson } from '@/lib/json';
import { toWebsiteUrl } from '@/lib/utils';
import { scanInputSchema } from '@/lib/validation';
import { computeScoreV01 } from '@/lib/scoring';
import {
  createScanRecord,
  createSnapshot,
  storeRawProviderResponse,
  upsertLead,
  upsertOrganizationFromInput
} from '@/lib/org-data';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = scanInputSchema.parse(body);

    const websiteUrl = toWebsiteUrl(input.website_url);
    if (!websiteUrl) {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    const org = await upsertOrganizationFromInput({
      shop_name: input.shop_name,
      website_url: websiteUrl,
      phone: input.phone || null,
      city_or_zip: input.city_or_zip
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
        has_aluminum: input.has_aluminum
      },
      org.id
    );

    const result = await runScan(websiteUrl, input.city_or_zip, input.shop_name, {
      hasICar: input.has_i_car,
      hasOEM: input.has_oem,
      hasAdas: input.has_adas,
      hasAluminum: input.has_aluminum
    });

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
        aiSummary: result.aiSummary || null,
        thirtyDayPlanJson: toJson(result.thirtyDayPlan)
      }
    });

    await storeRawProviderResponse({
      scanId: scan.id,
      organizationId: org.id,
      provider: 'website_audit',
      endpoint: 'runScan',
      cacheKey: `website:${websiteUrl}`,
      request: {
        websiteUrl,
        city: input.city_or_zip,
        shop: input.shop_name
      },
      response: result
    });

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
      componentScores: scoreV01.componentScores
    });

    if (input.email || input.phone) {
      await upsertLead({
        organizationId: org.id,
        scanId: scan.id,
        email: input.email || null,
        phone: input.phone || null,
        source: 'scan_gate',
        consented: input.consented
      });
    }

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'http://localhost:3000';
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
      score: scoreV01.visibilityScore,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || null,
      snapshotId: snapshot.id
    });
  } catch (error) {
    console.error('[scan:error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 400 }
    );
  }
}
