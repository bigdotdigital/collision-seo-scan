import type { ReportPayload } from '@/lib/report-payload';
import type { PrioritizedFix } from '@/lib/types';
import { getVerticalConfig } from '@/lib/verticals';

export type DashboardEntitlement = 'free' | 'premium';

export type ArchitectureOpportunity = {
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
};

export type CollisionArchitectureSummary = {
  score: number;
  findings: string[];
  trustWeaknesses: string[];
  conversionIssues: string[];
  pageOpportunities: ArchitectureOpportunity[];
  teaser: string;
};

export type MapsAuthoritySummary = {
  score: number;
  highLevelGaps: string[];
  competitorComparison: string;
  actionSuggestions: string[];
  teaser: string;
};

export type CompetitorGapSummary = {
  summary: string;
  strongestSignals: string[];
  servicePageDelta: string;
  teaser: string;
};

export type RevenueLeakSummary = {
  severity: 'Low' | 'Moderate' | 'High';
  drivers: string[];
  summary: string;
};

export type RepairPlanWeek = {
  week: string;
  focus: string;
  action: string;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasSignal(payload: ReportPayload | null, pattern: RegExp) {
  return (payload?.detectedSignals || []).some((signal) => pattern.test(signal.signal_name));
}

function missingPage(payload: ReportPayload | null, page: string) {
  return (payload?.missingPages || []).includes(page);
}

function architectureBaseScore(payload: ReportPayload | null) {
  if (!payload?.categoryScores) return 0;
  return clampScore(
    payload.categoryScores.technicalSeo * 0.3 +
      payload.categoryScores.collisionAuthority * 0.4 +
      payload.categoryScores.contentCoverage * 0.3
  );
}

function buildArchitectureOpportunities(payload: ReportPayload | null, city: string, vertical?: string | null) {
  const cfg = getVerticalConfig(vertical);
  const checks = payload?.checks;
  const pageOpportunities: ArchitectureOpportunity[] = [];

  if (cfg.slug === 'hvac') {
    if (missingPage(payload, 'services')) {
      pageOpportunities.push({
        title: `HVAC repair ${city} page`,
        reason: 'Service intent coverage is missing for the core heating and cooling term.',
        priority: 'high'
      });
    }
    if (!hasSignal(payload, /emergency|24\/7|same-day/i)) {
      pageOpportunities.push({
        title: `Emergency HVAC service ${city} page`,
        reason: 'Urgent service intent is often one of the fastest HVAC conversion levers.',
        priority: 'high'
      });
    }
    if (!hasSignal(payload, /maintenance|tune-up|membership/i)) {
      pageOpportunities.push({
        title: `HVAC maintenance plan ${city} page`,
        reason: 'Maintenance visibility supports both recurring revenue and search intent.',
        priority: 'medium'
      });
    }
    if (!hasSignal(payload, /heat pump|air quality|iaq/i)) {
      pageOpportunities.push({
        title: 'Heat pump or IAQ specialty page',
        reason: 'Specialty equipment pages strengthen differentiation in HVAC markets.',
        priority: 'medium'
      });
    }
    if (!hasSignal(payload, /financing|payment/i)) {
      pageOpportunities.push({
        title: 'HVAC financing page',
        reason: 'Financing visibility reduces friction on higher-ticket replacement jobs.',
        priority: 'medium'
      });
    }
    return pageOpportunities;
  }

  if (cfg.slug === 'plumbing') {
    if (missingPage(payload, 'services')) {
      pageOpportunities.push({
        title: `Plumber ${city} page`,
        reason: 'Service intent coverage is missing for the core local plumbing term.',
        priority: 'high'
      });
    }
    if (!hasSignal(payload, /emergency|24\/7|same-day/i)) {
      pageOpportunities.push({
        title: `Emergency plumber ${city} page`,
        reason: 'Emergency-intent coverage is a major conversion lever in plumbing markets.',
        priority: 'high'
      });
    }
    if (!hasSignal(payload, /drain/i)) {
      pageOpportunities.push({
        title: `Drain cleaning ${city} page`,
        reason: 'Drain-intent searches are high urgency and often strong commercial opportunities.',
        priority: 'medium'
      });
    }
    if (!hasSignal(payload, /water heater/i)) {
      pageOpportunities.push({
        title: `Water heater repair ${city} page`,
        reason: 'Water heater intent is a common high-value plumbing search theme.',
        priority: 'medium'
      });
    }
    if (!hasSignal(payload, /sewer|leak/i)) {
      pageOpportunities.push({
        title: 'Leak or sewer specialty page',
        reason: 'Specialty-service coverage helps match urgent homeowner searches.',
        priority: 'medium'
      });
    }
    return pageOpportunities;
  }

  if (cfg.slug === 'roofing') {
    if (missingPage(payload, 'services')) {
      pageOpportunities.push({
        title: `Roof repair ${city} page`,
        reason: 'Service intent coverage is missing for the core local roofing term.',
        priority: 'high'
      });
    }
    if (!hasSignal(payload, /storm|hail/i)) {
      pageOpportunities.push({
        title: `Storm damage roofing ${city} page`,
        reason: 'Storm-response coverage is a major roofing demand capture asset.',
        priority: 'high'
      });
    }
    if (!hasSignal(payload, /inspection/i)) {
      pageOpportunities.push({
        title: `Roof inspection ${city} page`,
        reason: 'Inspection-first pages often convert earlier than replacement-only copy.',
        priority: 'medium'
      });
    }
    if (!hasSignal(payload, /insurance|claim/i)) {
      pageOpportunities.push({
        title: 'Insurance claims help page',
        reason: 'Insurance guidance reduces friction in storm-driven roofing jobs.',
        priority: 'medium'
      });
    }
    if (!checks?.warrantyMentioned) {
      pageOpportunities.push({
        title: 'Warranty and financing page',
        reason: 'Warranty and financing visibility strengthens trust on bigger roofing jobs.',
        priority: 'medium'
      });
    }
    return pageOpportunities;
  }

  if (!checks?.adasMentioned) {
    pageOpportunities.push({
      title: 'ADAS calibration page',
      reason: 'Strong collision shops often explain ADAS calibration and post-repair scanning.',
      priority: 'medium'
    });
  }

  if (missingPage(payload, 'services')) {
    pageOpportunities.push({
      title: `Collision repair ${city} page`,
      reason: 'Service intent coverage is missing for the core collision term.',
      priority: 'high'
    });
  }
  if (!hasSignal(payload, /hail/i)) {
    pageOpportunities.push({
      title: `Hail damage repair ${city} page`,
      reason: 'Hail demand often converts well in collision markets.',
      priority: 'high'
    });
  }
  if (!hasSignal(payload, /paintless|pdr/i)) {
    pageOpportunities.push({
      title: `Paintless dent repair ${city} page`,
      reason: 'PDR intent is missing from the current architecture.',
      priority: 'medium'
    });
  }
  if (!hasSignal(payload, /aluminum/i)) {
    pageOpportunities.push({
      title: 'Aluminum repair page',
      reason: 'Material-specific repair pages strengthen specialty relevance.',
      priority: 'medium'
    });
  }
  if (!checks?.insuranceGuidancePresent) {
    pageOpportunities.push({
      title: 'Insurance claims help page',
      reason: 'Claims content supports both conversion and local trust.',
      priority: 'medium'
    });
  }
  if (!checks?.hasOwnProperty('fleetSignals') || !checks.fleetSignals.length) {
    pageOpportunities.push({
      title: 'Fleet and van repair page',
      reason: 'Fleet capability is not clearly represented in the current architecture.',
      priority: 'low'
    });
  }
  return pageOpportunities;
}

export function buildCollisionArchitectureSummary(payload: ReportPayload | null, city: string, vertical?: string | null) {
  const checks = payload?.checks;
  const cfg = getVerticalConfig(vertical);
  const findings: string[] = [];
  const trustWeaknesses: string[] = [];
  const conversionIssues: string[] = [];
  const pageOpportunities = buildArchitectureOpportunities(payload, city, vertical);

  if (!checks?.locationFinderPresent) findings.push('Location structure is thin for local-intent discovery.');
  if (!checks?.estimateCtaDetected) conversionIssues.push(`${cfg.primaryCtaLabel} CTA is weak or missing on primary pages.`);
  if (!checks?.onlineEstimateFlow) conversionIssues.push(`No visible ${cfg.primaryCtaLabel.toLowerCase()} flow was detected.`);
  if (!checks?.reviewProofPresent) trustWeaknesses.push('Review proof is not prominent on the site.');
  if (!checks?.reviewWidgetOrSchema) trustWeaknesses.push('Structured review markup or review widget is missing.');
  if (!checks?.insuranceGuidancePresent && (cfg.slug === 'collision' || cfg.slug === 'roofing')) {
    findings.push('Insurance and claims guidance is light.');
  }
  if (!checks?.warrantyMentioned) trustWeaknesses.push('Warranty language is not visible.');

  const teaser =
    pageOpportunities.length > 0
      ? `${pageOpportunities.length} high-intent architecture opportunities detected.`
      : `${cfg.label} architecture is present, but deeper page opportunity analysis is premium.`;

  return {
    score: architectureBaseScore(payload),
    findings: findings.slice(0, 4),
    trustWeaknesses: trustWeaknesses.slice(0, 4),
    conversionIssues: conversionIssues.slice(0, 4),
    pageOpportunities: pageOpportunities.slice(0, 6),
    teaser
  } satisfies CollisionArchitectureSummary;
}

export function buildMapsAuthoritySummary(payload: ReportPayload | null) {
  const checks = payload?.checks;
  const googlePlace = payload?.googlePlace;
  const reviewGap = payload?.reviewGap;
  const reviewSource = payload?.sources?.reviews;
  const mapPackSource = payload?.sources?.mapPack;
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 45;

  if (googlePlace?.rating) score += Math.min(20, googlePlace.rating * 3);
  if (googlePlace?.userRatingCount) score += Math.min(20, Math.log10(googlePlace.userRatingCount + 1) * 10);
  if (checks?.mapsLinkDetected || googlePlace?.googleMapsUri) score += 10;
  if (checks?.directionsOrReviewsCta) score += 8;
  if (payload?.mapPack?.queries?.length) score += 8;

  if (!googlePlace) gaps.push('No saved Google profile data is available yet for this shop.');
  if (!checks?.mapsLinkDetected) gaps.push('No clear Google Maps or profile CTA was detected on-site.');
  if (!checks?.directionsOrReviewsCta) gaps.push('Directions or review CTA is weak.');
  if (reviewGap && typeof reviewGap.reviewGap === 'number' && reviewGap.reviewGap > 0) {
    gaps.push(`Local review gap of ${reviewGap.reviewGap} reviews versus the strongest competitor snapshot.`);
  }
  gaps.push(
    reviewSource === 'cached' || reviewSource === 'live'
      ? 'Google photo coverage is not stored yet in the current observation set.'
      : 'Google photo coverage will appear once we store more profile observations.'
  );
  gaps.push(
    mapPackSource === 'cached' || mapPackSource === 'live'
      ? 'GBP category and service deltas are not modeled from the stored profile yet.'
      : 'GBP category and service deltas will appear after a stronger profile refresh.'
  );

  if (reviewGap && typeof reviewGap.reviewGap === 'number' && reviewGap.reviewGap > 0) {
    actions.push('Close the review gap with a structured post-repair review ask.');
  }
  if (!checks?.mapsLinkDetected) actions.push('Add a stronger Google profile / directions CTA on contact and service pages.');
  if (!checks?.reviewProofPresent) actions.push('Bring Google review proof higher on the page.');

  return {
    score: clampScore(score),
    highLevelGaps: gaps.slice(0, 4),
    competitorComparison:
      reviewGap && typeof reviewGap.reviewGap === 'number'
        ? reviewGap.reviewGap > 0
          ? 'A nearby competitor appears stronger on reviews.'
          : 'Your review position is not obviously behind the competitor snapshot.'
        : reviewSource === 'cached'
          ? 'Using stored Google profile data, but competitor Maps comparison is still partial.'
          : 'Competitor Maps comparison is partial in the current payload.',
    actionSuggestions: actions.slice(0, 3),
    teaser: 'Maps authority gaps detected. Upgrade to unlock comparison detail and action guidance.'
  } satisfies MapsAuthoritySummary;
}

export function buildCompetitorGapSummary(payload: ReportPayload | null, overallScore: number, vertical?: string | null) {
  const cfg = getVerticalConfig(vertical);
  const advantages = payload?.competitorAdvantages || [];
  const strongest = advantages[0] || null;
  const strongestSignals = strongest?.advantages.slice(0, 4) || [];
  const servicePageDelta =
    strongest
      ? `${strongest.name} shows ${strongest.capabilityCount} capability signals and ${strongest.oemSignalCount} OEM signals in the latest competitor crawl.`
      : 'Detailed service-page delta is unavailable without a stronger competitor crawl.';

  const summary =
    strongest
      ? `${strongest.name} appears stronger in local ${cfg.label.toLowerCase()} trust and conversion coverage than your current site.`
      : overallScore < 75
        ? 'Local competitors appear stronger in several areas.'
        : 'No strong competitor gap summary is available from the current crawl.';

  return {
    summary,
    strongestSignals,
    servicePageDelta,
    teaser: strongest ? 'Premium view unlocks the exact competitor deltas and strongest rival signals.' : 'Premium competitor comparison unlocks when stronger crawl data is available.'
  } satisfies CompetitorGapSummary;
}

export function buildRevenueLeakSummary(args: {
  architecture: CollisionArchitectureSummary;
  maps: MapsAuthoritySummary;
  competitor: CompetitorGapSummary;
  topFixes: PrioritizedFix[];
  vertical?: string | null;
}) {
  const cfg = getVerticalConfig(args.vertical);
  const drivers = [
    ...args.architecture.conversionIssues,
    ...args.architecture.trustWeaknesses,
    ...args.maps.highLevelGaps.filter((item) => !/unavailable/i.test(item)),
    ...args.topFixes.slice(0, 2).map((fix) => fix.title)
  ].slice(0, 5);

  const rawSeverity =
    (args.architecture.score < 65 ? 2 : 0) +
    (args.maps.score < 60 ? 1 : 0) +
    (args.architecture.pageOpportunities.filter((item) => item.priority === 'high').length >= 2 ? 1 : 0);

  const severity = rawSeverity >= 3 ? 'High' : rawSeverity >= 2 ? 'Moderate' : 'Low';

  return {
    severity,
    drivers,
    summary:
      severity === 'High'
        ? `The site is likely leaking ${cfg.conversionGoalLabel} due to coverage and conversion gaps.`
        : severity === 'Moderate'
          ? 'There are meaningful visibility and conversion leaks, but they look fixable.'
          : 'Current leak risk looks contained relative to the latest scan.'
  } satisfies RevenueLeakSummary;
}

export function buildRepairPlan(args: {
  architecture: CollisionArchitectureSummary;
  maps: MapsAuthoritySummary;
  topFixes: PrioritizedFix[];
  vertical?: string | null;
}) {
  const cfg = getVerticalConfig(args.vertical);
  const firstPage = args.architecture.pageOpportunities[0];
  const secondPage = args.architecture.pageOpportunities[1];
  return [
    {
      week: 'Week 1',
      focus: 'Fix conversion blockers',
      action: args.topFixes[0]?.title || `Tighten ${cfg.primaryCtaLabel.toLowerCase()} placement and trust proof.`
    },
    {
      week: 'Week 2',
      focus: 'Close page architecture gaps',
      action: firstPage ? `Publish or expand ${firstPage.title}.` : 'Expand the highest-intent service page.'
    },
    {
      week: 'Week 3',
      focus: 'Strengthen Maps authority',
      action: args.maps.actionSuggestions[0] || 'Improve review acquisition and Google profile visibility.'
    },
    {
      week: 'Week 4',
      focus: 'Add the next specialty proof point',
      action: secondPage ? `Build ${secondPage.title} and re-scan.` : args.topFixes[1]?.title || 'Validate improvements with a fresh scan.'
    }
  ] satisfies RepairPlanWeek[];
}

export function premiumEntitlement(status: string | null | undefined): DashboardEntitlement {
  return status === 'active' || status === 'trialing' ? 'premium' : 'free';
}
