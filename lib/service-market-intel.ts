import { getVerticalConfig, type VerticalSlug } from '@/lib/verticals';

export type ServiceMarketIntelCard = {
  title: string;
  insight: string;
  action: string;
  sourceLabel: string;
  sourceUrl: string;
};

export function getServiceMarketIntel(vertical?: string | null): ServiceMarketIntelCard[] {
  const cfg = getVerticalConfig(vertical);
  return cfg.industryInsights.map((item) => ({
    title: item.title,
    insight: item.detail,
    action: item.implication,
    sourceLabel: item.sourceLabel,
    sourceUrl: item.sourceUrl
  }));
}

export function getVerticalThemeTone(vertical?: string | null): {
  eyebrow: string;
  summary: string;
} {
  const cfg = getVerticalConfig(vertical);
  const summaries: Record<VerticalSlug, string> = {
    collision: 'Trust, estimate flow, and local authority usually matter more than broad generic content.',
    hvac: 'Emergency clarity, maintenance visibility, and replacement confidence drive the strongest HVAC outcomes.',
    roofing: 'Storm urgency, inspection-first conversion, and claim confidence shape the strongest roofing outcomes.',
    plumbing: 'Emergency response, specialty coverage, and phone-first trust signals shape the strongest plumbing outcomes.'
  };

  return {
    eyebrow: `${cfg.label} Market Intel`,
    summary: summaries[cfg.slug]
  };
}
