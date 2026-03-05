export type Severity = 'High' | 'Med' | 'Low';

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
};
