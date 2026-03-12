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
import { capturePageSnapshot } from '@/lib/page-snapshot';
import { fetchGooglePlaceProfile } from '@/lib/google-places';
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
import { seedDashboardFromScan } from '@/lib/dashboard-prefill';
import {
  claimShopForOrganization,
  recordConversionObservation,
  recordCompetitorObservations,
  recordKeywordObservations,
  recordReviewObservation,
  recordSerpObservations,
  recordSiteFeatureObservation
} from '@/lib/shop-data';

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

  const modeledScore = result.checks.performanceScore;
  const modeledLcpMs =
    modeledScore >= 90 ? 1800 : modeledScore >= 75 ? 2400 : modeledScore >= 60 ? 3200 : 4200;
  const modeledCls =
    modeledScore >= 90 ? 0.04 : modeledScore >= 75 ? 0.08 : modeledScore >= 60 ? 0.14 : 0.24;
  const modeledTbtMs =
    modeledScore >= 90 ? 60 : modeledScore >= 75 ? 140 : modeledScore >= 60 ? 260 : 420;
  const modeledSpeedIndexMs =
    modeledScore >= 90 ? 2100 : modeledScore >= 75 ? 3200 : modeledScore >= 60 ? 4300 : 5800;

  return {
    status: 'ok',
    message: 'Modeled from on-site checks while live PageSpeed data is unavailable.',
    performanceScore: modeledScore,
    lcpMs: modeledLcpMs,
    cls: modeledCls,
    tbtMs: modeledTbtMs,
    speedIndexMs: modeledSpeedIndexMs,
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
    const googlePlaceResult = await fetchGooglePlaceProfile({
      shopName: normalizedShop,
      city: normalizedCity,
      websiteUrl
    });
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
    const homepageFetch =
      result.pageFetchMeta.find((row) => row.url === websiteUrl) ||
      result.pageFetchMeta.find((row) => row.url.includes(new URL(websiteUrl).hostname));
    const captured = await capturePageSnapshot(websiteUrl);
    const scannerPreview = {
      screenshotUrl: captured.screenshotUrl,
      captureSource: captured.captureSource,
      metadata: {
        title: captured.metadata.title || result.checks.title || null,
        metaDescription: captured.metadata.metaDescription || result.checks.metaDescription || null,
        url: captured.metadata.url || websiteUrl,
        statusCode: captured.metadata.statusCode ?? homepageFetch?.status ?? null,
        responseTimeMs: captured.metadata.responseTimeMs ?? homepageFetch?.fetchMs ?? null,
        fileSizeBytes: captured.metadata.fileSizeBytes ?? homepageFetch?.bytes ?? null,
        wordCount: captured.metadata.wordCount ?? result.checks.homeWordCount ?? null
      }
    };

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
      nationalBenchmark: result.nationalBenchmark,
      missingPages: result.missingPages,
      pageFetchMeta: result.pageFetchMeta,
      scanDurationMs: result.scanDurationMs,
      competitors: result.competitors,
      mapPack: result.mapPack,
      scannerPreview,
      googlePlace: googlePlaceResult.profile || undefined,
      sources: {
        pagespeed: pageSpeedStatus,
        serp: result.sources.serp,
        aiSummary: result.sources.aiSummary,
        reviews:
          googlePlaceResult.profile && googlePlaceResult.source === 'live'
            ? 'live'
            : 'fallback',
        mapPack: result.sources.mapPack,
        competitors: result.sources.serp,
        keywords: result.sources.keywords
      },
      providerStatus: {
        pagespeed: {
          status: pageSpeedStatus,
          detail:
            pageSpeedStatus === 'live'
              ? 'Live PageSpeed measurement completed.'
              : pageSpeedStatus === 'cached'
                ? 'Using recent cached PageSpeed result due to temporary provider limits.'
                : 'Modeled performance from scan checks because live PageSpeed was unavailable.'
        },
        serp: {
          status: result.sources.serp,
          detail:
            result.sources.serp === 'live'
              ? 'Live local search competitor extraction.'
              : result.sources.serp === 'cached'
                ? 'Cached local competitor set reused for this market.'
                : 'Fallback competitor set used because live SERP query failed.'
        },
        aiSummary: {
          status: result.sources.aiSummary,
          detail:
            result.sources.aiSummary === 'live'
              ? 'Narrative built from live source-backed metrics.'
              : result.sources.aiSummary === 'modeled'
                ? 'Narrative includes modeled estimates due to partial provider availability.'
                : 'Fallback narrative used due to AI provider outage.'
        },
        snapshot: {
          status: scannerPreview.captureSource,
          detail:
            scannerPreview.captureSource === 'live'
              ? 'Live rendered screenshot captured successfully.'
              : scannerPreview.screenshotUrl
                ? 'Fallback preview image used for scanner backdrop.'
                : 'No preview image available; abstract scanner view shown.'
        },
        googlePlaces: {
          status: googlePlaceResult.source,
          detail: googlePlaceResult.detail
        },
        mapPack: {
          status: result.sources.mapPack,
          detail:
            result.sources.mapPack === 'live'
              ? 'Live local map-pack rankings captured for target queries.'
              : result.sources.mapPack === 'cached'
                ? 'Recent local map-pack ranking snapshot reused from cache.'
                : 'Fallback map-pack placeholders used because live map data was unavailable.'
        }
      }
    });

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    try {
      const org = await upsertOrganizationFromInput({
        shop_name: normalizedShop,
        website_url: websiteUrl,
        phone: normalizedPhone || googlePlaceResult.profile?.nationalPhoneNumber || null,
        city_or_zip: normalizedCity,
        vertical: input.vertical,
        googlePlaceId: googlePlaceResult.profile?.placeId || undefined,
        address: googlePlaceResult.profile?.formattedAddress || undefined,
        city: googlePlaceResult.profile?.city || undefined,
        state: googlePlaceResult.profile?.state || undefined,
        lat: googlePlaceResult.profile?.lat || undefined,
        lng: googlePlaceResult.profile?.lng || undefined,
        primaryCategory: googlePlaceResult.profile?.primaryTypeDisplayName || undefined
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
        org.id,
        org.shopId || undefined
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

      if (org.shopId) {
        await Promise.all([
          claimShopForOrganization({
            orgId: org.id,
            shopId: org.shopId,
            name: normalizedShop,
            websiteUrl,
            city: normalizedCity,
            state: googlePlaceResult.profile?.state || null
          }),
          recordKeywordObservations({
            shopId: org.shopId,
            scanId: scan.id,
            observedAt: scan.createdAt,
            city: normalizedCity,
            keywords: result.moneyKeywords
          }),
          recordSiteFeatureObservation({
            shopId: org.shopId,
            scanId: scan.id,
            observedAt: scan.createdAt,
            city: googlePlaceResult.profile?.city || normalizedCity,
            state: googlePlaceResult.profile?.state || null,
            vertical: input.vertical,
            checks: result.checks,
            missingPages: result.missingPages
          }),
          googlePlaceResult.profile
            ? recordReviewObservation({
                shopId: org.shopId,
                scanId: scan.id,
                observedAt: scan.createdAt,
                city: googlePlaceResult.profile.city || normalizedCity,
                state: googlePlaceResult.profile.state || null,
                vertical: input.vertical,
                profile: googlePlaceResult.profile,
                confidence: googlePlaceResult.source
              })
            : Promise.resolve(null),
          recordSerpObservations({
            shopId: org.shopId,
            scanId: scan.id,
            observedAt: scan.createdAt,
            city: normalizedCity,
            state: googlePlaceResult.profile?.state || null,
            vertical: input.vertical,
            mapPack: result.mapPack,
            confidence: result.sources.mapPack
          }),
          recordCompetitorObservations({
            sourceShopId: org.shopId,
            scanId: scan.id,
            observedAt: scan.createdAt,
            city: normalizedCity,
            state: googlePlaceResult.profile?.state || null,
            vertical: input.vertical,
            competitors: result.competitors
          }),
          recordConversionObservation({
            shopId: org.shopId,
            organizationId: org.id,
            scanId: scan.id,
            observedAt: scan.createdAt,
            city: normalizedCity,
            state: googlePlaceResult.profile?.state || null,
            vertical: input.vertical,
            eventType: 'scan_completed',
            source: 'scan_submission',
            value: {
              scoreTotal: result.scores.total,
              emailCaptured: Boolean(normalizedEmail),
              phoneCaptured: Boolean(normalizedPhone)
            }
          })
        ]);
      }

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
        }),
        storeRawProviderResponse({
          scanId: scan.id,
          organizationId: org.id,
          provider: 'google_places',
          endpoint: 'places.searchText',
          cacheKey: `google_places:${normalizedCity.toLowerCase()}:${normalizedShop.toLowerCase()}`,
          request: {
            shopName: normalizedShop,
            city: normalizedCity,
            websiteUrl
          },
          response: googlePlaceResult
        })
      ]);

      const rankPositions: Record<string, number | null> = {};
      result.moneyKeywords.forEach((item, idx) => {
        rankPositions[item.keyword] = idx < 3 ? idx + 3 : null;
      });

      const scoreV01 = computeScoreV01({
        reviewCount: googlePlaceResult.profile?.userRatingCount ?? null,
        reviewRating: googlePlaceResult.profile?.rating ?? null,
        rankPositions,
        hasWebsite: Boolean(websiteUrl)
      });

      const snapshot = await createSnapshot({
        scanId: scan.id,
        organizationId: org.id,
        visibilityScore: scoreV01.visibilityScore,
        scoringModelVersion: scoreV01.scoringModelVersion,
        reviewCount: googlePlaceResult.profile?.userRatingCount ?? null,
        reviewRating: googlePlaceResult.profile?.rating ?? null,
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

      try {
        await seedDashboardFromScan({
          organizationId: org.id,
          scanId: scan.id,
          shopName: normalizedShop,
          websiteUrl,
          city: normalizedCity,
          keywords: result.moneyKeywords.map((row) => ({ keyword: row.keyword })),
          competitors: result.competitors.map((row) => ({ name: row.name, url: row.url }))
        });
      } catch (prefillError) {
        console.warn('[scan:dashboard-prefill-warning]', {
          scanId: scan.id,
          organizationId: org.id,
          error: prefillError instanceof Error ? prefillError.message : 'Unknown prefill error'
        });
      }

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
      const reportPath = `/report/${scan.id}`;
      const monitoringPath = `/monitoring?scanId=${encodeURIComponent(scan.id)}&orgId=${encodeURIComponent(org.id)}`;

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
        reportUrl: reportPath,
        nextUrl: reportPath,
        monitoringUrl: monitoringPath,
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
        nextUrl: `/report/${scanId}`,
        monitoringUrl: `/monitoring?scanId=${encodeURIComponent(scanId)}`,
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
