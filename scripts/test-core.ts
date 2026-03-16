import assert from 'node:assert/strict';
import { normalizeWebsiteUrl } from '../lib/security/url.ts';
import { scanHostKey } from '../lib/security/scan-submit-guard.ts';
import { normalizeInsurerName } from '../lib/insurance-normalization.ts';
import { extractInsuranceRelationshipSignals } from '../lib/insurance-signals.ts';
import { sourceConfidenceScore } from '../lib/shop-source-observations.ts';
import { NonRetryableError, isNonRetryableError } from '../lib/errors.ts';
import { getPasswordPolicyError } from '../lib/password-policy.ts';
import { consumeRequestThrottle } from '../lib/request-throttle.ts';
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

function testScanHostKey() {
  assert.equal(scanHostKey('https://www.example.com/about'), 'example.com');
  assert.equal(scanHostKey('https://sub.example.com/location'), 'sub.example.com');
  assert.equal(scanHostKey('not-a-url'), '');
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
  assert.ok(summary.highLevelGaps.some((item) => /No saved Google profile data/i.test(item)));
  assert.ok(summary.highLevelGaps.some((item) => /will appear/i.test(item) || /not stored yet/i.test(item)));
}

function testNonRetryableErrors() {
  assert.equal(isNonRetryableError(new NonRetryableError('invalid_website_url')), true);
  assert.equal(isNonRetryableError(new Error('random_failure')), false);
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

function testInsuranceNormalization() {
  assert.equal(normalizeInsurerName('statefarm'), 'State Farm');
  assert.equal(normalizeInsurerName('State Farm Insurance'), 'State Farm');
  assert.equal(normalizeInsurerName('GEICO'), 'GEICO');
  assert.equal(normalizeInsurerName('liberty mutual'), 'Liberty Mutual');
}

function testInsuranceSignalExtraction() {
  const signals = extractInsuranceRelationshipSignals({
    'https://shop.example/insurance': `
      <html>
        <body>
          <img alt="State Farm approved repair" src="/img/state-farm-logo.png" />
          <p>We work with State Farm, GEICO, and Progressive claims.</p>
          <a href="https://www.geico.com/claims/">Start your GEICO claim</a>
        </body>
      </html>
    `
  });

  assert.ok(signals.some((row) => row.insurerName === 'State Farm' && row.signalType === 'logo'));
  assert.ok(signals.some((row) => row.insurerName === 'GEICO'));
  assert.ok(signals.some((row) => row.insurerName === 'Progressive'));
}

function testSourceConfidence() {
  assert.equal(sourceConfidenceScore('GOOGLE_MAPS'), 0.95);
  assert.equal(sourceConfidenceScore('YELP'), 0.65);
  assert.equal(sourceConfidenceScore('REDDIT'), 0.35);
}

function testPasswordPolicy() {
  assert.equal(getPasswordPolicyError('short'), 'Use at least 10 characters.');
  assert.equal(getPasswordPolicyError('alllowercase123'), 'Add at least one uppercase letter.');
  assert.equal(getPasswordPolicyError('ALLUPPERCASE123'), 'Add at least one lowercase letter.');
  assert.equal(getPasswordPolicyError('NoNumbersHere'), 'Add at least one number.');
  assert.equal(getPasswordPolicyError('StrongPass123'), null);
}

function testRequestThrottle() {
  const first = consumeRequestThrottle({
    bucket: 'test-core',
    keyParts: ['alex@example.com'],
    limit: 2,
    windowMs: 60_000
  });
  const second = consumeRequestThrottle({
    bucket: 'test-core',
    keyParts: ['alex@example.com'],
    limit: 2,
    windowMs: 60_000
  });
  const third = consumeRequestThrottle({
    bucket: 'test-core',
    keyParts: ['alex@example.com'],
    limit: 2,
    windowMs: 60_000
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
}

function run() {
  testUrlValidation();
  testScanHostKey();
  testSignalDetection();
  testCollisionArchitectureSummary();
  testMapsFallbackBehavior();
  testNonRetryableErrors();
  testRevenueLeakSeverity();
  testPremiumGating();
  testInsuranceNormalization();
  testInsuranceSignalExtraction();
  testSourceConfidence();
  testPasswordPolicy();
  testRequestThrottle();
  console.log('test-core: all checks passed');
}

run();
