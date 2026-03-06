import { clamp } from '@/lib/utils';
import type { CategoryScoreSet, CollisionSignal, ScanChecks } from '@/lib/types';
import type { PageSpeedResult } from '@/lib/pagespeed';

export function computeCategoryScores(input: {
  checks: ScanChecks;
  pagespeed: PageSpeedResult;
  detectedSignals: CollisionSignal[];
  missingSignals: string[];
  pagesAnalyzed: number;
}): CategoryScoreSet {
  const { checks, pagespeed, detectedSignals, missingSignals, pagesAnalyzed } = input;

  const technicalSeo = clamp(
    100 -
      (checks.title ? 0 : 20) -
      (checks.metaDescription ? 0 : 10) -
      (checks.h1 ? 0 : 15) -
      (checks.sitemapFound ? 0 : 8) -
      (checks.https ? 0 : 20),
    0,
    100
  );

  const localSeo = clamp(
    100 -
      (checks.mapsLinkDetected ? 0 : 20) -
      (checks.mapEmbedDetected ? 0 : 10) -
      (checks.napDetected ? 0 : 30) -
      (checks.directionsOrReviewsCta ? 0 : 15),
    0,
    100
  );

  const certCount = detectedSignals.filter((s) => s.group === 'certification').length;
  const capabilityCount = detectedSignals.filter((s) => s.group === 'capability').length;
  const collisionAuthority = clamp(certCount * 12 + capabilityCount * 10 - missingSignals.length * 4, 0, 100);

  const speedPerformance = clamp(
    pagespeed.performanceScore ?? checks.performanceScore,
    0,
    100
  );

  const contentCoverage = clamp(
    pagesAnalyzed * 22 + (checks.estimateCtaDetected ? 12 : 0) + (checks.insuranceSignals.length > 0 ? 10 : 0),
    0,
    100
  );

  const overall = Math.round(
    technicalSeo * 0.24 +
      localSeo * 0.24 +
      collisionAuthority * 0.22 +
      speedPerformance * 0.18 +
      contentCoverage * 0.12
  );

  return {
    technicalSeo,
    localSeo,
    collisionAuthority,
    speedPerformance,
    contentCoverage,
    overall,
    explanations: {
      technicalSeo: 'Foundational crawlability, metadata quality, and indexability signals.',
      localSeo: 'Google Maps/NAP/review and local intent readiness signals.',
      collisionAuthority: 'Collision-specific certifications and capability trust signals.',
      speedPerformance: 'Page speed and UX readiness from measured or modeled checks.',
      contentCoverage: 'Coverage of high-intent service content and conversion pages.'
    } as CategoryScoreSet['explanations']
  };
}
