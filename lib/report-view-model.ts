import type { Competitor, Issue, MoneyKeyword, ThirtyDayPlanItem } from '@/lib/types';
import { estimateOpportunity } from '@/lib/business-impact';
import { getVerticalConfig } from '@/lib/verticals';

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
  vertical?: string | null;
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
  demandContext?: {
    city: string;
    crashPressure: number;
    trafficExposure: number;
    hailPressure: number;
    demandPressure: number;
    urgencyLabel: 'Calm' | 'Active' | 'High Pressure';
    summary: string;
  } | null;
}

type ReviewGap = {
  shopRating: number | null;
  shopReviews: number | null;
  competitorRating: number | null;
  competitorReviews: number | null;
  reviewGap: number | null;
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
  marketDemand: {
    city: string;
    demandPressure: number;
    crashPressure: number;
    trafficExposure: number;
    hailPressure: number;
    urgencyLabel: 'Calm' | 'Active' | 'High Pressure';
    summary: string;
  } | null;
  reviewGap: ReviewGap | null;
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

function mapQueryTemplates(vertical?: string | null) {
  const cfg = getVerticalConfig(vertical);
  if (cfg.slug === 'hvac') {
    return ['hvac repair {city}', 'air conditioning repair near me', 'furnace repair {city}', 'emergency hvac service {city}'];
  }
  if (cfg.slug === 'plumbing') {
    return ['plumber {city}', 'emergency plumber near me', 'drain cleaning {city}', 'water heater repair {city}'];
  }
  if (cfg.slug === 'roofing') {
    return ['roof repair {city}', 'roofing contractor near me', 'roof inspection {city}', 'storm damage roof repair {city}'];
  }
  return ['collision repair {city}', 'auto body shop near me', 'bumper repair {city}', 'hail damage repair {city}'];
}

function whyWinningOptions(vertical?: string | null) {
  const cfg = getVerticalConfig(vertical);
  if (cfg.slug === 'hvac') {
    return [
      'Emergency-service clarity and stronger local trust signals.',
      'Better service-page depth for repair, maintenance, and replacement intent.',
      'Stronger book-service CTA visibility on mobile and desktop.',
      'More complete financing, maintenance-plan, and equipment-specialty coverage.'
    ];
  }
  if (cfg.slug === 'plumbing') {
    return [
      'Stronger emergency-call language and local trust signals.',
      'Better specialty coverage for drains, leaks, water heaters, and sewer work.',
      'Stronger phone-first CTA visibility on mobile and desktop.',
      'More complete licensing, review proof, and response-time positioning.'
    ];
  }
  if (cfg.slug === 'roofing') {
    return [
      'Stronger inspection and storm-response trust signals.',
      'Better page depth for repair, replacement, and storm-damage intent.',
      'Stronger inspection CTA visibility on mobile and desktop.',
      'More complete insurance-help, warranty, and financing coverage.'
    ];
  }
  return [
    'Higher review velocity and stronger local trust signals.',
    'Better category match and location-page depth.',
    'Stronger estimate CTA visibility on mobile and desktop.',
    'More complete service coverage for OEM + insurance intent.'
  ];
}

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
  if (/(estimate|certified|collision repair|emergency|inspection|repair|replacement|plumber|hvac)/i.test(k)) return 'High';
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

function competitorViewModel(city: string, items: Competitor[], reviews: ReviewGap | null, vertical?: string | null): CompetitorView[] {
  const names = items.map((c) => c.name).slice(0, 3);
  if (names.length === 0) return [];
  const whyWinning = whyWinningOptions(vertical);

  return names.map((name, idx) => ({
    name,
    whyWinning: whyWinning[idx % whyWinning.length],
    rating: idx === 0 ? (reviews?.competitorRating ?? undefined) : undefined,
    reviews: idx === 0 ? (reviews?.competitorReviews ?? undefined) : undefined
  }));
}

function reviewGapView(data: ReportData): ReviewGap | null {
  const liveShopRating = data.rawChecks?.reviews?.rating;
  const liveShopReviews = data.rawChecks?.reviews?.reviews;
  const liveCompetitorRating = data.rawChecks?.competitorReviews?.rating;
  const liveCompetitorReviews = data.rawChecks?.competitorReviews?.reviews;

  const hasLive =
    typeof liveShopRating === 'number' &&
    typeof liveShopReviews === 'number' &&
    typeof liveCompetitorRating === 'number' &&
    typeof liveCompetitorReviews === 'number';

  if (!hasLive) return null;

  const shopRating = liveShopRating;
  const shopReviews = liveShopReviews;
  const competitorRating = liveCompetitorRating;
  const competitorReviews = liveCompetitorReviews;
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

function mapPackView(city: string, shopName: string, competitors: CompetitorView[], vertical?: string | null): MapPackQuery[] {
  if (competitors.length === 0) return [];
  const c = city.toLowerCase();
  const rank1 = competitors[0]?.name || 'n/a';
  const rank2 = competitors[1]?.name || 'n/a';
  const rank3 = competitors[2]?.name || 'n/a';

  return mapQueryTemplates(vertical).slice(0, 4).map((template, idx) => ({
    query: template.replace('{city}', c),
    rank1,
    rank2,
    rank3,
    yourRank: `${shopName} (position unavailable)`
  }));
}

export function buildReportViewModel(reportData: ReportData): ReportViewModel {
  const cfg = getVerticalConfig(reportData.vertical);
  const reviewGap = reviewGapView(reportData);
  const competitors = competitorViewModel(reportData.city, reportData.competitors, reviewGap, reportData.vertical);
  const mapQueries = mapPackView(reportData.city, reportData.shopName, competitors, reportData.vertical);
  const keyword = keywordViewModel(reportData.moneyKeywords);
  const demandMultiplier = reportData.demandContext ? 0.85 + reportData.demandContext.demandPressure / 200 : 1;

  const opportunity = estimateOpportunity(reportData.scoreTotal, reportData.moneyKeywords, {
    demandMultiplier,
    demandLabel: reportData.demandContext?.urgencyLabel || undefined
  });
  const calendlyTrackedUrl = withCalendlyParams(reportData.calendlyBase, {
    scanId: reportData.scanId,
    shop: reportData.shopName,
    city: reportData.city
  });

  const estimatedAny = !reviewGap || reviewGap.isEstimated || keyword.estimatedAny;

  return {
    dataStatusBanner: estimatedAny
      ? 'Some metrics are estimated until competitor + keyword sources are connected.'
      : null,
    opportunity,
    marketDemand: reportData.demandContext
      ? {
          city: reportData.demandContext.city,
          demandPressure: reportData.demandContext.demandPressure,
          crashPressure: reportData.demandContext.crashPressure,
          trafficExposure: reportData.demandContext.trafficExposure,
          hailPressure: reportData.demandContext.hailPressure,
          urgencyLabel: reportData.demandContext.urgencyLabel,
          summary: reportData.demandContext.summary
        }
      : null,
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
        `More prominent ${cfg.primaryCtaLabel.toLowerCase()} CTA and conversion flow`
      ]
    },
    keywords: keyword.rows,
    competitors,
    calendlyTrackedUrl,
    ctaBullets: [
      'We review the report before the call',
      'You get a clear fix order, not generic SEO fluff',
      `We can handle the dashboard, redesign, or SEO implementation that improves ${cfg.conversionGoalLabel}`
    ]
  };
}
