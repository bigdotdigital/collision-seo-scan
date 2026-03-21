type DashboardProfileInput = {
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

const DASHBOARD_PROFILE_PRESETS: Record<DashboardProfileId, Omit<DashboardProfile, 'id'>> = {
  storm: {
    label: 'Storm Capture Profile',
    summary: 'This market is storm-sensitive, so demand capture pages and estimate conversion matter more than generic SEO breadth.',
    focusLabel: 'Storm demand and fast estimate capture',
    ownerPromise: 'Turn weather-driven search demand into booked repair work before nearby shops soak it up.',
    whenToUse: 'Best for hail-heavy markets, PDR shops, and repair businesses that need storm pages and fast estimate flow.',
    moduleIds: ['demand', 'servicePages', 'repairPlan'],
    moduleTitles: ['Local Demand Context', 'Recommended Service Page Opportunities', '30-Day Repair Plan'],
    nextPriority: 'Build hail / PDR / storm-intent pages and tighten estimate flow.'
  },
  conversion: {
    label: 'Conversion Lift Profile',
    summary: 'The website exists, but conversion mechanics are still leaving estimate demand on the table.',
    focusLabel: 'Estimate flow, CTA strength, and page conversion',
    ownerPromise: 'Get more estimate requests from the traffic you already worked to earn.',
    whenToUse: 'Best for shops with an okay site that still feels weak on CTAs, trust proof, or conversion flow.',
    moduleIds: ['architecture', 'revenueLeak', 'repairPlan'],
    moduleTitles: ['Collision SEO Architecture', 'Revenue Leak Indicator', '30-Day Repair Plan'],
    nextPriority: 'Fix estimate flow, CTA visibility, and trust proof before chasing more traffic.'
  },
  maps: {
    label: 'Maps Authority Profile',
    summary: 'Local pack strength and review trust are the main leverage points for this workspace right now.',
    focusLabel: 'GBP, reviews, and local trust',
    ownerPromise: 'Show up stronger in nearby searches where real local repair decisions are being made.',
    whenToUse: 'Best for shops that need more reviews, stronger Google profile trust, or better map-pack visibility.',
    moduleIds: ['maps', 'demand', 'competitorGap'],
    moduleTitles: ['Maps Authority', 'Local Demand Context', 'Competitor Gap Snapshot'],
    nextPriority: 'Strengthen Google profile visibility and close the review trust gap.'
  },
  authority: {
    label: 'Authority Expansion Profile',
    summary: 'The base visibility is decent, but authority and specialty proof can separate this shop faster than generic content.',
    focusLabel: 'OEM, trust, and specialty authority',
    ownerPromise: 'Look like the higher-trust specialty shop instead of another generic body shop result.',
    whenToUse: 'Best for OEM-certified, ADAS-capable, EV-ready, or specialty repair shops that need stronger authority signaling.',
    moduleIds: ['architecture', 'servicePages', 'competitorGap'],
    moduleTitles: ['Collision SEO Architecture', 'Recommended Service Page Opportunities', 'Competitor Gap Snapshot'],
    nextPriority: 'Add certification, specialty repair, and trust proof where competitors are already stronger.'
  },
  balanced: {
    label: 'Balanced Growth Profile',
    summary: 'This workspace is relatively healthy, so the best gains come from steady weekly monitoring and selective gap-closing.',
    focusLabel: 'Maintain momentum and compound the advantage',
    ownerPromise: 'Protect the gains you already have and keep compounding them without overreacting every week.',
    whenToUse: 'Best for shops with a stable foundation that need disciplined weekly improvement, not a full rebuild.',
    moduleIds: ['competitorGap', 'demand', 'repairPlan'],
    moduleTitles: ['Competitor Gap Snapshot', 'Local Demand Context', '30-Day Repair Plan'],
    nextPriority: 'Keep the weekly cadence, then attack the next highest-leverage gap.'
  }
};

function dashboardProfile(id: DashboardProfileId): DashboardProfile {
  return {
    id,
    ...DASHBOARD_PROFILE_PRESETS[id]
  };
}

export function isDashboardProfileId(value: string | undefined | null): value is DashboardProfileId {
  return Boolean(value && value in DASHBOARD_PROFILE_PRESETS);
}

export function getDashboardProfileById(id: DashboardProfileId) {
  return dashboardProfile(id);
}

export function buildDashboardProfile(input: DashboardProfileInput): DashboardProfile {
  if (input.highHailPressure && input.scoreIntent < 80) {
    return dashboardProfile('storm');
  }

  if ((!input.hasEstimateFlow || input.scoreWebsite < 75) && input.hasWebsite) {
    return dashboardProfile('conversion');
  }

  if (!input.hasGoogleProfile || input.scoreLocal < 80 || input.reviewCount < 75) {
    return dashboardProfile('maps');
  }

  if (!input.hasOemSignals || input.scoreIntent >= input.scoreWebsite) {
    return dashboardProfile('authority');
  }

  return dashboardProfile('balanced');
}
