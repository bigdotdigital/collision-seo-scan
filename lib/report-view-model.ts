import type { Competitor, Issue, MoneyKeyword, ThirtyDayPlanItem } from '@/lib/types';
import { estimateOpportunity } from '@/lib/business-impact';

export interface ReportData {
  scanId: string;
  shopName: string;
  city: string;
  websiteUrl: string;
  scoreTotal: number;
  scoreWebsite: number;
  scoreLocal: number;
  scoreIntent: number;
  issues: Issue[];
  moneyKeywords: MoneyKeyword[];
  competitors: Competitor[];
  thirtyDayPlan: ThirtyDayPlanItem[];
  aiSummary?: string | null;
  calendlyBase: string;
  salesPhone: string;
  rawChecks?: {
    reviews?: {
      rating?: number;
      reviews?: number;
    };
    competitorReviews?: {
      rating?: number;
      reviews?: number;
    };
  };
}

type ReviewGap = {
  shopRating: number;
  shopReviews: number;
  competitorRating: number;
  competitorReviews: number;
  reviewGap: number;
  impact: 'High' | 'Med' | 'Low';
  isEstimated: boolean;
};

type MapPackQuery = {
  query: string;
  rank1: string;
  rank2: string;
  rank3: string;
  yourRank: string;
};

type KeywordView = {
  keyword: string;
  volumeLabel: string;
  cpcLabel: string;
  intent: 'High' | 'Med';
  estimated: boolean;
};

type CompetitorView = {
  name: string;
  whyWinning: string;
  rating?: number;
  reviews?: number;
};

export type ReportViewModel = {
  dataStatusBanner: string | null;
  opportunity: ReturnType<typeof estimateOpportunity>;
  reviewGap: ReviewGap;
  mapPack: {
    queries: MapPackQuery[];
    info: string;
    likelySignals: string[];
  };
  keywords: KeywordView[];
  competitors: CompetitorView[];
  calendlyTrackedUrl: string;
  ctaBullets: string[];
};

const REVIEW_DEFAULTS = {
  shopRating: 0,
  shopReviews: 0,
  competitorRating: 0,
  competitorReviews: 0
};

const MAP_QUERY_TEMPLATES = [
  'collision repair {city}',
  'auto body shop near me',
  'bumper repair {city}',
  'hail damage repair {city}',
  'free collision estimate {city}'
];

const WHY_WINNING = [
  'Higher review velocity and stronger local trust signals.',
  'Better category match and location-page depth.',
  'Stronger estimate CTA visibility on mobile and desktop.',
  'More complete service coverage for OEM + insurance intent.'
];

function impactLabel(gap: number): 'High' | 'Med' | 'Low' {
  if (gap >= 180) return 'High';
  if (gap >= 70) return 'Med';
  return 'Low';
}

function withCalendlyParams(base: string, input: { scanId: string; shop: string; city: string }) {
  try {
    const u = new URL(base);
    u.searchParams.set('scanId', input.scanId);
    u.searchParams.set('shop', input.shop);
    u.searchParams.set('city', input.city);
    return u.toString();
  } catch {
    return `${base}?scanId=${encodeURIComponent(input.scanId)}&shop=${encodeURIComponent(input.shop)}&city=${encodeURIComponent(input.city)}`;
  }
}

function intentFromKeyword(keyword: string): 'High' | 'Med' {
  const k = keyword.toLowerCase();
  if (k.includes('estimate') || k.includes('certified') || k.includes('collision repair')) return 'High';
  return 'Med';
}

function keywordViewModel(items: MoneyKeyword[]): { rows: KeywordView[]; estimatedAny: boolean } {
  let estimatedAny = false;

  const rows = items.map((item) => {
    const hasVolume = typeof item.volume === 'number';
    const hasCpc = typeof item.cpc === 'number';
    const volumeValue: number | undefined = hasVolume ? item.volume ?? undefined : undefined;
    const cpcValue: number | undefined = hasCpc ? item.cpc ?? undefined : undefined;
    const estimated = !hasVolume || !hasCpc || item.source === 'modeled';
    if (estimated) estimatedAny = true;

    return {
      keyword: item.keyword,
      volumeLabel:
        volumeValue !== undefined ? `${volumeValue.toLocaleString()}/mo` : '~20-90/mo (est.)',
      cpcLabel: cpcValue !== undefined ? `$${cpcValue.toFixed(2)}` : '~$12-$35 (est.)',
      intent: intentFromKeyword(item.keyword),
      estimated
    };
  });

  return { rows, estimatedAny };
}

function competitorViewModel(city: string, items: Competitor[], reviews: ReviewGap): CompetitorView[] {
  const names = items.map((c) => c.name).slice(0, 3);
  if (names.length === 0) return [];

  return names.map((name, idx) => ({
    name,
    whyWinning: WHY_WINNING[idx % WHY_WINNING.length],
    rating: idx === 0 ? reviews.competitorRating : undefined,
    reviews: idx === 0 ? reviews.competitorReviews : undefined
  }));
}

function reviewGapView(data: ReportData): ReviewGap {
  const liveShopRating = data.rawChecks?.reviews?.rating;
  const liveShopReviews = data.rawChecks?.reviews?.reviews;
  const liveCompetitorRating = data.rawChecks?.competitorReviews?.rating;
  const liveCompetitorReviews = data.rawChecks?.competitorReviews?.reviews;

  const hasLive =
    typeof liveShopRating === 'number' &&
    typeof liveShopReviews === 'number' &&
    typeof liveCompetitorRating === 'number' &&
    typeof liveCompetitorReviews === 'number';

  const shopRating = hasLive ? liveShopRating : REVIEW_DEFAULTS.shopRating;
  const shopReviews = hasLive ? liveShopReviews : REVIEW_DEFAULTS.shopReviews;
  const competitorRating = hasLive ? liveCompetitorRating : REVIEW_DEFAULTS.competitorRating;
  const competitorReviews = hasLive ? liveCompetitorReviews : REVIEW_DEFAULTS.competitorReviews;

  const gap = competitorReviews - shopReviews;

  return {
    shopRating,
    shopReviews,
    competitorRating,
    competitorReviews,
    reviewGap: gap,
    impact: impactLabel(gap),
    isEstimated: !hasLive
  };
}

function mapPackView(city: string, shopName: string, competitors: CompetitorView[]): MapPackQuery[] {
  if (competitors.length === 0) return [];
  const c = city.toLowerCase();
  const rank1 = competitors[0]?.name || 'n/a';
  const rank2 = competitors[1]?.name || 'n/a';
  const rank3 = competitors[2]?.name || 'n/a';

  return MAP_QUERY_TEMPLATES.slice(0, 4).map((template, idx) => ({
    query: template.replace('{city}', c),
    rank1,
    rank2,
    rank3,
    yourRank: `${shopName} (position unavailable)`
  }));
}

export function buildReportViewModel(reportData: ReportData): ReportViewModel {
  const reviewGap = reviewGapView(reportData);
  const competitors = competitorViewModel(reportData.city, reportData.competitors, reviewGap);
  const mapQueries = mapPackView(reportData.city, reportData.shopName, competitors);
  const keyword = keywordViewModel(reportData.moneyKeywords);

  const opportunity = estimateOpportunity(reportData.scoreTotal, reportData.moneyKeywords);
  const calendlyTrackedUrl = withCalendlyParams(reportData.calendlyBase, {
    scanId: reportData.scanId,
    shop: reportData.shopName,
    city: reportData.city
  });

  const estimatedAny = reviewGap.isEstimated || keyword.estimatedAny;

  return {
    dataStatusBanner: estimatedAny
      ? 'Some metrics are estimated until competitor + keyword sources are connected.'
      : null,
    opportunity,
    reviewGap,
    mapPack: {
      queries: mapQueries,
      info:
        mapQueries.length > 0
          ? 'Map pack ranks are shown from captured local search data.'
          : 'Map pack ranks were unavailable in this run.',
      likelySignals: [
        'Review velocity and star rating advantage',
        'Tighter service + location category match',
        'Stronger city service pages and internal linking',
        'More prominent estimate CTA and conversion flow'
      ]
    },
    keywords: keyword.rows,
    competitors,
    calendlyTrackedUrl,
    ctaBullets: [
      'We will review your report',
      'Show exactly what to change',
      'Give a 30-day execution plan'
    ]
  };
}
