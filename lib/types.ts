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
  missingPages: string[];
  pageFetchMeta: PageFetchMeta[];
  scanDurationMs: number;
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
