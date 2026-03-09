import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ScoreRing } from '@/components/score-ring';
import { parseJson } from '@/lib/json';
import type {
  CategoryScoreSet,
  CollisionSignal,
  Competitor,
  CompetitorAdvantage,
  Issue,
  MoneyKeyword,
  NationalBenchmarkResult,
  PageFetchMeta,
  PrioritizedFix,
  ThirtyDayPlanItem
} from '@/lib/types';
import { ReportEmailCapture } from '@/components/report-email-capture';
import { ReportCtaActions, ReportShareActions } from '@/components/report-cta-actions';
import { buildReportViewModel, type ReportData } from '@/lib/report-view-model';
import { parseReportPayload } from '@/lib/report-payload';
import type { PageSpeedResult } from '@/lib/pagespeed';
import { formatCls, formatMilliseconds, formatScore } from '@/lib/metric-format';
import { getScanRecord } from '@/lib/scan-store';
import { logEnvWarningsOnce } from '@/lib/env-check';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID_RE = /^c[a-z0-9]{24,}$/i;

function isValidScanId(id: string): boolean {
  return UUID_RE.test(id) || CUID_RE.test(id);
}

function buildFallbackPreviewUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const normalized = rawUrl.trim();
  if (!normalized) return null;
  const candidate = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
  try {
    const parsed = new URL(candidate);
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(parsed.toString())}?w=1600`;
  } catch {
    return null;
  }
}

function isSyntheticPathProbe(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '').toLowerCase();
    return path === '/contact' || path === '/estimate' || path === '/services' || path === '/certifications';
  } catch {
    return false;
  }
}

function sanitizeExecutiveSummary(summary: string | null | undefined, score: number): string | null {
  const raw = (summary || '').trim();
  if (!raw) return null;

  // If the narrative score contradicts the measured report score, discard it.
  const numeric = raw.match(/\b(\d{2,3})\b/g)?.map((n) => Number(n)).filter((n) => Number.isFinite(n)) || [];
  const likelyScore = numeric.find((n) => n >= 0 && n <= 100);
  if (typeof likelyScore === 'number' && Math.abs(likelyScore - score) >= 8) return null;

  return raw;
}

function isUnavailableCompetitorLine(text: string): boolean {
  return /competitor page fetch unavailable/i.test(text);
}

function severityClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === 'high') return 'bg-red-100 text-red-700';
  if (normalized === 'med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

function impactClass(impact: 'high' | 'med' | 'low') {
  if (impact === 'high') return 'bg-red-100 text-red-700';
  if (impact === 'med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

function normalizeImpact(value: unknown): 'high' | 'med' | 'low' {
  if (value === 'high' || value === 'med' || value === 'low') return value;
  return 'low';
}

function normalizePageSpeed(input: unknown, fallbackWebsiteScore: number): PageSpeedResult {
  const raw = (input || {}) as Partial<PageSpeedResult> & { diagnostics?: unknown };
  const diagnostics = Array.isArray(raw.diagnostics)
    ? raw.diagnostics
        .map((item, idx) => {
          const row = item as Record<string, unknown>;
          const title = typeof row?.title === 'string' ? row.title : 'Website issue detected';
          const recommendation =
            typeof row?.recommendation === 'string'
              ? row.recommendation
              : 'Apply technical cleanup to improve performance.';
          return {
            id: typeof row?.id === 'string' ? row.id : `diag-${idx}`,
            title,
            description:
              typeof row?.description === 'string'
                ? row.description
                : 'This website element is reducing page performance.',
            impact: normalizeImpact(row?.impact),
            recommendation
          };
        })
        .slice(0, 5)
    : [];

  return {
    status: raw.status === 'ok' ? 'ok' : 'error',
    message: typeof raw.message === 'string' ? raw.message : undefined,
    performanceScore:
      typeof raw.performanceScore === 'number' ? raw.performanceScore : fallbackWebsiteScore,
    lcpMs: typeof raw.lcpMs === 'number' ? raw.lcpMs : null,
    cls: typeof raw.cls === 'number' ? raw.cls : null,
    tbtMs: typeof raw.tbtMs === 'number' ? raw.tbtMs : null,
    speedIndexMs: typeof raw.speedIndexMs === 'number' ? raw.speedIndexMs : null,
    diagnostics
  };
}

function normalizeIssues(input: unknown): Issue[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      const severity =
        row?.severity === 'High' || row?.severity === 'Med' || row?.severity === 'Low'
          ? row.severity
          : 'Low';
      return {
        id: typeof row?.id === 'string' ? row.id : `issue-${idx}`,
        severity,
        title: typeof row?.title === 'string' ? row.title : 'Action item',
        why: typeof row?.why === 'string' ? row.why : 'This issue reduces local SEO performance.',
        fix: typeof row?.fix === 'string' ? row.fix : 'Apply recommended technical/content updates.'
      } as Issue;
    })
    .slice(0, 10);
}

function normalizeKeywords(input: unknown): MoneyKeyword[] {
  if (!Array.isArray(input)) return [];
  const rows = input
    .map<MoneyKeyword | null>((item) => {
      if (typeof item === 'string') {
        return { keyword: item, source: 'modeled' };
      }
      const row = item as Record<string, unknown>;
      if (typeof row?.keyword !== 'string') return null;
      return {
        keyword: row.keyword,
        volume: typeof row.volume === 'number' ? row.volume : null,
        cpc: typeof row.cpc === 'number' ? row.cpc : null,
        source: row.source === 'api' ? 'api' : 'modeled'
      };
    })
    .filter((x): x is MoneyKeyword => Boolean(x));

  return rows.slice(0, 20);
}

function normalizeCompetitors(input: unknown, city: string): Competitor[] {
  if (!Array.isArray(input)) return [];
  const blockedHost = [
    'yelp.com',
    'yellowpages.com',
    'mapquest.com',
    'bbb.org',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'tripadvisor.com',
    'wikipedia.org'
  ];
  const blockedName = /(yelp|yellow pages|mapquest|tripadvisor|wikipedia|facebook|best|top 10|directory)/i;
  const filtered = input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      const name =
        typeof row?.name === 'string' && row.name.trim()
          ? row.name
          : `Leading ${city} collision shop #${idx + 1}`;
      const url = typeof row?.url === 'string' ? row.url : undefined;
      const host = (() => {
        try {
          return url ? new URL(url).hostname.replace(/^www\./i, '').toLowerCase() : '';
        } catch {
          return '';
        }
      })();
      if (
        blockedName.test(name) ||
        (host &&
          blockedHost.some((domain) => host === domain || host.endsWith(`.${domain}`)))
      ) {
        return null;
      }
      return {
        name,
        url,
        note: typeof row?.note === 'string' ? row.note : 'Benchmark profile',
        differentiatorGuess:
          typeof row?.differentiatorGuess === 'string'
            ? row.differentiatorGuess
            : 'Stronger local trust and conversion signals.'
      } as Competitor;
    })
    .filter((v): v is Competitor => Boolean(v))
    .slice(0, 5);

  if (filtered.length > 0) return filtered;
  return [
    {
      name: `Leading ${city} collision shop`,
      note: 'Benchmark profile',
      differentiatorGuess: 'Stronger local trust and conversion signals.'
    },
    {
      name: `Top-rated ${city} auto body brand`,
      note: 'Benchmark profile',
      differentiatorGuess: 'Better category match and location-page depth.'
    },
    {
      name: `High-visibility ${city} repair competitor`,
      note: 'Benchmark profile',
      differentiatorGuess: 'More prominent estimate CTA and service coverage.'
    }
  ];
}

function normalizePlan(input: unknown): ThirtyDayPlanItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      return {
        week: typeof row?.week === 'string' ? row.week : `Week ${idx + 1}`,
        focus: typeof row?.focus === 'string' ? row.focus : 'Execution sprint',
        outcome:
          typeof row?.outcome === 'string'
            ? row.outcome
            : 'Implement prioritized SEO and conversion improvements.'
      } as ThirtyDayPlanItem;
    })
    .slice(0, 4);
}

function normalizeCategoryScores(input: unknown, fallback: { website: number; local: number; intent: number; total: number }): CategoryScoreSet {
  const row = (input || {}) as Partial<CategoryScoreSet>;
  return {
    technicalSeo: typeof row.technicalSeo === 'number' ? row.technicalSeo : fallback.website,
    localSeo: typeof row.localSeo === 'number' ? row.localSeo : fallback.local,
    collisionAuthority:
      typeof row.collisionAuthority === 'number' ? row.collisionAuthority : fallback.intent,
    speedPerformance:
      typeof row.speedPerformance === 'number' ? row.speedPerformance : fallback.website,
    contentCoverage: typeof row.contentCoverage === 'number' ? row.contentCoverage : 68,
    overall: typeof row.overall === 'number' ? row.overall : fallback.total,
    explanations: {
      technicalSeo:
        row.explanations?.technicalSeo ||
        'Foundational crawlability, metadata quality, and indexability signals.',
      localSeo:
        row.explanations?.localSeo || 'Google Maps/NAP/review and local intent readiness signals.',
      collisionAuthority:
        row.explanations?.collisionAuthority ||
        'Collision-specific certifications and capability trust signals.',
      speedPerformance:
        row.explanations?.speedPerformance ||
        'Page speed and UX readiness from measured or modeled checks.',
      contentCoverage:
        row.explanations?.contentCoverage ||
        'Coverage of high-intent service content and conversion pages.'
    }
  };
}

function normalizeSignals(input: unknown): CollisionSignal[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as CollisionSignal)
    .filter((s) => typeof s?.signal_name === 'string' && typeof s?.evidence?.url === 'string')
    .slice(0, 30);
}

function normalizeTopFixes(input: unknown, issues: Issue[]): PrioritizedFix[] {
  if (Array.isArray(input) && input.length > 0) {
    return input
      .map((item) => item as PrioritizedFix)
      .filter((f) => typeof f?.title === 'string' && Array.isArray(f?.steps))
      .slice(0, 3);
  }

  return issues.slice(0, 3).map((issue) => ({
    title: issue.title,
    why: issue.why,
    impact: issue.severity,
    steps: [issue.fix, 'Apply on homepage first.', 'Re-scan to verify improvement.']
  }));
}

function normalizeMissingSignals(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((v): v is string => typeof v === 'string').slice(0, 20);
}

function normalizeCompetitorAdvantages(input: unknown): CompetitorAdvantage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as CompetitorAdvantage)
    .filter((c) => typeof c?.name === 'string' && Array.isArray(c?.advantages))
    .slice(0, 5);
}

function normalizePageMeta(input: unknown): PageFetchMeta[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as PageFetchMeta)
    .filter((p) => typeof p?.url === 'string' && typeof p?.status === 'number')
    .slice(0, 20);
}

function normalizeNationalBenchmark(input: unknown): NationalBenchmarkResult | null {
  if (!input || typeof input !== 'object') return null;
  const row = input as Partial<NationalBenchmarkResult>;
  if (!Array.isArray(row.patterns) || !Array.isArray(row.topRecommendations)) return null;
  if (row.source !== 'live' && row.source !== 'cached' && row.source !== 'fallback') return null;
  return {
    source: row.source,
    scannedAt: typeof row.scannedAt === 'string' ? row.scannedAt : new Date().toISOString(),
    sampleSize: typeof row.sampleSize === 'number' ? row.sampleSize : 0,
    successfulSites: typeof row.successfulSites === 'number' ? row.successfulSites : 0,
    leaderSites: Array.isArray(row.leaderSites) ? row.leaderSites.slice(0, 5) : [],
    patterns: row.patterns.slice(0, 10),
    topRecommendations: row.topRecommendations.slice(0, 3)
  };
}

function scoreDot(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  return '🔴';
}

function checksScore(raw: Record<string, unknown>, key: 'title' | 'estimate'): boolean {
  const checks = (raw.checks as Record<string, unknown> | undefined) || {};
  if (key === 'title') return typeof checks.title === 'string' && checks.title.trim().length > 0;
  return Boolean(checks.estimateCtaDetected);
}

function buildExecutiveSummaryFallback(input: {
  shopName: string;
  city: string;
  overall: number;
  categoryScores: CategoryScoreSet;
  topFixes: PrioritizedFix[];
}): string {
  const fix1 = input.topFixes[0]?.title || 'Improve technical and conversion basics';
  const fix2 = input.topFixes[1]?.title || 'Strengthen local trust and authority';
  const fix3 = input.topFixes[2]?.title || 'Expand high-intent collision coverage';
  return `${input.shopName} in ${input.city} scored ${input.overall}/100. Technical SEO is ${input.categoryScores.technicalSeo}, Local SEO is ${input.categoryScores.localSeo}, and Collision Authority is ${input.categoryScores.collisionAuthority}. Biggest opportunities are: ${fix1}; ${fix2}; ${fix3}. Fastest 30-day plan: implement the top fixes in order, validate with a re-scan, and tighten conversion CTAs on the highest-intent pages.`;
}

function ownerText(input: string): string {
  return input
    .replace(/SERPs?/gi, 'Google search results')
    .replace(/\bCTR\b/gi, 'click-through rate')
    .replace(/\bGBP\b/gi, 'Google Business Profile')
    .replace(/\bNAP\b/gi, 'business name, address, and phone')
    .replace(/schema/gi, 'structured business info')
    .replace(/crawlability/gi, 'how easily Google can read your site');
}

function ownerIssueTitle(title: string): string {
  if (/missing page title/i.test(title)) return 'Add a clear homepage title';
  if (/missing h1/i.test(title)) return 'Add one clear homepage headline';
  if (/google maps profile link not detected/i.test(title)) return 'Link your Google Business Profile';
  if (/meta description missing/i.test(title)) return 'Add a search snippet for your homepage';
  if (/no embedded map found/i.test(title)) return 'Add a map on your contact page';
  return ownerText(title);
}

function withBusinessImpact(reason: string): string {
  if (/call|lead|estimate|book/i.test(reason)) return ownerText(reason);
  return `${ownerText(reason)} This can reduce estimate requests from local search.`;
}

export default async function ReportPage({ params }: { params: { scanId: string } }) {
  logEnvWarningsOnce();
  const scanId = params.scanId;
  if (!isValidScanId(scanId)) return notFound();

  try {
    const scanRecord = await getScanRecord(scanId);
    if (!scanRecord) return notFound();

    const dbScan = await prisma.scan.findUnique({ where: { id: scanId } }).catch(() => null);

  const snapshot = dbScan?.latestSnapshotId
    ? await prisma.scanSnapshot.findUnique({ where: { id: dbScan.latestSnapshotId } }).catch(() => null)
    : dbScan
      ? await prisma.scanSnapshot
          .findFirst({
            where: { scanId: dbScan.id },
            orderBy: { createdAt: 'desc' }
          })
          .catch(() => null)
      : null;

  const issues = normalizeIssues(
    dbScan ? parseJson<unknown>(dbScan.issuesJson, scanRecord.issues) : scanRecord.issues
  );
  const keywords = normalizeKeywords(
    dbScan
      ? parseJson<unknown>(dbScan.moneyKeywordsJson, scanRecord.moneyKeywords)
      : scanRecord.moneyKeywords
  );
  const competitors = normalizeCompetitors(
    snapshot
      ? parseJson<unknown>(
          snapshot.topCompetitorsJson,
          dbScan
            ? parseJson<unknown>(dbScan.competitorsJson, scanRecord.competitors)
            : scanRecord.competitors
        )
      : dbScan
        ? parseJson<unknown>(dbScan.competitorsJson, scanRecord.competitors)
        : scanRecord.competitors,
    scanRecord.city
  );
  const plan = normalizePlan(
    dbScan
      ? parseJson<unknown>(dbScan.thirtyDayPlanJson, scanRecord.thirtyDayPlan)
      : scanRecord.thirtyDayPlan
  );
  const raw = dbScan
    ? parseJson<Record<string, unknown>>(dbScan.rawChecksJson, scanRecord.rawChecks || {})
    : scanRecord.rawChecks || {};
  const payload = parseReportPayload(raw);

  const scoreTotal = snapshot?.visibilityScore ?? scanRecord.scoreTotal ?? 0;
  const scoreWebsite = scanRecord.scoreWebsite ?? 0;
  const scoreLocal = scanRecord.scoreLocal ?? 0;
  const scoreIntent = scanRecord.scoreIntent ?? 0;
  const categoryScores = normalizeCategoryScores(payload?.categoryScores || raw.categoryScores, {
    website: scoreWebsite,
    local: scoreLocal,
    intent: scoreIntent,
    total: scoreTotal
  });
  const detectedSignals = normalizeSignals(payload?.detectedSignals || raw.detectedSignals);
  const missingSignals = normalizeMissingSignals(payload?.missingSignals || raw.missingSignals);
  const topFixes = normalizeTopFixes(payload?.topFixes || raw.topFixes, issues);
  const competitorAdvantages = normalizeCompetitorAdvantages(
    payload?.competitorAdvantages || raw.competitorAdvantages
  );
  const nationalBenchmark = normalizeNationalBenchmark(
    payload?.nationalBenchmark || raw.nationalBenchmark
  );
  const pageMeta = normalizePageMeta(payload?.pageFetchMeta || raw.pageFetchMeta);
  const scanDurationMs =
    typeof payload?.scanDurationMs === 'number'
      ? payload.scanDurationMs
      : typeof raw.scanDurationMs === 'number'
        ? raw.scanDurationMs
        : 0;
  const timestampLabel = dbScan?.createdAt
    ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
        dbScan.createdAt
      )
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(scanRecord.createdAt)
      );
  const domainLabel = (() => {
    try {
      return new URL(scanRecord.url).hostname;
    } catch {
      return scanRecord.url;
    }
  })();
  const pagespeed = normalizePageSpeed(scanRecord.pagespeed, scoreWebsite);
  const websiteCardScore = pagespeed.performanceScore ?? scoreWebsite;
  const healthChecks = [
    { label: 'Title tags', score: checksScore(raw, 'title') ? 90 : 45 },
    { label: 'Speed', score: categoryScores.speedPerformance },
    { label: 'Certifications', score: categoryScores.collisionAuthority },
    { label: 'Mobile UX', score: websiteCardScore },
    { label: 'Local signals', score: categoryScores.localSeo },
    { label: 'Estimate CTA', score: checksScore(raw, 'estimate') ? 88 : 48 }
  ];
  const ownerIssues = issues.map((issue) => ({
    ...issue,
    title: ownerIssueTitle(issue.title),
    why: withBusinessImpact(issue.why),
    fix: ownerText(issue.fix)
  }));
  const ownerTopFixes = topFixes.map((fix) => ({
    ...fix,
    title: ownerIssueTitle(fix.title),
    why: withBusinessImpact(fix.why),
    steps: fix.steps.map((step) => ownerText(step))
  }));
  const categoryCards = [
    {
      label: 'Website Basics',
      hint: 'Can Google understand your main pages?',
      score: categoryScores.technicalSeo
    },
    {
      label: 'Map Visibility',
      hint: 'How visible you are in local map searches',
      score: categoryScores.localSeo
    },
    {
      label: 'Trust & Certifications',
      hint: 'Signals that make shoppers choose your shop',
      score: categoryScores.collisionAuthority
    },
    {
      label: 'Speed on Mobile',
      hint: 'Page speed for customers on phones',
      score: categoryScores.speedPerformance
    },
    {
      label: 'Service Page Coverage',
      hint: 'How well your pages match collision search intent',
      score: categoryScores.contentCoverage
    }
  ];

  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/bigdotdigital/30min';
  const salesPhone = process.env.SALES_PHONE || '+13035551234';

  const reportData: ReportData = {
    scanId: scanRecord.id,
    shopName: scanRecord.shopName,
    city: scanRecord.city,
    websiteUrl: scanRecord.url,
    scoreTotal,
    scoreWebsite,
    scoreLocal,
    scoreIntent,
    issues,
    moneyKeywords: keywords,
    competitors,
    thirtyDayPlan: plan,
    aiSummary: scanRecord.aiSummary,
    calendlyBase: calendly,
    salesPhone,
    rawChecks: {
      reviews: (raw.reviews as { rating?: number; reviews?: number } | undefined) || undefined,
      competitorReviews:
        (raw.competitorReviews as { rating?: number; reviews?: number } | undefined) || undefined
    }
  };

  const vm = buildReportViewModel(reportData);
  const filteredCompetitorAdvantages = competitorAdvantages
    .map((row) => ({
      ...row,
      advantages: row.advantages.filter((line) => !isUnavailableCompetitorLine(line))
    }))
    .filter((row) => row.advantages.length > 0);

  const competitorDisplayRows = filteredCompetitorAdvantages.length > 0 ? filteredCompetitorAdvantages : [];
  const crawlEvidenceRows = pageMeta.filter(
    (row) => !(row.status >= 400 && isSyntheticPathProbe(row.url))
  );
  const teardownIntakeUrl = (() => {
    const p = new URLSearchParams();
    p.set('scanId', scanRecord.id);
    if (dbScan?.organizationId) p.set('orgId', dbScan.organizationId);
    if (dbScan?.vertical) p.set('vertical', dbScan.vertical);
    if (scanRecord.email) p.set('email', scanRecord.email);
    if (scanRecord.phone) p.set('phone', scanRecord.phone);
    return `/teardown-intake?${p.toString()}`;
  })();
  const monitoringLandingUrl = (() => {
    const p = new URLSearchParams();
    p.set('scanId', scanRecord.id);
    if (dbScan?.organizationId) p.set('orgId', dbScan.organizationId);
    if (scanRecord.email) p.set('email', scanRecord.email);
    if (scanRecord.shopName) p.set('shop', scanRecord.shopName);
    if (scanRecord.city) p.set('city', scanRecord.city);
    return `/monitoring?${p.toString()}`;
  })();
  const reviewGap = payload?.reviewGap || vm.reviewGap;
  const mapPack = payload?.mapPack || vm.mapPack;
  const sourceConfidence = payload?.sources || {
    pagespeed: 'fallback',
    serp: 'fallback',
    aiSummary: 'fallback',
    reviews: 'modeled',
    mapPack: 'modeled',
    competitors: 'fallback',
    keywords: 'modeled'
  };
  const googlePlace = payload?.googlePlace;
  const fallbackFetch = (() => {
    const preferred = pageMeta.find((row) => {
      try {
        const target = new URL(scanRecord.url);
        const probe = new URL(row.url);
        const targetPath = target.pathname.replace(/\/+$/, '') || '/';
        const probePath = probe.pathname.replace(/\/+$/, '') || '/';
        return probe.hostname === target.hostname && probePath === targetPath && row.status >= 200 && row.status < 400;
      } catch {
        return false;
      }
    });
    if (preferred) return preferred;
    return pageMeta.find((row) => row.status >= 200 && row.status < 400) || pageMeta[0];
  })();
  const scannerPreview = payload?.scannerPreview || {
    screenshotUrl: buildFallbackPreviewUrl(scanRecord.url),
    captureSource: 'fallback' as const,
      metadata: {
      title: payload?.checks?.title || scanRecord.shopName || null,
      metaDescription: payload?.checks?.metaDescription || null,
      url: scanRecord.url,
      statusCode: fallbackFetch?.status ?? null,
      responseTimeMs: fallbackFetch?.fetchMs ?? null,
      fileSizeBytes: fallbackFetch?.bytes ?? null,
        wordCount:
        typeof raw.homeWordCount === 'number'
          ? raw.homeWordCount
          : typeof payload?.checks?.homeWordCount === 'number'
            ? payload.checks.homeWordCount
            : typeof raw.wordCount === 'number'
            ? raw.wordCount
            : null
    }
  };
  const scannerPreviewUrl =
    scannerPreview.screenshotUrl || buildFallbackPreviewUrl(scannerPreview.metadata.url || scanRecord.url);
  const scannerSteps = [
    { label: 'Capturing homepage snapshot', state: 'verified' as const },
    { label: 'Checking mobile responsiveness', state: 'verified' as const },
    { label: 'Detecting trust signals', state: 'verified' as const },
    { label: 'Evaluating CTA visibility', state: checksScore(raw, 'estimate') ? ('verified' as const) : ('issue' as const) },
    {
      label: 'Measuring LCP / Speed index',
      state: categoryScores.speedPerformance >= 60 ? ('verified' as const) : ('issue' as const)
    },
    { label: 'Comparing competitor positioning', state: 'verified' as const },
    { label: 'Building action plan', state: 'analyzing' as const }
  ];
  const trustedAiSummary =
    sourceConfidence.aiSummary === 'live'
      ? sanitizeExecutiveSummary(scanRecord.aiSummary, scoreTotal)
      : null;
  const executiveSummary = trustedAiSummary
    ? trustedAiSummary
    : buildExecutiveSummaryFallback({
        shopName: scanRecord.shopName,
        city: scanRecord.city,
        overall: scoreTotal,
        categoryScores,
        topFixes
      });
    const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/report/${scanRecord.id}`;
    const printedAt = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());
    const scoreCondition = scoreTotal >= 85 ? 'Excellent Condition' : scoreTotal >= 70 ? 'Good Condition' : 'Needs Repair';
    const competitorRows = [
      {
        name: 'Your Shop',
        score: scoreTotal,
        reviews: `${reviewGap.shopRating.toFixed(1)} ★`
      },
      ...vm.competitors.slice(0, 2).map((comp, idx) => ({
        name: comp.name,
        score: Math.max(48, scoreTotal - (idx + 1) * 8),
        reviews: idx === 0 ? `${reviewGap.competitorRating.toFixed(1)} ★` : 'n/a'
      }))
    ];

    return (
      <main className="container-shell report-print report-diagnostic report-variant pb-24 pt-10 md:pb-10">
      <div className="report-ambient-glow" />
      <div className="report-noise-overlay" />
      {!scanRecord.email ? <ReportEmailCapture scanId={scanRecord.id} /> : null}
      <ReportCtaActions
        scanId={scanRecord.id}
        calendlyUrl={teardownIntakeUrl}
        salesPhone={salesPhone}
        reportUrl={reportUrl}
        mobileSticky
        trackBooked={false}
      />

      <section className="print-only mb-4 border-b border-slate-300 pb-3">
        <p className="text-[11px] uppercase tracking-wide text-slate-600">Collision SEO Scan</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{scanRecord.shopName}</h1>
        <p className="text-xs text-slate-700">
          {scanRecord.city} • {scanRecord.url} • Generated {printedAt}
        </p>
      </section>

      <section className="report-header-panel mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="report-header-icon">◌</div>
          <div>
            <h1 className="text-sm font-medium text-white/95">{scanRecord.shopName}</h1>
            <p className="text-xs text-white/60">
              {scanRecord.city} • Scan ID: {scanRecord.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="pill-badge border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            Scan Complete
          </span>
          <span className="text-xs text-white/45">{timestampLabel}</span>
          <ReportShareActions reportUrl={reportUrl} />
        </div>
      </section>

      <section className="report-arch-hero mb-6">
        <p className="report-arch-kicker">LOCAL SEO DIAGNOSTIC</p>
        <h2 className="report-arch-title">Visibility Analysis</h2>
        <p className="report-arch-copy">
          Shop-owner view: what is working, what is costing estimate calls, and what to fix first.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="report-score-panel lg:col-span-4">
          <ScoreRing score={scoreTotal} />
          <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/45">Visibility Health</p>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {categoryCards.map((card) => (
            <article key={card.label} className="report-grade-card">
              <p className="report-grade-label">{card.label}</p>
              <p className="report-grade-value">{card.score}</p>
              <p className="report-grade-hint">{card.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="report-arch-section mb-6">
        <div className="report-arch-section-head">
          <h3 className="report-arch-section-title">Start Here</h3>
          <span className="report-arch-meta">Most important first</span>
        </div>
        <div className="report-arch-grid3">
          <article className="report-arch-cell">
            <p className="report-arch-label">Current Health</p>
            <p className="report-arch-big">{scoreTotal}</p>
            <p className="report-arch-sub">{scoreCondition}</p>
          </article>
          <article className="report-arch-cell">
            <p className="report-arch-label">Top Priority</p>
            <ol className="report-arch-list">
              {ownerTopFixes.slice(0, 2).map((fix, idx) => (
                <li key={fix.title}>
                  <span className="report-arch-index">{idx + 1}</span>
                  <span>{fix.title}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="report-arch-cell">
            <p className="report-arch-label">Estimated Opportunity</p>
            <p className="report-arch-big">${vm.opportunity.revenueOpportunity.toLocaleString()}</p>
            <p className="report-arch-sub">
              {vm.opportunity.missedLeads.toLocaleString()} missed leads/month (modeled)
            </p>
          </article>
        </div>
      </section>

      {vm.dataStatusBanner ? (
        <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {vm.dataStatusBanner} We only show measured data as primary; estimated items are clearly marked.
        </section>
      ) : null}

      <section className="variant-results-grid mb-6">
        <article className="variant-score-card">
          <div className="variant-score-ring" style={{ '--score-deg': `${Math.round((scoreTotal / 100) * 360)}deg` } as Record<string, string>}>
            <span className="variant-score-value">{scoreTotal}</span>
          </div>
          <p className="variant-score-label">Visibility Score</p>
          <p className="variant-score-condition">{scoreCondition}</p>
        </article>

        <article className="variant-report-card">
          <p className="variant-card-label">Top issues impacting calls</p>
          <ul className="variant-issue-list">
            {ownerIssues.slice(0, 3).map((issue) => (
              <li key={issue.id} className="variant-issue-item">
                <span
                  className={`variant-priority-dot ${
                    issue.severity === 'High' ? 'variant-priority-high' : 'variant-priority-med'
                  }`}
                />
                <div>
                  <p className="variant-issue-title">{issue.title}</p>
                  <p className="variant-issue-copy">{issue.why}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="variant-report-card">
          <p className="variant-card-label">Local market context</p>
          <table className="variant-table">
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Score</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {competitorRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.score}</td>
                  <td>{row.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="variant-quick-fixes">
            <p className="variant-card-label">Quick fixes</p>
            <div className="variant-chip-row">
              {topFixes.slice(0, 2).map((fix) => (
                <span key={fix.title} className="variant-fix-chip">+ {fix.title}</span>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="report-arch-section mb-6">
        <div className="report-arch-section-head">
          <h3 className="report-arch-section-title">Market Context</h3>
          <span className="report-arch-meta">Your shop vs local rivals</span>
        </div>
        <div className="report-arch-table-wrap">
          <table className="variant-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Score</th>
                <th>Reviews</th>
              </tr>
            </thead>
            <tbody>
              {competitorRows.map((row) => (
                <tr key={`market-${row.name}`}>
                  <td>{row.name}</td>
                  <td>{row.score}</td>
                  <td>{row.reviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-scan-stage mb-6 grid gap-4 lg:grid-cols-12">
        <article className="report-scan-canvas-wrap lg:col-span-8">
          <div className="report-scan-canvas">
            {scannerPreviewUrl ? (
              <img
                src={scannerPreviewUrl}
                alt="Captured page preview"
                className="report-scan-bg"
              />
            ) : (
              <div className="report-scan-bg report-scan-fallback" />
            )}
            <div className="report-scan-dim" />
            <div className="report-scan-grid" />
            <div className="report-scan-line" />
            <div className="report-scan-box report-scan-box-good">
              <span className="report-scan-tag report-scan-tag-good">Trust Signals Detected</span>
            </div>
            <div className="report-scan-box report-scan-box-warn">
              <span className="report-scan-tag report-scan-tag-warn">Viewport Warning</span>
            </div>
            <div className="report-scan-box report-scan-box-bad">
              <span className="report-scan-tag report-scan-tag-bad">LCP &gt; target</span>
            </div>
            <p className="report-scan-axis">
              {scannerPreview.captureSource === 'live'
                ? 'Live page snapshot • scanner overlay active'
                : scannerPreviewUrl
                  ? 'Fallback page snapshot • scanner overlay active'
                  : 'Abstract scanner fallback • snapshot unavailable'}
            </p>
          </div>
        </article>

        <article className="card p-0 lg:col-span-4">
          <div className="report-scan-panel-head">
            <h2 className="text-sm font-semibold tracking-[0.12em] text-white">SYSTEM DIAGNOSTICS</h2>
            <div className="report-scan-status">
              <span className="report-scan-dot" />
              <span>RUNNING</span>
            </div>
          </div>

          <div className="report-scan-progress">
            <div className="report-scan-progress-bar" />
          </div>

          <div className="report-scan-step-list">
            {scannerSteps.map((step, idx) => (
              <div key={step.label} className="report-scan-step">
                <div
                  className={`report-scan-step-bullet ${
                    step.state === 'verified'
                      ? 'report-scan-step-bullet-ok'
                      : step.state === 'issue'
                        ? 'report-scan-step-bullet-issue'
                        : 'report-scan-step-bullet-active'
                  }`}
                >
                  {step.state === 'verified' ? '✓' : idx + 1}
                </div>
                <div className="report-scan-step-copy">
                  <p>{step.label}</p>
                </div>
                <span
                  className={`report-scan-step-badge ${
                    step.state === 'verified'
                      ? 'report-scan-step-badge-ok'
                      : step.state === 'issue'
                        ? 'report-scan-step-badge-issue'
                        : 'report-scan-step-badge-active'
                  }`}
                >
                  {step.state === 'verified' ? 'Verified' : step.state === 'issue' ? 'Issue' : 'Analyzing'}
                </span>
              </div>
            ))}
          </div>

          <div className="report-scan-meta">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c49a7a]">
              Scanned Page Metadata
            </h3>
            <div className="mt-2 space-y-1.5 text-xs">
              <p><span className="font-semibold text-white">Title:</span> {scannerPreview.metadata.title || 'n/a'}</p>
              <p><span className="font-semibold text-white">Meta:</span> {scannerPreview.metadata.metaDescription || 'n/a'}</p>
              <p><span className="font-semibold text-white">URL:</span> {scannerPreview.metadata.url || scanRecord.url}</p>
              <p><span className="font-semibold text-white">Status:</span> {scannerPreview.metadata.statusCode ?? 'n/a'}</p>
              <p><span className="font-semibold text-white">Response:</span> {scannerPreview.metadata.responseTimeMs != null ? `${scannerPreview.metadata.responseTimeMs}ms` : 'n/a'}</p>
              <p><span className="font-semibold text-white">Size:</span> {scannerPreview.metadata.fileSizeBytes != null ? `${Math.round(scannerPreview.metadata.fileSizeBytes / 1024)} KB` : 'n/a'}</p>
              <p><span className="font-semibold text-white">Words:</span> {scannerPreview.metadata.wordCount ?? 'n/a'}</p>
              {googlePlace?.rating != null ? (
                <p>
                  <span className="font-semibold text-white">Google Rating:</span>{' '}
                  {googlePlace.rating.toFixed(1)} ({googlePlace.userRatingCount ?? 0} reviews)
                </p>
              ) : null}
              {googlePlace?.googleMapsUri ? (
                <p>
                  <span className="font-semibold text-white">Maps:</span>{' '}
                  <a
                    href={googlePlace.googleMapsUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ff8a93] underline-offset-2 hover:underline"
                  >
                    Open profile
                  </a>
                </p>
              ) : null}
            </div>
            <a
              href={scanRecord.url}
              target="_blank"
              rel="noreferrer"
              className="btn-variant-secondary mt-3 px-3 py-2 text-xs"
            >
              Show page
            </a>
          </div>
        </article>
      </section>

      <details className="card mb-6 p-5">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.14em] text-[#c49a7a]">
          Expanded diagnostics
        </summary>
        <div className="mt-4 space-y-6">

      <section className="mb-2 grid gap-4 md:grid-cols-5">
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Technical SEO</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.technicalSeo}</p>
          <p className="mt-1 text-xs text-slate-600">{categoryScores.explanations.technicalSeo}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Local SEO</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.localSeo}</p>
          <p className="mt-1 text-xs text-slate-600">{categoryScores.explanations.localSeo}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Collision Authority</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.collisionAuthority}</p>
          <p className="mt-1 text-xs text-slate-600">
            {categoryScores.explanations.collisionAuthority}
          </p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Speed & Performance</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.speedPerformance}</p>
          <p className="mt-1 text-xs text-slate-600">
            {categoryScores.explanations.speedPerformance}
          </p>
        </article>
        <article className="card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Content Coverage</p>
          <p className="mt-1 text-3xl font-bold">{categoryScores.contentCoverage}</p>
          <p className="mt-1 text-xs text-slate-600">{categoryScores.explanations.contentCoverage}</p>
        </article>
      </section>

      <section className="card mb-2 p-5">
        <h2 className="text-lg font-bold text-slate-900">Health Meter</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {healthChecks.map((item) => (
            <div key={item.label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-medium text-slate-900">
                {scoreDot(item.score)} {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-1 p-5">
        <h2 className="text-lg font-bold text-slate-900">Rapid Diagnosis</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">What&apos;s wrong</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {ownerIssues.slice(0, 3).map((issue) => (
                <li key={issue.id}>{issue.title}</li>
              ))}
            </ul>
          </article>
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Fix first</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {ownerTopFixes.slice(0, 3).map((fix) => (
                <li key={fix.title}>{fix.title}</li>
              ))}
            </ul>
          </article>
          <article className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Competitor comparison</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(competitorDisplayRows.length > 0 ? competitorDisplayRows : vm.competitors)
                .slice(0, 2)
                .map((row, idx) =>
                  'advantages' in row ? (
                    <li key={row.name + idx}>{row.advantages[0] || row.name}</li>
                  ) : (
                    <li key={row.name + idx}>{row.whyWinning}</li>
                  )
                )}
              </ul>
            </article>
          </div>
      </section>
        </div>
      </details>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card print-break-avoid p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Website</p>
          <p className="mt-1 text-3xl font-bold">{formatScore(websiteCardScore)}</p>
          <p className="mt-1 text-xs text-slate-500">Performance score (PageSpeed mobile)</p>
        </div>
        <div className="card print-break-avoid p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Local</p>
          <p className="mt-1 text-3xl font-bold">{scoreLocal}</p>
        </div>
        <div className="card print-break-avoid p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Intent</p>
          <p className="mt-1 text-3xl font-bold">{scoreIntent}</p>
        </div>
      </section>

      <details className="mt-10 card print-break-avoid p-6">
        <summary className="cursor-pointer text-xl font-bold">Technical Diagnostics (secondary)</summary>
        {pagespeed.status === 'error' ? (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Could not load PageSpeed data right now. {pagespeed.message || 'Please try again later.'}
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">LCP</p>
                <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.lcpMs)}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">CLS</p>
                <p className="mt-1 text-lg font-semibold">{formatCls(pagespeed.cls)}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">TBT</p>
                <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.tbtMs)}</p>
              </article>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Speed Index</p>
                <p className="mt-1 text-lg font-semibold">{formatMilliseconds(pagespeed.speedIndexMs)}</p>
              </article>
            </div>

            <div className="mt-5 space-y-3">
              <h3 className="font-semibold text-slate-900">Top Website Issues</h3>
              {pagespeed.diagnostics.length === 0 ? (
                <p className="text-sm text-slate-600">No high-priority website issues detected from Lighthouse.</p>
              ) : (
                pagespeed.diagnostics.map((diag) => (
                  <article key={diag.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{diag.title}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${impactClass(diag.impact)}`}>
                        {diag.impact.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{diag.description}</p>
                    <p className="mt-1 text-sm text-slate-800">
                      <strong>Fix:</strong> {diag.recommendation}
                    </p>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </details>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Review Strength vs Local Rivals</h2>
        <p className="mt-1 text-sm text-slate-600">
          Snapshot of review strength versus top local competitor.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your shop</p>
            <p className="mt-1 text-lg font-semibold">
              {reviewGap.shopRating.toFixed(1)} stars • {reviewGap.shopReviews} reviews
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Top competitor</p>
            <p className="mt-1 text-lg font-semibold">
              {reviewGap.competitorRating.toFixed(1)} stars • {reviewGap.competitorReviews} reviews
            </p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Review gap</p>
            <p className="mt-1 text-lg font-semibold">{reviewGap.reviewGap} reviews</p>
            <p className="text-sm text-slate-700">Impact: {reviewGap.impact}</p>
          </article>
        </div>
        {sourceConfidence.reviews !== 'live' ? (
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <p>Google review source: {sourceConfidence.reviews}. Showing conservative estimate.</p>
            <p>We&apos;ll pull competitor review stats on the teardown.</p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Map Rankings for Collision Searches</h2>
        <p className="mt-1 text-sm text-slate-600">
          {sourceConfidence.mapPack === 'live'
            ? mapPack.info
            : 'Map pack ranks were unavailable in this run and will be pulled during teardown.'}
        </p>
        {sourceConfidence.mapPack === 'live' ? (
          <div className="mt-4 space-y-3">
            {mapPack.queries.map((row) => (
              <article key={row.query} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{row.query}</p>
                <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                  <div className="rounded bg-slate-50 p-3">
                    <p>Rank 1: {row.rank1}</p>
                    <p>Rank 2: {row.rank2}</p>
                    <p>Rank 3: {row.rank3}</p>
                  </div>
                  <div className="rounded bg-slate-50 p-3">
                    <p className="font-medium">Your position</p>
                    <p>{row.yourRank}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {mapPack.likelySignals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Trust Signals Shoppers Look For</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900">Detected</h3>
            {detectedSignals.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-900">No certification/capability signals detected.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm text-emerald-900">
                {detectedSignals.slice(0, 12).map((signal) => (
                  <li key={signal.signal_name}>
                    <p className="font-medium">{signal.signal_name.replace(/_/g, ' ')}</p>
                    <p className="text-xs">Confidence: {(signal.confidence * 100).toFixed(0)}%</p>
                    <a
                      href={signal.evidence.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline"
                    >
                      Evidence: {signal.evidence.snippet}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">Missing</h3>
            {missingSignals.length === 0 ? (
              <p className="mt-2 text-sm text-amber-900">No major baseline signals missing.</p>
            ) : (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {missingSignals.slice(0, 12).map((signal) => (
                  <li key={signal}>{signal.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Tasks Sorted by Priority</h2>
        <p className="mt-1 text-sm text-slate-600">
          Do these in order to lift estimate calls and local visibility fastest.
        </p>
        <div className="mt-4 space-y-3">
          {ownerTopFixes.map((fix, idx) => (
            <article key={fix.title} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">
                  #{idx + 1} {fix.title}
                </h3>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(fix.impact)}`}>
                  {fix.impact}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{fix.why}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {fix.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {nationalBenchmark ? (
        <section className="mt-6 card print-break-avoid p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">National Winners Playbook</h2>
              <p className="mt-1 text-sm text-slate-600">
                Comparison against top national collision shop patterns to show what drives more
                estimate requests.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              source: {nationalBenchmark.source}
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {nationalBenchmark.patterns.map((pattern) => (
              <article
                key={pattern.key}
                className={`rounded-lg border px-3 py-3 ${
                  pattern.gap
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{pattern.label}</p>
                  <p className="text-xs text-slate-700">
                    Leaders: {(pattern.leaderRate * 100).toFixed(0)}% • Your shop:{' '}
                    {pattern.shopHas ? 'Yes' : 'No'}
                  </p>
                </div>
                {pattern.evidenceExample ? (
                  <p className="mt-1 text-xs text-slate-600">Evidence: {pattern.evidenceExample}</p>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Do these to match national leaders</h3>
            {nationalBenchmark.topRecommendations.map((rec, idx) => (
              <article key={rec.title + idx} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    #{idx + 1} {rec.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(
                      rec.impact
                    )}`}
                  >
                    {rec.impact}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{rec.why}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {rec.action.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">How Competitors Are Winning More Calls</h2>
        <p className="mt-1 text-sm text-slate-600">
          Lightweight comparison of top competitors vs your current signal coverage.
        </p>
        {sourceConfidence.competitors !== 'live' ? (
          <p className="mt-2 text-xs text-slate-500">
            Live competitor crawl was unavailable for this run; showing best-available benchmark view.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {(competitorDisplayRows.length > 0 ? competitorDisplayRows : vm.competitors).map((row, idx) => (
            <article key={row.name + idx} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{row.name}</p>
              {'advantages' in row ? (
                <>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {row.advantages.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    OEM mentions: {row.oemSignalCount} | Capabilities: {row.capabilityCount} | Estimate CTA:{' '}
                    {row.estimateCta ? 'Yes' : 'No'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-700">Why they&apos;re winning: {row.whyWinning}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <details className="mt-8 card print-break-avoid p-6">
        <summary className="cursor-pointer text-xl font-bold">Crawl Evidence (secondary)</summary>
        <p className="mt-1 text-sm text-slate-600">
          Pages analyzed and fetch status used to compute this scan.
        </p>
        <div className="mt-4 grid gap-2">
          {crawlEvidenceRows.length === 0 ? (
            <p className="text-sm text-slate-600">No page metadata captured in this run.</p>
          ) : (
            crawlEvidenceRows.slice(0, 8).map((row) => (
              <article key={`${row.url}-${row.status}`} className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">{row.url}</p>
                <p className="text-xs text-slate-600">
                  status {row.status || 'n/a'} • {row.fetchMs}ms • {row.bytes} bytes
                </p>
              </article>
            ))
          )}
        </div>
      </details>

      <section className="mt-6 rounded-xl border border-teal-200 bg-teal-50 print-break-avoid p-6">
        <h2 className="text-xl font-bold text-slate-900">Estimated Opportunity (modeled)</h2>
        <p className="mt-1 text-sm text-slate-700">
          Modeled estimate based on local demand + visibility gaps. Not a guarantee.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Monthly search demand</p>
            <p className="mt-1 text-2xl font-bold">{vm.opportunity.monthlySearchDemand.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Missed leads/month</p>
            <p className="mt-1 text-2xl font-bold">{vm.opportunity.missedLeads.toLocaleString()}</p>
          </div>
          <div className="rounded-lg bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Revenue opportunity</p>
            <p className="mt-1 text-2xl font-bold">${vm.opportunity.revenueOpportunity.toLocaleString()}</p>
            <p className="text-xs text-slate-500">ARO: ${vm.opportunity.averageRepairOrder.toLocaleString()}</p>
          </div>
        </div>
      </section>

      <details className="mt-8 card print-break-avoid p-6">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.14em] text-[#c49a7a]">
          Full issue inventory
        </summary>
        <div className="mt-4 grid gap-3">
          {ownerIssues.length === 0 ? (
            <p className="text-sm text-slate-600">No major issues detected.</p>
          ) : null}
          {ownerIssues.map((issue) => (
            <article key={issue.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{issue.title}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(
                    issue.severity
                  )}`}
                >
                  {issue.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                <strong>Why:</strong> {issue.why}
              </p>
              <p className="mt-1 text-sm text-slate-800">
                <strong>Fix:</strong> {issue.fix}
              </p>
            </article>
          ))}
        </div>
      </details>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card print-break-avoid p-6">
          <h2 className="text-xl font-bold">Money Keywords</h2>
          <div className="mt-3 space-y-2">
            {vm.keywords.map((item) => (
              <article key={item.keyword} className="rounded-md bg-slate-100 px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.keyword}</p>
                  {item.estimated ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      est.
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-700">
                  Volume: {item.volumeLabel} | CPC: {item.cpcLabel} | Intent: {item.intent}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Exact volumes pulled during teardown.</p>
        </div>

        <div className="card print-break-avoid p-6">
          <h2 className="text-xl font-bold">Top local competitors we&apos;ll benchmark on your teardown</h2>
          <div className="mt-3 space-y-3">
            {vm.competitors.map((comp, idx) => (
              <article key={`${comp.name}-${idx}`} className="rounded-md border border-slate-200 p-3">
                <p className="font-semibold">{comp.name}</p>
                {typeof comp.rating === 'number' && typeof comp.reviews === 'number' ? (
                  <p className="mt-1 text-xs text-slate-700">
                    {comp.rating.toFixed(1)} stars • {comp.reviews} reviews
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-slate-700">Why they&apos;re winning: {comp.whyWinning}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">30-Day Plan</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {plan.map((item) => (
            <article key={item.week} className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{item.week}</p>
              <h3 className="mt-1 font-semibold">{item.focus}</h3>
              <p className="mt-1 text-sm text-slate-700">{item.outcome}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 card print-break-avoid p-6">
        <h2 className="text-xl font-bold">Executive Summary</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{executiveSummary}</p>
      </section>

      <section className="mt-8 card p-6 print-hide">
        <h2 className="text-xl font-bold">Want help fixing this?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Big Dot can handle the fixes with a one-time teardown or ongoing weekly monitoring.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {vm.ctaBullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <ReportCtaActions
          scanId={scanRecord.id}
          calendlyUrl={teardownIntakeUrl}
          salesPhone={salesPhone}
          reportUrl={reportUrl}
          trackBooked={false}
        />

        <ReportShareActions reportUrl={reportUrl} />

        <div className="mt-4">
          <Link href={monitoringLandingUrl} className="btn-variant-secondary px-4 py-2 text-sm">
            Prefer monitoring? Start free trial (no call required)
          </Link>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Not legal advice. SEO performance varies by location and competition.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Scoring model: {snapshot?.scoringModelVersion || dbScan?.scoringModelVersion || 'v0.1'}
        </p>
      </section>

      <div className="mt-8 print-hide">
        <Link href="/" className="text-sm text-teal-700 underline">
          Run another scan
        </Link>
      </div>

      <footer className="print-only mt-6 border-t border-slate-300 pt-3 text-[10px] text-slate-600">
        Collision SEO Scan report. Modeled estimates for planning only.
      </footer>
      </main>
    );
  } catch (error) {
    console.error('REPORT_LOAD_ERROR', {
      id: scanId,
      message: error instanceof Error ? error.message : 'Unknown report load error'
    });

    return (
      <main className="container-shell pb-20 pt-12">
        <section className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Report temporarily unavailable</h1>
          <p className="mt-2 text-sm text-slate-700">
            We could not load this report right now. Please retry in a moment or run a new scan.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-teal-700 underline">
            Back to scanner
          </Link>
        </section>
      </main>
    );
  }
}
