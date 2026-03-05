import type { MoneyKeyword } from '@/lib/types';

export function estimateOpportunity(scoreTotal: number, keywords: MoneyKeyword[]) {
  const averageRepairOrder = Number(process.env.DEFAULT_ARO || 1200);
  const knownVolume = keywords.reduce((sum, item) => sum + (item.volume || 0), 0);
  const modeledDemand = knownVolume > 0 ? knownVolume : 1200;
  const visibilityLeak = Math.max(0.08, (100 - scoreTotal) / 100);
  const missedLeads = Math.round(modeledDemand * visibilityLeak * 0.09);
  const revenueOpportunity = missedLeads * averageRepairOrder;

  return {
    monthlySearchDemand: modeledDemand,
    missedLeads,
    revenueOpportunity,
    averageRepairOrder
  };
}
