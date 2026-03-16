import type { MoneyKeyword } from '@/lib/types';

export function estimateOpportunity(
  scoreTotal: number,
  keywords: MoneyKeyword[],
  options?: { demandMultiplier?: number; demandLabel?: string }
) {
  const averageRepairOrder = Number(process.env.DEFAULT_ARO || 1200);
  const knownVolume = keywords.reduce((sum, item) => sum + (item.volume || 0), 0);
  const modeledDemand = knownVolume > 0 ? knownVolume : 1200;
  const demandMultiplier = Math.max(0.85, Math.min(options?.demandMultiplier || 1, 1.5));
  const visibilityLeak = Math.max(0.08, (100 - scoreTotal) / 100);
  const adjustedDemand = Math.round(modeledDemand * demandMultiplier);
  const missedLeads = Math.round(adjustedDemand * visibilityLeak * 0.09);
  const revenueOpportunity = missedLeads * averageRepairOrder;

  return {
    monthlySearchDemand: adjustedDemand,
    baselineMonthlySearchDemand: modeledDemand,
    missedLeads,
    revenueOpportunity,
    averageRepairOrder,
    demandMultiplier,
    demandLabel: options?.demandLabel || null
  };
}
