export type Severity = 'High' | 'Med' | 'Low';

export type CategoryKey =
  | 'technicalSeo'
  | 'localSeo'
  | 'collisionAuthority'
  | 'speedPerformance'
  | 'contentCoverage';

export type Issue = {
  id: string;
  severity: Severity;
  title: string;
  why: string;
  fix: string;
};

export type Competitor = {
  name: string;
  url?: string;
  note: string;
  differentiatorGuess: string;
};

export type MoneyKeyword = {
  keyword: string;
  volume?: number | null;
  cpc?: number | null;
  source: 'api' | 'modeled';
};

export type ThirtyDayPlanItem = {
  week: string;
  focus: string;
  outcome: string;
};

export type ScanChecks = {
  checkedUrls: string[];
  https: boolean;
  title: string;
  titleHasCityOrService: boolean;
  metaDescription: string;
  h1: string;
  h1HasServiceOrCity: boolean;
  napDetected: boolean;
  estimateCtaDetected: boolean;
  performanceScore: number;
  performanceMethod: 'lighthouse' | 'ttfb-heuristic';
  sitemapFound: boolean;
  mapsLinkDetected: boolean;
  mapEmbedDetected: boolean;
  directionsOrReviewsCta: boolean;
  reviewWidgetOrSchema: boolean;
  oemSignals: string[];
  fleetSignals: string[];
  insuranceSignals: string[];
  schemaTypes: string[];
  fetchNotes: string[];
  homeWordCount: number;
  onlineEstimateFlow: boolean;
  locationFinderPresent: boolean;
  warrantyMentioned: boolean;
  insuranceGuidancePresent: boolean;
  adasMentioned: boolean;
  reviewProofPresent: boolean;
};

export type SignalEvidence = {
  url: string;
  snippet: string;
  selector?: string;
};

export type CollisionSignal = {
  signal_name: string;
  confidence: number;
  evidence: SignalEvidence;
  group: 'certification' | 'capability' | 'service';
};

export type CategoryScoreSet = {
  technicalSeo: number;
  localSeo: number;
  collisionAuthority: number;
  speedPerformance: number;
  contentCoverage: number;
  overall: number;
  explanations: Record<CategoryKey, string>;
};

export type PrioritizedFix = {
  title: string;
  why: string;
  steps: string[];
  impact: Severity;
};

export type CompetitorAdvantage = {
  name: string;
  url?: string;
  advantages: string[];
  oemSignalCount: number;
  capabilityCount: number;
  estimateCta: boolean;
};

export type BenchmarkPatternKey =
  | 'estimate_cta'
  | 'oem_certifications'
  | 'insurance_guidance'
  | 'warranty_visibility'
  | 'location_finder'
  | 'review_proof'
  | 'service_page_depth';

export type NationalBenchmarkPattern = {
  key: BenchmarkPatternKey;
  label: string;
  importance: Severity;
  leaderRate: number;
  shopHas: boolean;
  gap: boolean;
  evidenceExample: string | null;
};

export type NationalBenchmarkRecommendation = {
  title: string;
  why: string;
  action: string[];
  impact: Severity;
};

export type NationalBenchmarkSite = {
  domain: string;
  url: string;
  patterns: Record<BenchmarkPatternKey, boolean>;
  evidence: Partial<Record<BenchmarkPatternKey, string>>;
};

export type NationalBenchmarkResult = {
  source: 'live' | 'cached' | 'fallback';
  scannedAt: string;
  sampleSize: number;
  successfulSites: number;
  leaderSites: NationalBenchmarkSite[];
  patterns: NationalBenchmarkPattern[];
  topRecommendations: NationalBenchmarkRecommendation[];
};

export type PageFetchMeta = {
  url: string;
  status: number;
  fetchMs: number;
  bytes: number;
  ok: boolean;
};

export type ScoreResult = {
  total: number;
  website: number;
  local: number;
  intent: number;
  issues: Issue[];
  failedKeys: string[];
};

export type ScanResult = {
  checks: ScanChecks;
  scores: ScoreResult;
  categoryScores: CategoryScoreSet;
  detectedSignals: CollisionSignal[];
  missingSignals: string[];
  capabilityMissing: string[];
  topFixes: PrioritizedFix[];
  competitorAdvantages: CompetitorAdvantage[];
  nationalBenchmark: NationalBenchmarkResult;
  missingPages: string[];
  pageFetchMeta: PageFetchMeta[];
  scanDurationMs: number;
  sources: {
    serp: 'live' | 'cached' | 'fallback';
    aiSummary: 'live' | 'fallback';
    keywords: 'live' | 'modeled';
  };
  moneyKeywords: MoneyKeyword[];
  competitors: Competitor[];
  aiSummary?: string;
  thirtyDayPlan: ThirtyDayPlanItem[];
};

export type ScanRecord = {
  id: string;
  createdAt: string;
  url: string;
  shopName: string;
  city: string;
  email: string | null;
  phone: string | null;
  pagespeed: import('@/lib/pagespeed').PageSpeedResult;
  scoreTotal?: number;
  scoreWebsite?: number;
  scoreLocal?: number;
  scoreIntent?: number;
};
