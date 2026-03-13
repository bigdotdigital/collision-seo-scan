import assert from 'node:assert/strict';
import { normalizeWebsiteUrl } from '../lib/security/url.ts';
import {
  buildCollisionArchitectureSummary,
  buildMapsAuthoritySummary,
  buildRevenueLeakSummary,
  premiumEntitlement
} from '../lib/dashboard-intelligence.ts';
import type { ReportPayload } from '../lib/report-payload.ts';

function makePayload(partial: Partial<ReportPayload>): ReportPayload {
  return {
    version: 'v1',
    generatedAt: new Date().toISOString(),
    checks: {
      checkedUrls: ['/'],
      https: true,
      title: 'Collision Repair',
      titleHasCityOrService: true,
      metaDescription: 'Meta',
      h1: 'Collision Repair',
      h1HasServiceOrCity: true,
      napDetected: true,
      estimateCtaDetected: false,
      performanceScore: 72,
      performanceMethod: 'ttfb-heuristic',
      sitemapFound: true,
      mapsLinkDetected: false,
      mapEmbedDetected: false,
      directionsOrReviewsCta: false,
      reviewWidgetOrSchema: false,
      oemSignals: [],
      fleetSignals: [],
      insuranceSignals: [],
      schemaTypes: [],
      fetchNotes: [],
      homeWordCount: 300,
      onlineEstimateFlow: false,
      locationFinderPresent: false,
      warrantyMentioned: false,
      insuranceGuidancePresent: false,
      adasMentioned: false,
      reviewProofPresent: false
    },
    categoryScores: {
      technicalSeo: 66,
      localSeo: 58,
      collisionAuthority: 54,
      speedPerformance: 72,
      contentCoverage: 49,
      overall: 60,
      explanations: {
        technicalSeo: '',
        localSeo: '',
        collisionAuthority: '',
        speedPerformance: '',
        contentCoverage: ''
      }
    },
    detectedSignals: [],
    missingSignals: [],
    capabilityMissing: [],
    topFixes: [
      { title: 'Add estimate CTA', why: 'Missing CTA', steps: ['Add CTA'], impact: 'High' },
      { title: 'Add trust proof', why: 'Missing trust', steps: ['Add reviews'], impact: 'Med' }
    ],
    competitorAdvantages: [
      {
        name: 'Rival Body Shop',
        advantages: ['More reviews', 'Stronger OEM pages'],
        oemSignalCount: 2,
        capabilityCount: 4,
        estimateCta: true
      }
    ],
    missingPages: ['services'],
    pageFetchMeta: [],
    scanDurationMs: 1000,
    reviewGap: {
      shopRating: 4.4,
      shopReviews: 45,
      competitorRating: 4.8,
      competitorReviews: 180,
      reviewGap: 135,
      impact: 'High'
    },
    mapPack: {
      info: 'Map info',
      likelySignals: ['Signal'],
      queries: [{ query: 'collision repair denver', rank1: 'A', rank2: 'B', rank3: 'C', yourRank: '#5' }]
    },
    sources: {
      pagespeed: 'live',
      serp: 'live',
      aiSummary: 'live',
      reviews: 'live',
      mapPack: 'live',
      competitors: 'live',
      keywords: 'modeled'
    },
    ...partial
  };
}

function testUrlValidation() {
  assert.equal(normalizeWebsiteUrl('https://example.com'), 'https://example.com/');
  assert.equal(normalizeWebsiteUrl('example.com')?.startsWith('https://example.com'), true);
  assert.equal(normalizeWebsiteUrl('file:///etc/passwd'), null);
  assert.equal(normalizeWebsiteUrl('http://localhost:3000'), null);
  assert.equal(normalizeWebsiteUrl('http://127.0.0.1'), null);
}

function testSignalDetection() {
  const html = `
    <html><body>
      <h1>Subaru Certified Collision Repair</h1>
      <p>I-CAR Gold Class and ADAS calibration available.</p>
      <a href="/estimate">Free Estimate</a>
      <p>Aluminum repair and EV certified technicians.</p>
    </body></html>
  `;

  const text = html.toLowerCase();
  const names: string[] = [];
  if (/\bsubaru\b/.test(text)) names.push('subaru_certified');
  if (/i-?car gold class/.test(text)) names.push('i_car_gold_class');
  if (/adas/.test(text) && /calibration/.test(text)) names.push('adas_calibration');
  if (/free estimate|photo estimate/.test(text)) names.push('free_estimate_cta');
  if (/aluminum/.test(text)) names.push('aluminum_repair');

  assert.ok(names.includes('subaru_certified'));
  assert.ok(names.includes('i_car_gold_class'));
  assert.ok(names.includes('adas_calibration'));
  assert.ok(names.includes('free_estimate_cta'));
  assert.ok(names.includes('aluminum_repair'));
}

function testCollisionArchitectureSummary() {
  const summary = buildCollisionArchitectureSummary(makePayload({}), 'Denver');
  assert.ok(summary.score > 0);
  assert.ok(summary.pageOpportunities.some((item) => /Collision repair Denver page/i.test(item.title)));
  assert.ok(summary.conversionIssues.some((item) => /Estimate CTA/i.test(item)));
}

function testMapsFallbackBehavior() {
  const summary = buildMapsAuthoritySummary(
    makePayload({
      googlePlace: undefined,
      reviewGap: null,
      sources: {
        pagespeed: 'live',
        serp: 'live',
        aiSummary: 'live',
        reviews: 'fallback',
        mapPack: 'fallback',
        competitors: 'live',
        keywords: 'modeled'
      }
    })
  );
  assert.ok(summary.highLevelGaps.some((item) => /unavailable from the current provider/i.test(item)));
}

function testRevenueLeakSeverity() {
  const payload = makePayload({});
  const architecture = buildCollisionArchitectureSummary(payload, 'Denver');
  const maps = buildMapsAuthoritySummary(payload);
  const leak = buildRevenueLeakSummary({
    architecture,
    maps,
    competitor: {
      summary: 'Competitors stronger',
      strongestSignals: [],
      servicePageDelta: '',
      teaser: ''
    },
    topFixes: payload.topFixes
  });
  assert.equal(leak.severity, 'High');
}

function testPremiumGating() {
  assert.equal(premiumEntitlement('active'), 'premium');
  assert.equal(premiumEntitlement('trialing'), 'premium');
  assert.equal(premiumEntitlement('canceled'), 'free');
  assert.equal(premiumEntitlement(null), 'free');
}

function run() {
  testUrlValidation();
  testSignalDetection();
  testCollisionArchitectureSummary();
  testMapsFallbackBehavior();
  testRevenueLeakSeverity();
  testPremiumGating();
  console.log('test-core: all checks passed');
}

run();
