import { getVerticalConfig, type VerticalSlug } from '@/lib/verticals';

type DashboardProfileInput = {
  vertical?: string | null;
  hasWebsite: boolean;
  hasGoogleProfile: boolean;
  reviewCount: number;
  scoreTotal: number;
  scoreWebsite: number;
  scoreLocal: number;
  scoreIntent: number;
  hasEstimateFlow: boolean;
  hasOemSignals: boolean;
  highHailPressure: boolean;
};

export type DashboardModuleId =
  | 'architecture'
  | 'maps'
  | 'demand'
  | 'competitorGap'
  | 'servicePages'
  | 'revenueLeak'
  | 'repairPlan';

export type DashboardProfileId = 'conversion' | 'maps' | 'authority' | 'storm' | 'balanced';

export type DashboardProfile = {
  id: DashboardProfileId;
  label: string;
  summary: string;
  focusLabel: string;
  ownerPromise: string;
  whenToUse: string;
  moduleIds: DashboardModuleId[];
  moduleTitles: string[];
  nextPriority: string;
};

function conversionGoalPhrase(vertical: VerticalSlug) {
  switch (vertical) {
    case 'hvac':
      return 'booked service calls';
    case 'roofing':
      return 'inspection requests';
    case 'plumbing':
      return 'booked jobs';
    default:
      return 'estimate requests';
  }
}

function authorityFocusLabel(vertical: VerticalSlug) {
  switch (vertical) {
    case 'hvac':
      return 'Service trust, specialties, and replacement authority';
    case 'roofing':
      return 'Storm proof, trust, and inspection authority';
    case 'plumbing':
      return 'Emergency trust, specialties, and local authority';
    default:
      return 'OEM, trust, and specialty authority';
  }
}

function authorityWhenToUse(vertical: VerticalSlug) {
  switch (vertical) {
    case 'hvac':
      return 'Best for HVAC companies that need stronger financing, maintenance, emergency, or equipment-specialty visibility.';
    case 'roofing':
      return 'Best for roofers that need stronger storm, warranty, inspection, or insurance-help authority signals.';
    case 'plumbing':
      return 'Best for plumbers that need stronger emergency, licensing, specialty-service, or homeowner-trust signaling.';
    default:
      return 'Best for OEM-certified, ADAS-capable, EV-ready, or specialty repair shops that need stronger authority signaling.';
  }
}

function stormPriority(vertical: VerticalSlug) {
  switch (vertical) {
    case 'roofing':
      return 'Build storm, hail, inspection, and insurance-intent pages and tighten inspection flow.';
    case 'hvac':
      return 'Build emergency, seasonal, and replacement-intent pages and tighten booking flow.';
    case 'plumbing':
      return 'Build emergency, drain, leak, and water-heater intent pages and tighten call flow.';
    default:
      return 'Build hail / PDR / storm-intent pages and tighten estimate flow.';
  }
}

function buildDashboardProfilePreset(id: DashboardProfileId, vertical?: string | null): DashboardProfile {
  const cfg = getVerticalConfig(vertical);
  const goalLabel = conversionGoalPhrase(cfg.slug);
  const architectureTitle = `${cfg.label} SEO Architecture`;
  const servicePagesTitle = `${cfg.label} Service Page Opportunities`;
  const demandTitle = cfg.slug === 'collision' ? 'Local Demand Context' : `${cfg.label} Market Context`;
  const authoritySummary =
    cfg.slug === 'collision'
      ? 'The base visibility is decent, but authority and specialty proof can separate this shop faster than generic content.'
      : `The base visibility is decent, but trust, specialization, and ${cfg.label.toLowerCase()} proof can separate this business faster than generic content.`;

  const presets: Record<DashboardProfileId, Omit<DashboardProfile, 'id'>> = {
    storm: {
      label: cfg.slug === 'collision' ? 'Storm Capture Profile' : 'Demand Capture Profile',
      summary:
        cfg.slug === 'collision'
          ? 'This market is storm-sensitive, so demand capture pages and estimate conversion matter more than generic SEO breadth.'
          : `This market rewards urgent service intent, so fast-response pages and ${goalLabel} matter more than generic SEO breadth.`,
      focusLabel:
        cfg.slug === 'collision'
          ? 'Storm demand and fast estimate capture'
          : `Demand spikes and fast ${cfg.primaryCtaLabel.toLowerCase()} capture`,
      ownerPromise:
        cfg.slug === 'collision'
          ? 'Turn weather-driven search demand into booked repair work before nearby shops soak it up.'
          : `Turn urgent local demand into ${goalLabel} before nearby competitors soak it up.`,
      whenToUse:
        cfg.slug === 'collision'
          ? 'Best for hail-heavy markets, PDR shops, and repair businesses that need storm pages and fast estimate flow.'
          : `Best for businesses that need stronger urgent-intent pages, seasonal demand capture, and faster ${cfg.primaryCtaLabel.toLowerCase()} flow.`,
      moduleIds: ['demand', 'servicePages', 'repairPlan'],
      moduleTitles: [demandTitle, servicePagesTitle, '30-Day Repair Plan'],
      nextPriority: stormPriority(cfg.slug)
    },
    conversion: {
      label: 'Conversion Lift Profile',
      summary: `The site exists, but conversion mechanics are still leaving ${goalLabel} on the table.`,
      focusLabel: `${cfg.primaryCtaLabel}, CTA strength, and page conversion`,
      ownerPromise: `Get more ${goalLabel} from the traffic you already worked to earn.`,
      whenToUse: `Best for businesses with a decent site that still feels weak on CTAs, trust proof, or conversion flow.`,
      moduleIds: ['architecture', 'revenueLeak', 'repairPlan'],
      moduleTitles: [architectureTitle, 'Revenue Leak Indicator', '30-Day Repair Plan'],
      nextPriority: `Fix ${cfg.primaryCtaLabel.toLowerCase()} flow, CTA visibility, and trust proof before chasing more traffic.`
    },
    maps: {
      label: 'Maps Authority Profile',
      summary: 'Local pack strength and review trust are the main leverage points for this workspace right now.',
      focusLabel: 'Google profile, reviews, and local trust',
      ownerPromise: `Show up stronger in nearby searches where real ${cfg.label.toLowerCase()} buying decisions are being made.`,
      whenToUse: 'Best for businesses that need more reviews, stronger Google profile trust, or better map-pack visibility.',
      moduleIds: ['maps', 'demand', 'competitorGap'],
      moduleTitles: ['Maps Authority', demandTitle, 'Competitor Gap Snapshot'],
      nextPriority: 'Strengthen Google profile visibility and close the review trust gap.'
    },
    authority: {
      label: 'Authority Expansion Profile',
      summary: authoritySummary,
      focusLabel: authorityFocusLabel(cfg.slug),
      ownerPromise:
        cfg.slug === 'collision'
          ? 'Look like the higher-trust specialty shop instead of another generic body shop result.'
          : `Look like the higher-trust ${cfg.label.toLowerCase()} company instead of another generic local result.`,
      whenToUse: authorityWhenToUse(cfg.slug),
      moduleIds: ['architecture', 'servicePages', 'competitorGap'],
      moduleTitles: [architectureTitle, servicePagesTitle, 'Competitor Gap Snapshot'],
      nextPriority:
        cfg.slug === 'collision'
          ? 'Add certification, specialty repair, and trust proof where competitors are already stronger.'
          : `Add specialty-service proof, trust signals, and credibility where competitors are already stronger.`
    },
    balanced: {
      label: 'Balanced Growth Profile',
      summary: 'This workspace is relatively healthy, so the best gains come from steady weekly monitoring and selective gap-closing.',
      focusLabel: 'Maintain momentum and compound the advantage',
      ownerPromise: 'Protect the gains you already have and keep compounding them without overreacting every week.',
      whenToUse: 'Best for businesses with a stable foundation that need disciplined weekly improvement, not a full rebuild.',
      moduleIds: ['competitorGap', 'demand', 'repairPlan'],
      moduleTitles: ['Competitor Gap Snapshot', demandTitle, '30-Day Repair Plan'],
      nextPriority: 'Keep the weekly cadence, then attack the next highest-leverage gap.'
    }
  };

  return {
    id,
    ...presets[id]
  };
}

export function isDashboardProfileId(value: string | undefined | null): value is DashboardProfileId {
  return Boolean(value && ['conversion', 'maps', 'authority', 'storm', 'balanced'].includes(value));
}

export function getDashboardProfileById(id: DashboardProfileId, vertical?: string | null) {
  return buildDashboardProfilePreset(id, vertical);
}

export function buildDashboardProfile(input: DashboardProfileInput): DashboardProfile {
  if (input.highHailPressure && input.scoreIntent < 80) {
    return buildDashboardProfilePreset('storm', input.vertical);
  }

  if ((!input.hasEstimateFlow || input.scoreWebsite < 75) && input.hasWebsite) {
    return buildDashboardProfilePreset('conversion', input.vertical);
  }

  if (!input.hasGoogleProfile || input.scoreLocal < 80 || input.reviewCount < 75) {
    return buildDashboardProfilePreset('maps', input.vertical);
  }

  if (!input.hasOemSignals || input.scoreIntent >= input.scoreWebsite) {
    return buildDashboardProfilePreset('authority', input.vertical);
  }

  return buildDashboardProfilePreset('balanced', input.vertical);
}
