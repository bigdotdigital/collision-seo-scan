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

export type DashboardProfile = {
  id: 'conversion' | 'maps' | 'authority' | 'storm' | 'balanced';
  label: string;
  summary: string;
  focusLabel: string;
  moduleTitles: string[];
  nextPriority: string;
};

export function buildDashboardProfile(input: DashboardProfileInput): DashboardProfile {
  if (input.highHailPressure && input.scoreIntent < 80) {
    return {
      id: 'storm',
      label: 'Storm Capture Profile',
      summary: 'This market is storm-sensitive, so demand capture pages and estimate conversion matter more than generic SEO breadth.',
      focusLabel: 'Storm demand and fast estimate capture',
      moduleTitles: ['Local Demand Context', 'Recommended Service Page Opportunities', '30-Day Repair Plan'],
      nextPriority: 'Build hail / PDR / storm-intent pages and tighten estimate flow.'
    };
  }

  if ((!input.hasEstimateFlow || input.scoreWebsite < 75) && input.hasWebsite) {
    return {
      id: 'conversion',
      label: 'Conversion Lift Profile',
      summary: 'The website exists, but conversion mechanics are still leaving estimate demand on the table.',
      focusLabel: 'Estimate flow, CTA strength, and page conversion',
      moduleTitles: ['Collision SEO Architecture', 'Revenue Leak Indicator', '30-Day Repair Plan'],
      nextPriority: 'Fix estimate flow, CTA visibility, and trust proof before chasing more traffic.'
    };
  }

  if (!input.hasGoogleProfile || input.scoreLocal < 80 || input.reviewCount < 75) {
    return {
      id: 'maps',
      label: 'Maps Authority Profile',
      summary: 'Local pack strength and review trust are the main leverage points for this workspace right now.',
      focusLabel: 'GBP, reviews, and local trust',
      moduleTitles: ['Maps Authority', 'Local Demand Context', 'Competitor Gap Snapshot'],
      nextPriority: 'Strengthen Google profile visibility and close the review trust gap.'
    };
  }

  if (!input.hasOemSignals || input.scoreIntent >= input.scoreWebsite) {
    return {
      id: 'authority',
      label: 'Authority Expansion Profile',
      summary: 'The base visibility is decent, but authority and specialty proof can separate this shop faster than generic content.',
      focusLabel: 'OEM, trust, and specialty authority',
      moduleTitles: ['Collision SEO Architecture', 'Recommended Service Page Opportunities', 'Competitor Gap Snapshot'],
      nextPriority: 'Add certification, specialty repair, and trust proof where competitors are already stronger.'
    };
  }

  return {
    id: 'balanced',
    label: 'Balanced Growth Profile',
    summary: 'This workspace is relatively healthy, so the best gains come from steady weekly monitoring and selective gap-closing.',
    focusLabel: 'Maintain momentum and compound the advantage',
    moduleTitles: ['Competitor Gap Snapshot', 'Local Demand Context', '30-Day Repair Plan'],
    nextPriority: 'Keep the weekly cadence, then attack the next highest-leverage gap.'
  };
}
