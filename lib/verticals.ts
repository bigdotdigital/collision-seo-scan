type IndustryInsight = {
  title: string;
  detail: string;
  implication: string;
  sourceLabel: string;
  sourceUrl: string;
};

export type VerticalSlug = 'collision' | 'hvac' | 'roofing' | 'plumbing';

type VerticalConfig = {
  slug: 'collision' | 'hvac' | 'roofing' | 'plumbing';
  label: string;
  title: string;
  subtitle: string;
  heroBuiltForLabel: string;
  scannerTrustStep: string;
  scannerPlanStep: string;
  primaryCtaLabel: string;
  conversionGoalLabel: string;
  authorityLabel: string;
  authorityDescription: string;
  trustSignalsTitle: string;
  trustSignalsEmptyText: string;
  mapRankingsTitle: string;
  benchmarkTitle: string;
  benchmarkDescription: string;
  benchmarkUnavailableDescription: string;
  competitorTitle: string;
  competitorDescription: string;
  contentCoverageDescription: string;
  localDescription: string;
  visibilityHealthDescription: string;
  intentDescription: string;
  reportHeroTitle: string;
  reportHeroCopy: string;
  strategicFocus: Array<{
    label: string;
    title: string;
    detail: string;
  }>;
  industryInsights: IndustryInsight[];
  weeklyClarityCopy: string;
  competitorWatchCopy: string;
  tailoredSetupCopy: string;
};

export const VERTICALS: Record<VerticalSlug, VerticalConfig> = {
  collision: {
    slug: 'collision',
    label: 'Collision Repair',
    title: 'Instant Local SEO report for collision repair shops.',
    subtitle:
      'Enter your shop info and get a scored audit with top leaks, money keywords, competitor snapshot, and a 30-day plan.',
    heroBuiltForLabel: 'Built for collision shops',
    scannerTrustStep: 'Detecting trust signals and certifications',
    scannerPlanStep: 'Building repair plan',
    primaryCtaLabel: 'Free Estimate',
    conversionGoalLabel: 'estimate requests',
    authorityLabel: 'Collision Authority',
    authorityDescription:
      'Collision Authority measures trust signals specific to body shops, such as certifications, repair specialties, reviews, and credibility markers.',
    trustSignalsTitle: 'Trust Signals Shoppers Look For',
    trustSignalsEmptyText: 'No certification/capability signals detected.',
    mapRankingsTitle: 'Map Rankings for Collision Searches',
    benchmarkTitle: 'National Winners Playbook',
    benchmarkDescription:
      'Comparison against top national collision shop patterns to show what drives more estimate requests.',
    benchmarkUnavailableDescription:
      'A national pattern benchmark is not available for this industry in the current beta.',
    competitorTitle: 'How Competitors Are Winning More Calls',
    competitorDescription:
      'Lightweight comparison of top competitors vs your current signal coverage.',
    contentCoverageDescription:
      'Content Coverage measures whether the site has enough service and specialty pages to match real collision-repair searches.',
    localDescription:
      'Local SEO checks whether the site and business profile send strong signals for nearby collision-related searches.',
    visibilityHealthDescription:
      'Your overall visibility health combines website basics, local presence, collision-specific trust signals, speed, and conversion readiness into one headline score.',
    intentDescription:
      'Intent measures whether the pages match what collision shoppers are actually searching for, such as repair services, OEM terms, estimate intent, and local modifiers.',
    reportHeroTitle: 'Collision Visibility Analysis',
    reportHeroCopy:
      'Operator-grade view of what is helping, what is suppressing estimate demand, and what to fix first in a competitive body-shop market.',
    strategicFocus: [
      {
        label: 'Priority Lens',
        title: 'Estimate flow and trust proof',
        detail: 'In collision, a buried estimate path and weak trust proof usually cost more than a lack of generic content.'
      },
      {
        label: 'Market Pressure',
        title: 'Reviews, maps, and specialty signals',
        detail: 'Shops win faster when they combine local trust with visible specialties like hail, OEM, and advanced repair.'
      },
      {
        label: 'Execution Bias',
        title: 'Service pages before broad blogging',
        detail: 'Money pages for repair types, insurance help, and estimate intent usually outrank broad educational content.'
      }
    ],
    weeklyClarityCopy:
      'Track rankings, trust signals, service-page gaps, and the issues actually affecting estimate demand.',
    competitorWatchCopy:
      'We surface service coverage gaps, local trust differences, and what stronger shops are doing that you are not.',
    tailoredSetupCopy:
      'Start with the free scan, then we can tune the dashboard around hail, OEM, maps, reviews, conversion, or service-area growth.',
    industryInsights: [
      {
        title: 'Estimate path visibility still separates the field',
        detail:
          'Our Denver collision dataset still shows a meaningful gap between shops with a visible estimate path and those without one.',
        implication:
          'If estimate CTAs, photo estimates, or insurance-help flows are buried, that is usually a faster win than publishing more generic content.',
        sourceLabel: 'Internal collision dataset',
        sourceUrl: 'https://shopseoscan.com/collision'
      },
      {
        title: 'OEM and advanced repair proof still matters',
        detail:
          'Collision shoppers and insurers respond to visible certifications, ADAS mentions, and specialty repair proof.',
        implication:
          'Certification pages, capability blocks, and trust badges are not fluff in this vertical. They change both search relevance and conversion confidence.',
        sourceLabel: 'Shop SEO Scan market data',
        sourceUrl: 'https://shopseoscan.com/collision'
      },
      {
        title: 'Hail and insurance intent create real local spikes',
        detail:
          'Storm-driven markets create periods where hail pages, insurance guidance, and fast-estimate flows outperform generic service copy.',
        implication:
          'When demand spikes, trust and conversion readiness often matter more than broad content volume.',
        sourceLabel: 'IBHS hail guidance',
        sourceUrl: 'https://ibhs.org/guidance/hail/'
      }
    ]
  },
  hvac: {
    slug: 'hvac',
    label: 'HVAC',
    title: 'Instant Local SEO report for HVAC companies.',
    subtitle:
      'See where local visibility is leaking, what nearby HVAC competitors do better, and what to fix first in your city.',
    heroBuiltForLabel: 'Built for HVAC companies',
    scannerTrustStep: 'Detecting trust signals, maintenance offers, and financing',
    scannerPlanStep: 'Building service growth plan',
    primaryCtaLabel: 'Book Service',
    conversionGoalLabel: 'service calls',
    authorityLabel: 'Service Trust',
    authorityDescription:
      'Service Trust measures HVAC-specific proof like emergency-service visibility, maintenance-plan positioning, financing, licensing, and equipment specialty coverage.',
    trustSignalsTitle: 'Trust Signals Homeowners Look For',
    trustSignalsEmptyText: 'No strong HVAC trust or specialty signals detected.',
    mapRankingsTitle: 'Map Rankings for HVAC Searches',
    benchmarkTitle: 'Winning HVAC Patterns',
    benchmarkDescription:
      'Comparison against field-tested HVAC trust and conversion patterns to show what drives more booked calls.',
    benchmarkUnavailableDescription:
      'A national benchmark crawler is not live for HVAC yet, so we are using the report’s own trust and content signals instead.',
    competitorTitle: 'How Other HVAC Companies Win the Call First',
    competitorDescription:
      'We look for service availability, maintenance-plan positioning, trust proof, and local coverage that can make a homeowner choose another company first.',
    contentCoverageDescription:
      'Content Coverage measures whether the site has enough repair, replacement, maintenance, and equipment-specific pages to match real HVAC searches.',
    localDescription:
      'Local SEO checks whether the site and business profile send strong signals for nearby heating and cooling searches.',
    visibilityHealthDescription:
      'Your visibility health combines website basics, local presence, HVAC trust signals, speed, and conversion readiness into one headline score.',
    intentDescription:
      'Intent measures whether the pages match what HVAC customers are actually searching for, such as AC repair, furnace repair, maintenance plans, emergency service, and replacement quotes.',
    reportHeroTitle: 'HVAC Visibility Analysis',
    reportHeroCopy:
      'Operator-grade view of what is helping, what is suppressing booked service calls, and what to fix first in a seasonal, urgent-intent market.',
    strategicFocus: [
      {
        label: 'Priority Lens',
        title: 'Emergency clarity and call-readiness',
        detail: 'When systems fail, buyers move fast. Emergency language and frictionless booking often matter as much as rankings.'
      },
      {
        label: 'Market Pressure',
        title: 'Maintenance and replacement intent',
        detail: 'Tune-ups, maintenance agreements, and replacement pages create both recurring demand and higher-ticket opportunities.'
      },
      {
        label: 'Execution Bias',
        title: 'Financing and specialization visibility',
        detail: 'Heat pumps, indoor air quality, and financing guidance often separate stronger HVAC sites from generic contractor sites.'
      }
    ],
    weeklyClarityCopy:
      'Track service-page gaps, call-readiness, maintenance-plan visibility, and the issues affecting HVAC lead flow week to week.',
    competitorWatchCopy:
      'We surface emergency-service positioning, financing visibility, and what stronger HVAC companies are doing that you are not.',
    tailoredSetupCopy:
      'We can tune the dashboard around emergency calls, maintenance memberships, financing, heat pumps, indoor air quality, or service-area growth.',
    industryInsights: [
      {
        title: 'Seasonal tune-ups create recurring-intent demand',
        detail:
          'ENERGY STAR recommends annual pre-season HVAC checkups in spring and fall, which makes maintenance and tune-up visibility more commercially important than generic company copy.',
        implication:
          'Maintenance-plan and seasonal-service pages are worth real visibility and conversion attention because they create both recurring revenue and search intent.',
        sourceLabel: 'ENERGY STAR maintenance checklist',
        sourceUrl: 'https://www.energystar.gov/saveathome/heating-cooling/maintenance-checklist'
      },
      {
        title: 'Emergency service clarity is a conversion lever',
        detail:
          'In HVAC, buyers often arrive under time pressure during temperature spikes or equipment failure, so emergency-service positioning behaves like a trust signal.',
        implication:
          'If 24/7, same-day, or rapid-response language is weak, the site often loses conversions even before rankings are the main problem.',
        sourceLabel: 'Field inference from HVAC service intent',
        sourceUrl: 'https://www.energystar.gov/saveathome/heating-cooling/maintenance-checklist'
      },
      {
        title: 'Financing and replacement guidance matter for high-ticket jobs',
        detail:
          'Replacement decisions are larger-ticket, comparison-heavy purchases. Sites that explain financing and replacement paths reduce friction and increase lead quality.',
        implication:
          'Financing visibility and clear replacement pages often deserve priority over generic blog volume.',
        sourceLabel: 'Shop SEO Scan service-market pattern',
        sourceUrl: 'https://shopseoscan.com/hvac'
      }
    ]
  },
  roofing: {
    slug: 'roofing',
    label: 'Roofing',
    title: 'Instant Local SEO report for roofing contractors.',
    subtitle:
      'Get a practical SEO baseline, competitor snapshot, and action plan for local lead growth.',
    heroBuiltForLabel: 'Built for roofing contractors',
    scannerTrustStep: 'Detecting storm, inspection, and trust signals',
    scannerPlanStep: 'Building roofing growth plan',
    primaryCtaLabel: 'Request Inspection',
    conversionGoalLabel: 'inspection requests',
    authorityLabel: 'Trust & Proof',
    authorityDescription:
      'Trust & Proof measures roofing-specific confidence signals like storm-damage help, inspection offers, manufacturer credentials, warranties, financing, and project proof.',
    trustSignalsTitle: 'Trust Signals Property Owners Look For',
    trustSignalsEmptyText: 'No strong roofing trust or storm-response signals detected.',
    mapRankingsTitle: 'Map Rankings for Roofing Searches',
    benchmarkTitle: 'Winning Roofing Patterns',
    benchmarkDescription:
      'Comparison against field-tested roofing patterns to show what drives more inspections, replacement calls, and storm-related leads.',
    benchmarkUnavailableDescription:
      'A national benchmark crawler is not live for roofing yet, so we are using the report’s own trust and content signals instead.',
    competitorTitle: 'How Other Roofers Win More Inspection Calls',
    competitorDescription:
      'We look for storm-response language, inspection offers, trust proof, insurance-help content, and project credibility that make other roofers more likely to get the call.',
    contentCoverageDescription:
      'Content Coverage measures whether the site has enough repair, replacement, storm-damage, inspection, and system-specific pages to match real roofing searches.',
    localDescription:
      'Local SEO checks whether the site and business profile send strong signals for nearby roofing and storm-damage searches.',
    visibilityHealthDescription:
      'Your visibility health combines website basics, local presence, roofing trust signals, speed, and conversion readiness into one headline score.',
    intentDescription:
      'Intent measures whether the pages match what roofing customers are actually searching for, such as roof repair, replacement, inspections, storm damage, hail, and insurance guidance.',
    reportHeroTitle: 'Roofing Visibility Analysis',
    reportHeroCopy:
      'Operator-grade view of what is helping, what is suppressing inspection demand, and what to fix first in a storm-driven, trust-heavy market.',
    strategicFocus: [
      {
        label: 'Priority Lens',
        title: 'Inspection-first conversion',
        detail: 'Roofing sites often win by making inspections, storm response, and next-step clarity obvious before visitors ever compare brands.'
      },
      {
        label: 'Market Pressure',
        title: 'Storm and insurance urgency',
        detail: 'Storm-damage and claim-related pages behave like money pages in many roofing markets, especially after weather events.'
      },
      {
        label: 'Execution Bias',
        title: 'Trust proof over vague brand copy',
        detail: 'Warranties, project proof, manufacturer credentials, and financing usually beat generic “about us” content for conversion.'
      }
    ],
    weeklyClarityCopy:
      'Track inspection readiness, storm-response visibility, trust proof, and the issues affecting roofing lead flow.',
    competitorWatchCopy:
      'We surface storm and insurance positioning, inspection offers, and what stronger roofers are doing before property owners ever call.',
    tailoredSetupCopy:
      'We can tune the dashboard around storm damage, hail, insurance claims, retail replacement, project galleries, financing, or neighborhood coverage.',
    industryInsights: [
      {
        title: 'Storm and hail demand is a core roofing growth driver',
        detail:
          'IBHS notes there are roughly 3,000 hailstorms annually in the U.S. with major insured losses, and roofs in severe hail areas can require replacement far sooner than typical lifespan assumptions.',
        implication:
          'Storm-damage, hail, and insurance-help pages are not side content in roofing markets. They are often core demand capture assets.',
        sourceLabel: 'IBHS hail guidance',
        sourceUrl: 'https://ibhs.org/guidance/hail/'
      },
      {
        title: 'Reroofing demand has stayed active',
        detail:
          'NRCA-backed market index findings in 2025 continued to show active reroofing demand across the industry.',
        implication:
          'Replacement and inspection intent should be treated as money pages, not buried under generic brand copy.',
        sourceLabel: 'NRCA reroofing market index',
        sourceUrl: 'https://www.nrca.net/RoofingNews/trade-association-coalition-announces-q2-findings--from-market-index-survey-for-reroofing.8-1-2025.12865/Details/Story'
      },
      {
        title: 'Insurance clarity is part of trust, not just content',
        detail:
          'Roof buyers often need help navigating storm damage and claim-related next steps. Roofing sites that explain that path reduce hesitation.',
        implication:
          'Insurance and inspection messaging often earns trust before a property owner compares brand polish or blog volume.',
        sourceLabel: 'Roofing market behavior',
        sourceUrl: 'https://shopseoscan.com/roofing'
      }
    ]
  },
  plumbing: {
    slug: 'plumbing',
    label: 'Plumbing',
    title: 'Instant Local SEO report for plumbing businesses.',
    subtitle:
      'Understand rank gaps, conversion leaks, and next-step actions in your market.',
    heroBuiltForLabel: 'Built for plumbing businesses',
    scannerTrustStep: 'Detecting emergency, licensing, and specialty signals',
    scannerPlanStep: 'Building service growth plan',
    primaryCtaLabel: 'Call a Plumber',
    conversionGoalLabel: 'booked jobs',
    authorityLabel: 'Service Trust',
    authorityDescription:
      'Service Trust measures plumbing-specific proof like emergency-service visibility, licensing, specialty-service depth, financing, and homeowner trust signals.',
    trustSignalsTitle: 'Trust Signals Homeowners Look For',
    trustSignalsEmptyText: 'No strong plumbing trust or specialty-service signals detected.',
    mapRankingsTitle: 'Map Rankings for Plumbing Searches',
    benchmarkTitle: 'Winning Plumbing Patterns',
    benchmarkDescription:
      'Comparison against field-tested plumbing trust and conversion patterns to show what drives more calls and booked jobs.',
    benchmarkUnavailableDescription:
      'A national benchmark crawler is not live for plumbing yet, so we are using the report’s own trust and content signals instead.',
    competitorTitle: 'How Other Plumbers Win the Emergency Call',
    competitorDescription:
      'We look for emergency-service clarity, licensing, specialty depth, and local trust signals that make another plumber more likely to get the first call.',
    contentCoverageDescription:
      'Content Coverage measures whether the site has enough drain, leak, water heater, sewer, and emergency-service pages to match real plumbing searches.',
    localDescription:
      'Local SEO checks whether the site and business profile send strong signals for nearby plumbing and emergency-service searches.',
    visibilityHealthDescription:
      'Your visibility health combines website basics, local presence, plumbing trust signals, speed, and conversion readiness into one headline score.',
    intentDescription:
      'Intent measures whether the pages match what plumbing customers are actually searching for, such as emergency plumbing, drain cleaning, leak detection, water heater help, and sewer-line work.',
    reportHeroTitle: 'Plumbing Visibility Analysis',
    reportHeroCopy:
      'Operator-grade view of what is helping, what is suppressing booked jobs, and what to fix first in a high-urgency, phone-first market.',
    strategicFocus: [
      {
        label: 'Priority Lens',
        title: 'Emergency-call readiness',
        detail: 'Plumbing buyers often convert under pressure. Phone visibility and same-day clarity can outperform a lot of generic SEO effort.'
      },
      {
        label: 'Market Pressure',
        title: 'Specialty-service coverage',
        detail: 'Drain cleaning, leak detection, water heaters, and sewer pages often map more closely to real demand than generic plumbing pages.'
      },
      {
        label: 'Execution Bias',
        title: 'Licensing and trust proof',
        detail: 'In a trade where trust matters fast, visible licensing, reviews, and response-time confidence can drive more booked jobs.'
      }
    ],
    weeklyClarityCopy:
      'Track emergency-service visibility, specialty-service gaps, trust proof, and the issues affecting booked plumbing jobs.',
    competitorWatchCopy:
      'We surface emergency-call readiness, specialty-service coverage, and what stronger plumbers are doing before the phone rings.',
    tailoredSetupCopy:
      'We can tune the dashboard around emergency service, drain cleaning, water heaters, leak detection, sewer work, reviews, or service-area growth.',
    industryInsights: [
      {
        title: 'Leak urgency is real demand, not just maintenance content',
        detail:
          'EPA WaterSense still frames household leaks as a measurable, ongoing consumer problem with clear detection and repair triggers.',
        implication:
          'Leak-detection, emergency repair, and same-day plumbing pages deserve priority because they map directly to real-world homeowner urgency.',
        sourceLabel: 'EPA WaterSense leak guidance',
        sourceUrl: 'https://www.epa.gov/newsreleases/watersense-challenges-homeowners-take-10-minutes-find-and-fix-leak-week'
      },
      {
        title: 'Reputation and professionalism carry extra weight',
        detail:
          'PHCC’s own contractor recognition emphasizes professionalism and elevating trust in the plumbing trade.',
        implication:
          'Licensing, guarantees, reviews, dispatch clarity, and specialty proof are a bigger part of conversion than generic SEO polish alone.',
        sourceLabel: 'PHCC contractor of the year profile',
        sourceUrl: 'https://www.phccweb.org/news/phccs-plumbing-contractor-of-the-year-awarded-to-vincent-trey-giglio-iii-of-louisiana/'
      },
      {
        title: 'Emergency call clarity wins fast',
        detail:
          'Plumbing demand often begins under time pressure, which makes phone prominence and rapid-response messaging behave like ranking multipliers for real leads.',
        implication:
          'If the site hides call-first CTAs, response times, or 24/7 language, conversion friction can outweigh ranking gains.',
        sourceLabel: 'Shop SEO Scan service-market pattern',
        sourceUrl: 'https://shopseoscan.com/plumbing'
      }
    ]
  }
};

export const DEFAULT_VERTICAL: VerticalSlug = 'collision';

export function isVerticalSlug(value: string): value is VerticalSlug {
  return value in VERTICALS;
}

export function getVerticalConfig(value?: string | null): VerticalConfig {
  return VERTICALS[(value && isVerticalSlug(value) ? value : DEFAULT_VERTICAL) as VerticalSlug];
}
