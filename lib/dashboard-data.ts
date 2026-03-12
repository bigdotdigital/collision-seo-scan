import type { ReportPayload } from '@/lib/report-payload';

type ScanLike = {
  scoreTotal: number | null;
  scoreWebsite: number | null;
  scoreLocal: number | null;
};

export function calculateTrends(current: ScanLike, previous: ScanLike) {
  const currentTotal = current.scoreTotal ?? 0;
  const previousTotal = previous.scoreTotal ?? 0;
  const currentWebsite = current.scoreWebsite ?? 0;
  const previousWebsite = previous.scoreWebsite ?? 0;
  const currentLocal = current.scoreLocal ?? 0;
  const previousLocal = previous.scoreLocal ?? 0;

  const scoreDelta = currentTotal - previousTotal;
  const websiteDelta = currentWebsite - previousWebsite;
  const localDelta = currentLocal - previousLocal;

  return {
    overall: {
      value: `${scoreDelta >= 0 ? '+' : ''}${scoreDelta}`,
      type: scoreDelta >= 0 ? 'up' as const : 'down' as const
    },
    website: {
      value: `${websiteDelta >= 0 ? '+' : ''}${websiteDelta}`,
      type: websiteDelta >= 0 ? 'up' as const : 'down' as const
    },
    local: {
      value: `${localDelta >= 0 ? '+' : ''}${localDelta}`,
      type: localDelta >= 0 ? 'up' as const : 'down' as const
    }
  };
}

export function prepareCategoryDistribution(payload: ReportPayload | null) {
  if (!payload?.categoryScores) return [];

  return [
    {
      value: payload.categoryScores.technicalSeo,
      color: 'var(--primary)',
      label: 'Technical SEO'
    },
    {
      value: payload.categoryScores.localSeo,
      color: 'var(--accent-orange)',
      label: 'Local SEO'
    },
    {
      value: payload.categoryScores.collisionAuthority,
      color: 'var(--accent-green)',
      label: 'Authority'
    },
    {
      value: payload.categoryScores.speedPerformance,
      color: 'var(--accent-purple)',
      label: 'Performance'
    }
  ];
}

export function calculateRevenueImpact(
  score: number,
  keywords: Array<{ keyword: string; volume?: number }>
) {
  const estimatedTraffic = keywords.reduce((sum, kw) => {
    const volume = kw.volume || 0;
    const ctr = score >= 80 ? 0.3 : score >= 60 ? 0.15 : 0.05;
    return sum + volume * ctr;
  }, 0);

  const estimatedLeads = estimatedTraffic * 0.08;
  const estimatedRevenue = estimatedLeads * 1200;
  const hasKeywordVolume = keywords.some((kw) => typeof kw.volume === 'number' && kw.volume > 0);

  return {
    traffic: Math.round(estimatedTraffic),
    leads: Math.round(estimatedLeads),
    revenue: Math.round(estimatedRevenue),
    assumptions: {
      ctrModel:
        score >= 80 ? '30% modeled CTR' : score >= 60 ? '15% modeled CTR' : '5% modeled CTR',
      leadRate: '8% assumed lead conversion',
      averageOrderValue: '$1,200 assumed repair value'
    },
    confidence: hasKeywordVolume ? 'modeled' as const : 'unknown' as const
  };
}
