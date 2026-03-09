import type {
  CategoryScoreSet,
  CollisionSignal,
  Competitor,
  CompetitorAdvantage,
  NationalBenchmarkResult,
  PageFetchMeta,
  PrioritizedFix,
  ScanChecks
} from '@/lib/types';
import type { GooglePlaceProfile } from '@/lib/google-places';

export type SourceConfidence = 'live' | 'cached' | 'modeled' | 'fallback';

export type ReviewGapPayload = {
  shopRating: number;
  shopReviews: number;
  competitorRating: number;
  competitorReviews: number;
  reviewGap: number;
  impact: 'High' | 'Med' | 'Low';
};

export type MapPackQueryPayload = {
  query: string;
  rank1: string;
  rank2: string;
  rank3: string;
  yourRank: string;
};

export type MapPackPayload = {
  info: string;
  likelySignals: string[];
  queries: MapPackQueryPayload[];
};

export type ReportPayload = {
  version: 'v1';
  generatedAt: string;
  checks: ScanChecks;
  categoryScores: CategoryScoreSet;
  detectedSignals: CollisionSignal[];
  missingSignals: string[];
  capabilityMissing: string[];
  topFixes: PrioritizedFix[];
  competitorAdvantages: CompetitorAdvantage[];
  nationalBenchmark?: NationalBenchmarkResult;
  missingPages: string[];
  pageFetchMeta: PageFetchMeta[];
  scanDurationMs: number;
  reviewGap: ReviewGapPayload;
  mapPack: MapPackPayload;
  scannerPreview?: {
    screenshotUrl: string | null;
    captureSource: SourceConfidence;
    metadata: {
      title: string | null;
      metaDescription: string | null;
      url: string;
      statusCode: number | null;
      responseTimeMs: number | null;
      fileSizeBytes: number | null;
      wordCount: number | null;
    };
  };
  googlePlace?: GooglePlaceProfile;
  sources: {
    pagespeed: SourceConfidence;
    serp: SourceConfidence;
    aiSummary: SourceConfidence;
    reviews: SourceConfidence;
    mapPack: SourceConfidence;
    competitors: SourceConfidence;
    keywords: SourceConfidence;
  };
  providerStatus?: {
    pagespeed: {
      status: SourceConfidence | 'error';
      detail?: string;
    };
    serp: {
      status: SourceConfidence | 'error';
      detail?: string;
    };
    aiSummary: {
      status: SourceConfidence | 'error';
      provider?: string;
      detail?: string;
    };
    snapshot: {
      status: SourceConfidence | 'error';
      detail?: string;
    };
    googlePlaces?: {
      status: SourceConfidence | 'error';
      detail?: string;
    };
  };
};

const REVIEW_DEFAULTS = {
  shopRating: 4.6,
  shopReviews: 132,
  competitorRating: 4.8,
  competitorReviews: 420
};

function impactLabel(gap: number): 'High' | 'Med' | 'Low' {
  if (gap >= 180) return 'High';
  if (gap >= 70) return 'Med';
  return 'Low';
}

function buildReviewGapPayload(): ReviewGapPayload {
  const gap = REVIEW_DEFAULTS.competitorReviews - REVIEW_DEFAULTS.shopReviews;
  return {
    ...REVIEW_DEFAULTS,
    reviewGap: gap,
    impact: impactLabel(gap)
  };
}

function buildMapPackPayload(city: string, shopName: string, competitors: Competitor[]): MapPackPayload {
  const c = city.toLowerCase();
  const rank1 = competitors[0]?.name || `Leading ${city} collision shop`;
  const rank2 = competitors[1]?.name || `Top-rated ${city} auto body brand`;
  const rank3 = competitors[2]?.name || `High-visibility ${city} repair competitor`;

  const queries: MapPackQueryPayload[] = [
    `collision repair ${c}`,
    `auto body shop ${c}`,
    `bumper repair ${c}`,
    `hail damage repair ${c}`
  ].map((query, idx) => ({
    query,
    rank1,
    rank2,
    rank3,
    yourRank: idx === 0 ? `${shopName} (likely #4-#7)` : `${shopName} (outside top 3)`
  }));

  return {
    info: 'Map pack ranks will be pulled on your teardown - we will show exactly who is outranking you and why.',
    likelySignals: [
      'Review velocity and star rating advantage',
      'Tighter service + location category match',
      'Stronger city service pages and internal linking',
      'More prominent estimate CTA and conversion flow'
    ],
    queries
  };
}

export function buildReportPayload(input: {
  city: string;
  shopName: string;
  checks: ScanChecks;
  categoryScores: CategoryScoreSet;
  detectedSignals: CollisionSignal[];
  missingSignals: string[];
  capabilityMissing: string[];
  topFixes: PrioritizedFix[];
  competitorAdvantages: CompetitorAdvantage[];
  missingPages: string[];
  pageFetchMeta: PageFetchMeta[];
  scanDurationMs: number;
  competitors: Competitor[];
  nationalBenchmark?: NationalBenchmarkResult;
  scannerPreview?: ReportPayload['scannerPreview'];
  googlePlace?: ReportPayload['googlePlace'];
  sources: ReportPayload['sources'];
  providerStatus?: ReportPayload['providerStatus'];
}): ReportPayload {
  return {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    checks: input.checks,
    categoryScores: input.categoryScores,
    detectedSignals: input.detectedSignals,
    missingSignals: input.missingSignals,
    capabilityMissing: input.capabilityMissing,
    topFixes: input.topFixes,
    competitorAdvantages: input.competitorAdvantages,
    nationalBenchmark: input.nationalBenchmark,
    missingPages: input.missingPages,
    pageFetchMeta: input.pageFetchMeta,
    scanDurationMs: input.scanDurationMs,
    reviewGap: buildReviewGapPayload(),
    mapPack: buildMapPackPayload(input.city, input.shopName, input.competitors),
    scannerPreview: input.scannerPreview,
    googlePlace: input.googlePlace,
    sources: input.sources,
    providerStatus: input.providerStatus
  };
}

export function parseReportPayload(input: unknown): ReportPayload | null {
  if (!input || typeof input !== 'object') return null;
  const row = input as Partial<ReportPayload>;
  if (row.version !== 'v1') return null;
  if (!row.categoryScores || !row.sources) return null;
  return row as ReportPayload;
}
