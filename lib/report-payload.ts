import type {
  CategoryScoreSet,
  CollisionSignal,
  Competitor,
  CompetitorAdvantage,
  MapPackResult,
  NationalBenchmarkResult,
  PageFetchMeta,
  PrioritizedFix,
  ScanChecks
} from '@/lib/types';
import type { GooglePlaceProfile } from '@/lib/google-places';

export type SourceConfidence = 'live' | 'cached' | 'modeled' | 'fallback';

export type ReviewGapPayload = {
  shopRating: number | null;
  shopReviews: number | null;
  competitorRating: number | null;
  competitorReviews: number | null;
  reviewGap: number | null;
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
  reviewGap: ReviewGapPayload | null;
  mapPack: MapPackPayload | null;
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
    mapPack?: {
      status: SourceConfidence | 'error';
      detail?: string;
    };
  };
};

function impactLabel(gap: number): 'High' | 'Med' | 'Low' {
  if (gap >= 180) return 'High';
  if (gap >= 70) return 'Med';
  return 'Low';
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
  mapPack?: MapPackResult;
}): ReportPayload {
  const resolvedMapPack = input.mapPack
    ? {
        info: input.mapPack.info,
        likelySignals: input.mapPack.likelySignals,
        queries: input.mapPack.queries
      }
    : null;

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
    reviewGap: null,
    mapPack: resolvedMapPack,
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
