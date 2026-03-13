import type { ReportPayload } from '@/lib/report-payload';
import type { PrioritizedFix } from '@/lib/types';

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

export function buildCollisionArchitectureSummary(payload: ReportPayload | null, city: string) {
  const checks = payload?.checks;
  const findings: string[] = [];
  const trustWeaknesses: string[] = [];
  const conversionIssues: string[] = [];
  const pageOpportunities: ArchitectureOpportunity[] = [];

  if (!checks?.locationFinderPresent) findings.push('Location structure is thin for local-intent discovery.');
  if (!checks?.estimateCtaDetected) conversionIssues.push('Estimate CTA is weak or missing on primary pages.');
  if (!checks?.onlineEstimateFlow) conversionIssues.push('No online estimate flow was detected.');
  if (!checks?.reviewProofPresent) trustWeaknesses.push('Review proof is not prominent on the site.');
  if (!checks?.reviewWidgetOrSchema) trustWeaknesses.push('Structured review markup or review widget is missing.');
  if (!checks?.insuranceGuidancePresent) findings.push('Insurance and claims guidance is light.');
  if (!checks?.warrantyMentioned) trustWeaknesses.push('Warranty language is not visible.');
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

  const teaser =
    pageOpportunities.length > 0
      ? `${pageOpportunities.length} high-intent architecture opportunities detected.`
      : 'Collision architecture is present, but deeper page opportunity analysis is premium.';

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
  const gaps: string[] = [];
  const actions: string[] = [];
  let score = 45;

  if (googlePlace?.rating) score += Math.min(20, googlePlace.rating * 3);
  if (googlePlace?.userRatingCount) score += Math.min(20, Math.log10(googlePlace.userRatingCount + 1) * 10);
  if (checks?.mapsLinkDetected || googlePlace?.googleMapsUri) score += 10;
  if (checks?.directionsOrReviewsCta) score += 8;
  if (payload?.mapPack?.queries?.length) score += 8;

  if (!googlePlace) gaps.push('Google profile data was unavailable from the current provider.');
  if (!checks?.mapsLinkDetected) gaps.push('No clear Google Maps or profile CTA was detected on-site.');
  if (!checks?.directionsOrReviewsCta) gaps.push('Directions or review CTA is weak.');
  if (reviewGap && typeof reviewGap.reviewGap === 'number' && reviewGap.reviewGap > 0) {
    gaps.push(`Local review gap of ${reviewGap.reviewGap} reviews versus the strongest competitor snapshot.`);
  }
  gaps.push('Photo gap unavailable from current provider.');
  gaps.push('GBP category/service delta unavailable from current provider.');

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
        : 'Competitor Maps comparison is partial in the current payload.',
    actionSuggestions: actions.slice(0, 3),
    teaser: 'Maps authority gaps detected. Upgrade to unlock comparison detail and action guidance.'
  } satisfies MapsAuthoritySummary;
}

export function buildCompetitorGapSummary(payload: ReportPayload | null, overallScore: number) {
  const advantages = payload?.competitorAdvantages || [];
  const strongest = advantages[0] || null;
  const strongestSignals = strongest?.advantages.slice(0, 4) || [];
  const servicePageDelta =
    strongest
      ? `${strongest.name} shows ${strongest.capabilityCount} capability signals and ${strongest.oemSignalCount} OEM signals in the latest competitor crawl.`
      : 'Detailed service-page delta is unavailable without a stronger competitor crawl.';

  const summary =
    strongest
      ? `${strongest.name} appears stronger in local collision trust and conversion coverage than your current site.`
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
}) {
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
        ? 'The site is likely leaking estimate demand due to coverage and conversion gaps.'
        : severity === 'Moderate'
          ? 'There are meaningful visibility and conversion leaks, but they look fixable.'
          : 'Current leak risk looks contained relative to the latest scan.'
  } satisfies RevenueLeakSummary;
}

export function buildRepairPlan(args: {
  architecture: CollisionArchitectureSummary;
  maps: MapsAuthoritySummary;
  topFixes: PrioritizedFix[];
}) {
  const firstPage = args.architecture.pageOpportunities[0];
  const secondPage = args.architecture.pageOpportunities[1];
  return [
    {
      week: 'Week 1',
      focus: 'Fix conversion blockers',
      action: args.topFixes[0]?.title || 'Tighten estimate CTA placement and trust proof.'
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
