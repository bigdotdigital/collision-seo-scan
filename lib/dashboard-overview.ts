import type { ReportPayload } from '@/lib/report-payload';

type BadgeTone = 'live' | 'cached' | 'modeled' | 'fallback' | 'unknown';
type HeaderBadge = {
  label: string;
  tone?: BadgeTone;
  title?: string;
};

type OverviewScan = {
  scoreTotal: number | null;
  shopName?: string | null;
};

type KeywordRow = {
  term: string;
  snapshots: Array<{
    rankPosition: number | null;
  }>;
};

type MoneyKeywordInput = {
  keyword?: string;
  volume?: number | null;
};

export function sourceTone(state: string | null | undefined): BadgeTone {
  if (state === 'live') return 'live';
  if (state === 'cached') return 'cached';
  if (state === 'modeled') return 'modeled';
  if (state === 'fallback') return 'fallback';
  return 'unknown';
}

export function parseMoneyKeywords(rows: MoneyKeywordInput[]) {
  return rows
    .filter((row): row is { keyword: string; volume?: number | null } => typeof row?.keyword === 'string')
    .map((row) => ({ keyword: row.keyword, volume: row.volume ?? undefined }));
}

export function hasKeywordVolume(rows: Array<{ volume?: number }>) {
  return rows.some((row) => typeof row.volume === 'number' && row.volume > 0);
}

export function summarizeRankedKeywords(rows: KeywordRow[]) {
  const ranked = rows
    .map((keyword) => {
      const current = keyword.snapshots[0]?.rankPosition ?? null;
      const previous = keyword.snapshots[1]?.rankPosition ?? null;
      return {
        term: keyword.term,
        current,
        delta: current !== null && previous !== null ? previous - current : null
      };
    })
    .filter((row) => row.current !== null)
    .sort((a, b) => (a.current ?? 999) - (b.current ?? 999));

  const withBaseline = ranked.filter((row) => row.delta !== null);
  const averagePosition =
    ranked.length === 0
      ? null
      : Number((ranked.reduce((sum, row) => sum + (row.current ?? 0), 0) / ranked.length).toFixed(1));
  const averageDelta =
    withBaseline.length === 0
      ? null
      : Number((withBaseline.reduce((sum, row) => sum + (row.delta ?? 0), 0) / withBaseline.length).toFixed(1));

  return {
    ranked,
    barData: ranked.slice(0, 7).map((row) => Math.max(10, 100 - (row.current ?? 100) * 3)),
    averagePosition,
    averageDelta
  };
}

export function buildOverviewBadges(args: {
  hasModeledKeywords: boolean;
  sources?: ReportPayload['sources'] | null;
}): HeaderBadge[] {
  return [
    {
      label: `Keywords ${args.hasModeledKeywords ? 'modeled' : 'unavailable'}`,
      tone: args.hasModeledKeywords ? 'modeled' : 'unknown',
      title: args.hasModeledKeywords
        ? 'Opportunity metrics use keyword-volume inputs from the latest scan payload.'
        : 'No money-keyword volume was captured in the latest scan.'
    },
    {
      label: `Reviews ${args.sources?.reviews || 'unavailable'}`,
      tone: sourceTone(args.sources?.reviews),
      title: 'Google profile and review cards use the latest scan source label.'
    },
    {
      label: `Competitors ${args.sources?.competitors || 'unavailable'}`,
      tone: sourceTone(args.sources?.competitors),
      title: 'Competitor sections only show saved or source-backed competitor data.'
    },
    {
      label: `Map pack ${args.sources?.mapPack || 'unavailable'}`,
      tone: sourceTone(args.sources?.mapPack),
      title: 'Map positioning is only precise when geo-backed source data exists.'
    }
  ];
}

export function buildYourShop(latestScan: OverviewScan | null, payload: ReportPayload | null) {
  return {
    name: payload?.googlePlace?.name || latestScan?.shopName || 'Your Shop',
    score: latestScan?.scoreTotal ?? null,
    hasOemCerts: Boolean(payload?.checks.oemSignals?.length),
    hasOnlineEstimate: Boolean(payload?.checks.onlineEstimateFlow || payload?.checks.estimateCtaDetected),
    reviewCount: payload?.googlePlace?.userRatingCount ?? null,
    reviewRating: payload?.googlePlace?.rating ?? null
  };
}

export function buildOverviewCompetitors(payload: ReportPayload | null) {
  return (payload?.competitorAdvantages || []).slice(0, 4).map((competitor, index) => ({
    name: competitor.name,
    score: null,
    hasOemCerts: competitor.oemSignalCount > 0,
    hasOnlineEstimate: competitor.estimateCta,
    reviewCount:
      index === 0 && typeof payload?.reviewGap?.competitorReviews === 'number'
        ? payload.reviewGap.competitorReviews
        : null,
    reviewRating:
      index === 0 && typeof payload?.reviewGap?.competitorRating === 'number'
        ? payload.reviewGap.competitorRating
        : null
  }));
}

export function buildMapPoints(args: {
  yourShop: ReturnType<typeof buildYourShop>;
  competitors: ReturnType<typeof buildOverviewCompetitors>;
  geographic: boolean;
}) {
  const { yourShop, competitors, geographic } = args;
  return [
    {
      id: 'shop',
      label: yourShop.name,
      detail:
        typeof yourShop.score === 'number'
          ? `SEO score ${yourShop.score}/100${typeof yourShop.reviewRating === 'number' ? ` • ${yourShop.reviewRating.toFixed(1)}★` : ''}`
          : 'Primary shop record',
      x: geographic ? 50 : 28,
      y: geographic ? 50 : Math.max(18, 100 - (yourShop.score || 50)),
      tone: 'shop' as const
    },
    ...competitors.map((competitor, index) => ({
      id: `competitor-${index}`,
      label: competitor.name,
      detail: [
        'Source-backed competitor suggestion',
        competitor.hasOemCerts ? 'Has OEM signals' : 'No OEM signals detected',
        competitor.hasOnlineEstimate ? 'Estimate CTA detected' : 'No estimate CTA detected'
      ].join(' • '),
      x: geographic ? 20 + index * 18 : 54 + index * 10,
      y: geographic ? 22 + index * 14 : 30 + index * 12,
      tone: 'competitor' as const
    }))
  ];
}

export function buildVisibilitySegments(
  categories: Array<{ value: number; label: string }>
) {
  return [
    { color: 'var(--accent-blue)', value: categories[0]?.value ?? 0, label: categories[0]?.label ?? 'Technical SEO' },
    { color: 'var(--accent-green)', value: categories[1]?.value ?? 0, label: categories[1]?.label ?? 'Local SEO' },
    { color: 'var(--accent-orange)', value: categories[2]?.value ?? 0, label: categories[2]?.label ?? 'Authority' },
    { color: 'var(--accent-purple)', value: categories[3]?.value ?? 0, label: categories[3]?.label ?? 'Performance' },
    { color: 'var(--accent-pink)', value: categories[4]?.value ?? 0, label: categories[4]?.label ?? 'Coverage' }
  ];
}
