import type { GooglePlaceProfile } from '@/lib/google-places';
import type { PageSpeedResult } from '@/lib/pagespeed';
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

const BLOCKED_COMPETITOR_HOSTS = [
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

const BLOCKED_COMPETITOR_NAME = /(yelp|yellow pages|mapquest|tripadvisor|wikipedia|facebook|best|top 10|directory)/i;

export function isValidScanId(id: string): boolean {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const cuid = /^c[a-z0-9]{24,}$/i;
  return uuid.test(id) || cuid.test(id);
}

export function buildFallbackPreviewUrl(rawUrl: string | null | undefined): string | null {
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

export function isSyntheticPathProbe(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '').toLowerCase();
    return path === '/contact' || path === '/estimate' || path === '/services' || path === '/certifications';
  } catch {
    return false;
  }
}

export function sanitizeExecutiveSummary(summary: string | null | undefined, score: number): string | null {
  const raw = (summary || '').trim();
  if (!raw) return null;
  const numeric = raw.match(/\b(\d{2,3})\b/g)?.map((n) => Number(n)).filter(Number.isFinite) || [];
  const likelyScore = numeric.find((n) => n >= 0 && n <= 100);
  if (typeof likelyScore === 'number' && Math.abs(likelyScore - score) >= 8) return null;
  return raw;
}

export function isUnavailableCompetitorLine(text: string): boolean {
  return /competitor page fetch unavailable/i.test(text);
}

export function isPlaceholderCompetitorName(name: string): boolean {
  return /^(leading\s+.+\s+collision shop|top-rated\s+.+\s+auto body brand|high-visibility\s+.+\s+repair competitor)$/i.test(
    name.trim()
  );
}

export function isPlaceholderMapLabel(value: string): boolean {
  return /^(leading\s+.+\s+collision shop|top-rated\s+.+\s+auto body brand|high-visibility\s+.+\s+repair competitor)$/i.test(
    value.trim()
  );
}

export function sanitizeEvidenceSnippet(rawSnippet: string): string {
  const cleaned = rawSnippet
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Evidence snippet unavailable.';
  const noisy =
    /@media|background-image|register\(|serviceWorker|function\s*\(|=>|\.x\s+\.c1-|{[^}]+}|@font-face|font-family:|src: url\(/i.test(
      cleaned
    );
  if (noisy) return 'Evidence found in page source, but the raw excerpt was non-readable CSS/JS.';
  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
}

export function severityClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === 'high') return 'bg-red-100 text-red-700';
  if (normalized === 'med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

export function impactClass(impact: 'high' | 'med' | 'low') {
  if (impact === 'high') return 'bg-red-100 text-red-700';
  if (impact === 'med') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

export function sourcePill(
  state: 'live' | 'cached' | 'modeled' | 'fallback' | 'unavailable'
): { label: string; className: string } {
  if (state === 'live') {
    return { label: 'Live', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
  }
  if (state === 'cached') {
    return { label: 'Cached', className: 'border-sky-500/30 bg-sky-500/10 text-sky-300' };
  }
  if (state === 'modeled') {
    return { label: 'Modeled', className: 'border-amber-500/30 bg-amber-500/10 text-amber-200' };
  }
  if (state === 'fallback') {
    return { label: 'Fallback', className: 'border-rose-500/30 bg-rose-500/10 text-rose-200' };
  }
  return { label: 'Unavailable', className: 'border-white/15 bg-white/5 text-white/60' };
}

function normalizeImpact(value: unknown): 'high' | 'med' | 'low' {
  if (value === 'high' || value === 'med' || value === 'low') return value;
  return 'low';
}

export function normalizePageSpeed(input: unknown, fallbackWebsiteScore: number): PageSpeedResult {
  const raw = (input || {}) as Partial<PageSpeedResult> & { diagnostics?: unknown };
  const diagnostics = Array.isArray(raw.diagnostics)
    ? raw.diagnostics
        .map((item, idx) => {
          const row = item as Record<string, unknown>;
          return {
            id: typeof row?.id === 'string' ? row.id : `diag-${idx}`,
            title: typeof row?.title === 'string' ? row.title : 'Website issue detected',
            description:
              typeof row?.description === 'string'
                ? row.description
                : 'This website element is reducing page performance.',
            impact: normalizeImpact(row?.impact),
            recommendation:
              typeof row?.recommendation === 'string'
                ? row.recommendation
                : 'Apply technical cleanup to improve performance.'
          };
        })
        .slice(0, 5)
    : [];

  return {
    status: raw.status === 'ok' ? 'ok' : 'error',
    message: typeof raw.message === 'string' ? raw.message : undefined,
    performanceScore: typeof raw.performanceScore === 'number' ? raw.performanceScore : fallbackWebsiteScore,
    lcpMs: typeof raw.lcpMs === 'number' ? raw.lcpMs : null,
    cls: typeof raw.cls === 'number' ? raw.cls : null,
    tbtMs: typeof raw.tbtMs === 'number' ? raw.tbtMs : null,
    speedIndexMs: typeof raw.speedIndexMs === 'number' ? raw.speedIndexMs : null,
    diagnostics
  };
}

export function normalizeIssues(input: unknown): Issue[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      const severity =
        row?.severity === 'High' || row?.severity === 'Med' || row?.severity === 'Low' ? row.severity : 'Low';
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

export function normalizeKeywords(input: unknown): MoneyKeyword[] {
  if (!Array.isArray(input)) return [];
  return input
    .map<MoneyKeyword | null>((item) => {
      if (typeof item === 'string') return { keyword: item, source: 'modeled' };
      const row = item as Record<string, unknown>;
      if (typeof row?.keyword !== 'string') return null;
      return {
        keyword: row.keyword,
        volume: typeof row.volume === 'number' ? row.volume : null,
        cpc: typeof row.cpc === 'number' ? row.cpc : null,
        source: row.source === 'api' ? 'api' : 'modeled'
      };
    })
    .filter((item): item is MoneyKeyword => Boolean(item))
    .slice(0, 20);
}

export function sanitizeKeywordsForSignals(
  input: MoneyKeyword[],
  city: string,
  raw: Record<string, unknown>
): MoneyKeyword[] {
  const checks = (raw.checks as Record<string, unknown> | undefined) || {};
  const oemSignals = Array.isArray(checks.oemSignals)
    ? checks.oemSignals.filter((v): v is string => typeof v === 'string').map((v) => v.toLowerCase())
    : [];
  const fleetSignals = Array.isArray(checks.fleetSignals)
    ? checks.fleetSignals.filter((v): v is string => typeof v === 'string').map((v) => v.toLowerCase())
    : [];

  const filtered = input.filter((item) => {
    if (item.source === 'api') return true;
    const keyword = item.keyword.toLowerCase();
    if (/(subaru|ford|gm|gmc|chevrolet|cadillac|nissan|infiniti)/i.test(keyword) && oemSignals.length === 0) return false;
    if (/(sprinter|promaster|transit)/i.test(keyword) && fleetSignals.length === 0) return false;
    return true;
  });

  if (filtered.length > 0) return filtered;

  return [
    { keyword: `collision repair ${city.toLowerCase()}`, source: 'modeled' },
    { keyword: `auto body shop ${city.toLowerCase()}`, source: 'modeled' },
    { keyword: `bumper repair ${city.toLowerCase()}`, source: 'modeled' },
    { keyword: `hail damage repair ${city.toLowerCase()}`, source: 'modeled' },
    { keyword: `auto body estimate ${city.toLowerCase()}`, source: 'modeled' }
  ];
}

export function normalizeCompetitors(input: unknown): Competitor[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      const name = typeof row?.name === 'string' && row.name.trim() ? row.name : `Competitor ${idx + 1}`;
      const url = typeof row?.url === 'string' ? row.url : undefined;
      const host = (() => {
        try {
          return url ? new URL(url).hostname.replace(/^www\./i, '').toLowerCase() : '';
        } catch {
          return '';
        }
      })();
      if (
        BLOCKED_COMPETITOR_NAME.test(name) ||
        (host && BLOCKED_COMPETITOR_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`)))
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
    .filter((item): item is Competitor => Boolean(item))
    .slice(0, 5);
}

export function normalizePlan(input: unknown): ThirtyDayPlanItem[] {
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

export function normalizeCategoryScores(
  input: unknown,
  fallback: { website: number; local: number; intent: number; total: number }
): CategoryScoreSet {
  const row = (input || {}) as Partial<CategoryScoreSet>;
  const derivedCoverage = Math.round((fallback.website + fallback.intent) / 2);
  return {
    technicalSeo: typeof row.technicalSeo === 'number' ? row.technicalSeo : fallback.website,
    localSeo: typeof row.localSeo === 'number' ? row.localSeo : fallback.local,
    collisionAuthority: typeof row.collisionAuthority === 'number' ? row.collisionAuthority : fallback.intent,
    speedPerformance: typeof row.speedPerformance === 'number' ? row.speedPerformance : fallback.website,
    contentCoverage: typeof row.contentCoverage === 'number' ? row.contentCoverage : derivedCoverage,
    overall: typeof row.overall === 'number' ? row.overall : fallback.total,
    explanations: {
      technicalSeo: row.explanations?.technicalSeo || 'Foundational crawlability, metadata quality, and indexability signals.',
      localSeo: row.explanations?.localSeo || 'Google Maps/NAP/review and local intent readiness signals.',
      collisionAuthority:
        row.explanations?.collisionAuthority || 'Collision-specific certifications and capability trust signals.',
      speedPerformance:
        row.explanations?.speedPerformance || 'Page speed and UX readiness from measured or modeled checks.',
      contentCoverage:
        row.explanations?.contentCoverage || 'Coverage of high-intent service content and conversion pages.'
    }
  };
}

export function normalizeSignals(input: unknown): CollisionSignal[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as CollisionSignal)
    .filter((signal) => typeof signal?.signal_name === 'string' && typeof signal?.evidence?.url === 'string')
    .slice(0, 30);
}

export function normalizeTopFixes(input: unknown, issues: Issue[]): PrioritizedFix[] {
  if (Array.isArray(input) && input.length > 0) {
    return input
      .map((item) => item as PrioritizedFix)
      .filter((fix) => typeof fix?.title === 'string' && Array.isArray(fix?.steps))
      .slice(0, 3);
  }

  return issues.slice(0, 3).map((issue) => ({
    title: issue.title,
    why: issue.why,
    impact: issue.severity,
    steps: [issue.fix, 'Apply on homepage first.', 'Re-scan to verify improvement.']
  }));
}

export function normalizeMissingSignals(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is string => typeof value === 'string').slice(0, 20);
}

export function normalizeCompetitorAdvantages(input: unknown): CompetitorAdvantage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as CompetitorAdvantage)
    .filter((row) => typeof row?.name === 'string' && Array.isArray(row?.advantages))
    .slice(0, 5);
}

export function normalizePageMeta(input: unknown): PageFetchMeta[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => item as PageFetchMeta)
    .filter((row) => typeof row?.url === 'string' && typeof row?.status === 'number')
    .slice(0, 20);
}

export function normalizeNationalBenchmark(input: unknown): NationalBenchmarkResult | null {
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

export function scoreDot(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  return '🔴';
}

export function checksScore(raw: Record<string, unknown>, key: 'title' | 'estimate' | 'reviews' | 'map' | 'phone'): boolean {
  const checks = (raw.checks as Record<string, unknown> | undefined) || {};
  if (key === 'title') return typeof checks.title === 'string' && checks.title.trim().length > 0;
  if (key === 'reviews') return Boolean(checks.reviewWidgetOrSchema);
  if (key === 'map') return Boolean(checks.mapsLinkDetected) || Boolean(checks.mapEmbedDetected);
  if (key === 'phone') return Boolean(checks.napDetected);
  return Boolean(checks.estimateCtaDetected);
}

export function buildExecutiveSummaryFallback(input: {
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

export function ownerText(input: string): string {
  return input
    .replace(/SERPs?/gi, 'Google search results')
    .replace(/\bCTR\b/gi, 'click-through rate')
    .replace(/\bGBP\b/gi, 'Google Business Profile')
    .replace(/\bNAP\b/gi, 'business name, address, and phone')
    .replace(/schema/gi, 'structured business info')
    .replace(/crawlability/gi, 'how easily Google can read your site');
}

export function ownerIssueTitle(title: string): string {
  if (/missing page title/i.test(title)) return 'Add a clear homepage title';
  if (/missing h1/i.test(title)) return 'Add one clear homepage headline';
  if (/google maps profile link not detected/i.test(title)) return 'Link your Google Business Profile';
  if (/meta description missing/i.test(title)) return 'Add a search snippet for your homepage';
  if (/no embedded map found/i.test(title)) return 'Add a map on your contact page';
  return ownerText(title);
}

export function withBusinessImpact(reason: string): string {
  if (/call|lead|estimate|book/i.test(reason)) return ownerText(reason);
  return `${ownerText(reason)} This can reduce estimate requests from local search.`;
}

export function buildSourceConfidenceState(args: {
  payloadSources?: {
    pagespeed: 'live' | 'cached' | 'modeled' | 'fallback';
    serp: 'live' | 'cached' | 'modeled' | 'fallback';
    aiSummary: 'live' | 'cached' | 'modeled' | 'fallback';
    reviews: 'live' | 'cached' | 'modeled' | 'fallback';
    mapPack: 'live' | 'cached' | 'modeled' | 'fallback';
    competitors: 'live' | 'cached' | 'modeled' | 'fallback';
    keywords: 'live' | 'cached' | 'modeled' | 'fallback';
  } | null;
  reviewGap: {
    shopRating: number | null;
    shopReviews: number | null;
    competitorRating: number | null;
    competitorReviews: number | null;
    reviewGap: number | null;
    impact: 'High' | 'Med' | 'Low';
  } | null;
  mapPack: { queries: Array<{ rank1: string; rank2: string; rank3: string; yourRank: string }> } | null;
  googlePlace?: GooglePlaceProfile | null;
  competitors: Competitor[];
}) {
  const sourceConfidence = args.payloadSources || {
    pagespeed: 'fallback',
    serp: 'fallback',
    aiSummary: 'fallback',
    reviews: 'fallback',
    mapPack: 'fallback',
    competitors: 'fallback',
    keywords: 'modeled'
  };

  const hasLiveCompetitorData = sourceConfidence.competitors === 'live' || sourceConfidence.competitors === 'cached';
  const hasLiveMapPackData = sourceConfidence.mapPack === 'live' || sourceConfidence.mapPack === 'cached';
  const hasLiveReviewData = sourceConfidence.reviews === 'live' || sourceConfidence.reviews === 'cached';
  const hasLiveKeywordData = sourceConfidence.keywords === 'live' || sourceConfidence.keywords === 'cached';

  const reviewGapLooksSynthetic =
    !!args.reviewGap &&
    args.reviewGap.shopRating === 4.6 &&
    args.reviewGap.shopReviews === 132 &&
    args.reviewGap.competitorRating === 4.8 &&
    args.reviewGap.competitorReviews === 420;
  const reviewGapConflictsWithGooglePlace =
    !!args.reviewGap &&
    typeof args.googlePlace?.rating === 'number' &&
    typeof args.reviewGap.shopRating === 'number' &&
    Math.abs(args.reviewGap.shopRating - args.googlePlace.rating) >= 0.2;
  const hasUsableReviewGap =
    !!args.reviewGap && hasLiveReviewData && !reviewGapLooksSynthetic && !reviewGapConflictsWithGooglePlace;
  const ownGoogleReviewLabel =
    typeof args.googlePlace?.rating === 'number' ? `${args.googlePlace.rating.toFixed(1)} ★` : null;
  const hasPlaceholderCompetitors = args.competitors.some((row) => isPlaceholderCompetitorName(row.name));
  const hasUsableCompetitorData = hasLiveCompetitorData && args.competitors.length > 0 && !hasPlaceholderCompetitors;
  const hasPlaceholderMapPackRows =
    !Array.isArray(args.mapPack?.queries) ||
    args.mapPack.queries.length === 0 ||
    args.mapPack.queries.every(
      (row) =>
        isPlaceholderMapLabel(row.rank1) &&
        isPlaceholderMapLabel(row.rank2) &&
        isPlaceholderMapLabel(row.rank3) &&
        /(likely #|outside top|position unavailable|not found)/i.test(row.yourRank)
    );
  const hasUsableMapPackData = hasLiveMapPackData && !hasPlaceholderMapPackRows;

  return {
    sourceConfidence,
    hasLiveKeywordData,
    hasUsableReviewGap,
    ownGoogleReviewLabel,
    hasUsableCompetitorData,
    hasUsableMapPackData,
    reviewSource: sourcePill(
      hasUsableReviewGap
        ? (sourceConfidence.reviews as 'live' | 'cached')
        : ownGoogleReviewLabel
          ? hasLiveReviewData
            ? (sourceConfidence.reviews as 'live' | 'cached')
            : 'fallback'
          : 'unavailable'
    ),
    competitorSource: sourcePill(
      hasUsableCompetitorData ? (sourceConfidence.competitors as 'live' | 'cached') : 'unavailable'
    ),
    mapPackSource: sourcePill(
      hasUsableMapPackData ? (sourceConfidence.mapPack as 'live' | 'cached') : 'unavailable'
    ),
    keywordSource: sourcePill(
      hasLiveKeywordData ? (sourceConfidence.keywords as 'live' | 'cached') : 'modeled'
    ),
    opportunitySource: sourcePill(
      hasLiveKeywordData ? (sourceConfidence.keywords as 'live' | 'cached') : 'modeled'
    )
  };
}
