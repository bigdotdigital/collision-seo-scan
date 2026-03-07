import * as cheerio from 'cheerio';
import { normalizeSpace } from '@/lib/utils';
import { safeFetchText } from '@/lib/security/safe-fetch';
import type {
  BenchmarkPatternKey,
  NationalBenchmarkPattern,
  NationalBenchmarkRecommendation,
  NationalBenchmarkResult,
  NationalBenchmarkSite,
  ScanChecks,
  Severity
} from '@/lib/types';

const METRO_SAMPLES = [
  'new york, ny',
  'los angeles, ca',
  'chicago, il',
  'houston, tx',
  'phoenix, az',
  'philadelphia, pa',
  'san antonio, tx',
  'san diego, ca',
  'dallas, tx',
  'denver, co'
];

const SERP_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TARGET = 10;
let benchmarkCache: { expiresAt: number; data: NationalBenchmarkResult } | null = null;

const CHAIN_DOMAIN_BLOCKLIST = [
  'caliber.com',
  'gerbercollision.com',
  'crashchampions.com',
  'maaco.com',
  'fixauto.com',
  'carstar.com',
  'abraauto.com',
  'serviceking.com',
  'classiccollision.com'
];

const DIRECTORY_BLOCKLIST = [
  'yelp.com',
  'yellowpages.com',
  'mapquest.com',
  'bbb.org',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'wikipedia.org',
  'tripadvisor.com'
];

function firstSnippet(text: string, patterns: RegExp[]): string | undefined {
  const compact = normalizeSpace(text);
  for (const pattern of patterns) {
    const match = compact.match(pattern);
    if (!match || typeof match.index !== 'number') continue;
    const start = Math.max(0, match.index - 70);
    const end = Math.min(compact.length, match.index + 110);
    return compact.slice(start, end);
  }
  return undefined;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function isLikelyIndependentDomain(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  if (DIRECTORY_BLOCKLIST.some((bad) => host === bad || host.endsWith(`.${bad}`))) return false;
  if (CHAIN_DOMAIN_BLOCKLIST.some((bad) => host === bad || host.endsWith(`.${bad}`))) return false;
  return true;
}

async function fetchIndependentDomainsFromSerp(metro: string): Promise<string[]> {
  const key = process.env.SERP_API_KEY;
  if (!key) return [];

  const query = encodeURIComponent(`independent collision repair ${metro}`);
  const url = `https://serpapi.com/search.json?engine=google&q=${query}&api_key=${encodeURIComponent(key)}&num=10`;

  try {
    const result = await safeFetchText(url, { timeoutMs: SERP_TIMEOUT_MS });
    if (!result.ok || !result.text) return [];

    const parsed = JSON.parse(result.text) as {
      organic_results?: Array<{ link?: string }>;
    };
    const links = Array.isArray(parsed.organic_results)
      ? parsed.organic_results
          .map((row) => row.link)
          .filter((v): v is string => typeof v === 'string')
      : [];

    const out: string[] = [];
    const seenHosts = new Set<string>();
    for (const link of links) {
      if (!isLikelyIndependentDomain(link)) continue;
      const host = hostnameOf(link);
      if (!host || seenHosts.has(host)) continue;
      seenHosts.add(host);
      out.push(link);
    }
    return out.slice(0, 3);
  } catch {
    return [];
  }
}

async function gatherIndependentLeaderUrls(): Promise<string[]> {
  const byMetro = await Promise.all(METRO_SAMPLES.map((metro) => fetchIndependentDomainsFromSerp(metro)));
  const merged = byMetro.flat();

  const out: string[] = [];
  const seenHosts = new Set<string>();
  for (const url of merged) {
    const host = hostnameOf(url);
    if (!host || seenHosts.has(host)) continue;
    seenHosts.add(host);
    out.push(url);
    if (out.length >= FETCH_TARGET) break;
  }
  return out;
}

function detectSiteSignals(html: string, url: string): NationalBenchmarkSite {
  const $ = cheerio.load(html);
  const bodyText = normalizeSpace($('body').text()).toLowerCase();
  const navText = normalizeSpace($('a, button').text()).toLowerCase();
  const linkHrefs = $('a[href]')
    .map((_, el) => String($(el).attr('href') || ''))
    .get();
  const serviceHrefHits = new Set(
    linkHrefs.filter((href) =>
      /service|collision|repair|paint|dent|hail|bumper|frame|calibration|estimate/i.test(href)
    )
  );

  const patterns: Record<BenchmarkPatternKey, boolean> = {
    estimate_cta: /(free estimate|online estimate|request estimate|get estimate|book estimate|start estimate)/i.test(
      navText
    ),
    oem_certifications: /(certified|oem|factory certified|manufacturer certified|i-car|ase)/i.test(
      bodyText
    ),
    insurance_guidance: /(insurance claim|we work with insurance|deductible|claim support)/i.test(
      bodyText
    ),
    warranty_visibility: /(lifetime warranty|warranty on repairs|guarantee)/i.test(bodyText),
    location_finder: /(find a location|locations|find a shop|near you)/i.test(navText),
    review_proof: /(reviews|testimonials|google rating|stars|customer stories)/i.test(bodyText),
    service_page_depth: serviceHrefHits.size >= 4
  };

  const evidence: Partial<Record<BenchmarkPatternKey, string>> = {
    estimate_cta: firstSnippet(navText, [
      /(free estimate|online estimate|request estimate|get estimate|book estimate|start estimate)/i
    ]),
    oem_certifications: firstSnippet(bodyText, [
      /(certified|oem|factory certified|manufacturer certified|i-car|ase)/i
    ]),
    insurance_guidance: firstSnippet(bodyText, [
      /(insurance claim|we work with insurance|deductible|claim support)/i
    ]),
    warranty_visibility: firstSnippet(bodyText, [/(lifetime warranty|warranty on repairs|guarantee)/i]),
    location_finder: firstSnippet(navText, [/(find a location|locations|find a shop|near you)/i]),
    review_proof: firstSnippet(bodyText, [/(reviews|testimonials|google rating|stars|customer stories)/i]),
    service_page_depth: patterns.service_page_depth
      ? `${serviceHrefHits.size} service-intent links detected`
      : undefined
  };

  return {
    domain: hostnameOf(url) || url,
    url,
    patterns,
    evidence
  };
}

function toShopPatternState(checks: ScanChecks): Record<BenchmarkPatternKey, boolean> {
  return {
    estimate_cta: checks.estimateCtaDetected || checks.onlineEstimateFlow,
    oem_certifications: checks.oemSignals.length > 0,
    insurance_guidance: checks.insuranceGuidancePresent || checks.insuranceSignals.length > 0,
    warranty_visibility: checks.warrantyMentioned,
    location_finder: checks.locationFinderPresent || checks.mapsLinkDetected,
    review_proof: checks.reviewProofPresent || checks.reviewWidgetOrSchema,
    service_page_depth: checks.checkedUrls.some((url) => /\/services?/i.test(url))
  };
}

function fallbackRates(): Record<BenchmarkPatternKey, number> {
  return {
    estimate_cta: 0.82,
    oem_certifications: 0.64,
    insurance_guidance: 0.6,
    warranty_visibility: 0.52,
    location_finder: 0.81,
    review_proof: 0.7,
    service_page_depth: 0.66
  };
}

function patternLabel(key: BenchmarkPatternKey): string {
  const labels: Record<BenchmarkPatternKey, string> = {
    estimate_cta: 'Clear online estimate CTA',
    oem_certifications: 'Visible OEM/certification proof',
    insurance_guidance: 'Insurance/claim guidance',
    warranty_visibility: 'Repair warranty visibility',
    location_finder: 'Location finder and map path',
    review_proof: 'Review and social proof',
    service_page_depth: 'Depth of service pages'
  };
  return labels[key];
}

function patternImportance(key: BenchmarkPatternKey): Severity {
  if (key === 'estimate_cta' || key === 'oem_certifications' || key === 'service_page_depth') {
    return 'High';
  }
  if (key === 'insurance_guidance' || key === 'review_proof') return 'Med';
  return 'Low';
}

function buildRecommendations(patterns: NationalBenchmarkPattern[]): NationalBenchmarkRecommendation[] {
  const gaps = patterns
    .filter((p) => p.gap)
    .sort((a, b) => b.leaderRate - a.leaderRate)
    .slice(0, 3);

  const mapped = gaps.map<NationalBenchmarkRecommendation>((gap) => {
    if (gap.key === 'estimate_cta') {
      return {
        title: 'Make estimate request the main action',
        why: 'Independent leaders convert faster when estimate options are obvious on every key page.',
        action: [
          'Add one primary “Get Estimate” button in header and hero.',
          'Repeat estimate CTA on service pages and contact page.',
          'Use explicit copy like “Photo Estimate” or “Start Estimate”.'
        ],
        impact: 'High'
      };
    }
    if (gap.key === 'oem_certifications') {
      return {
        title: 'Surface certifications near the top',
        why: 'Top independent shops use certification proof to increase trust before contact.',
        action: [
          'Add OEM/I-CAR badges above the fold on homepage.',
          'Create a dedicated certifications page linked in nav.',
          'Mention certifications in service page copy.'
        ],
        impact: 'High'
      };
    }
    if (gap.key === 'service_page_depth') {
      return {
        title: 'Build deeper service coverage',
        why: 'Shops winning local searches usually have dedicated pages for each high-intent service.',
        action: [
          'Publish separate pages for collision, bumper/dent, paint, and hail repair.',
          'Add city/service combinations in headings and titles.',
          'Link pages together with clear estimate CTAs.'
        ],
        impact: 'High'
      };
    }
    return {
      title: `Close gap: ${gap.label}`,
      why: 'High-performing independent shops consistently show this trust/conversion signal.',
      action: ['Add this signal to homepage and core service pages.', 'Re-scan to verify detection.'],
      impact: gap.importance
    };
  });

  while (mapped.length < 3) {
    mapped.push({
      title: 'Tighten conversion path',
      why: 'Even strong shops win more calls by reducing friction from landing page to estimate.',
      action: [
        'Reduce clicks to estimate request.',
        'Keep trust proof near CTA buttons.',
        'Track call/form starts after changes.'
      ],
      impact: 'Med'
    });
  }

  return mapped.slice(0, 3);
}

export async function runNationalCollisionBenchmark(
  checks: ScanChecks
): Promise<NationalBenchmarkResult> {
  if (benchmarkCache && benchmarkCache.expiresAt > Date.now()) {
    return {
      ...benchmarkCache.data,
      source: 'cached'
    };
  }

  const shopHas = toShopPatternState(checks);
  const leaderUrls = await gatherIndependentLeaderUrls();
  const fetched = await Promise.all(
    leaderUrls.map(async (url) => {
      try {
        const result = await safeFetchText(url, { timeoutMs: SERP_TIMEOUT_MS });
        if (!result.ok || !result.text) return null;
        return detectSiteSignals(result.text, result.finalUrl || url);
      } catch {
        return null;
      }
    })
  );

  const leaderSites = fetched.filter((row): row is NationalBenchmarkSite => Boolean(row));
  const keyList: BenchmarkPatternKey[] = [
    'estimate_cta',
    'oem_certifications',
    'insurance_guidance',
    'warranty_visibility',
    'location_finder',
    'review_proof',
    'service_page_depth'
  ];

  const rates =
    leaderSites.length > 0
      ? keyList.reduce<Record<BenchmarkPatternKey, number>>((acc, key) => {
          const hits = leaderSites.filter((site) => site.patterns[key]).length;
          acc[key] = hits / leaderSites.length;
          return acc;
        }, {} as Record<BenchmarkPatternKey, number>)
      : fallbackRates();

  const patterns: NationalBenchmarkPattern[] = keyList.map((key) => {
    const evidenceExample =
      leaderSites.find((site) => site.evidence[key])?.evidence[key] ||
      (leaderSites[0]?.domain ? `Seen on ${leaderSites[0].domain}` : null);
    return {
      key,
      label: patternLabel(key),
      importance: patternImportance(key),
      leaderRate: rates[key],
      shopHas: shopHas[key],
      gap: !shopHas[key] && rates[key] >= 0.5,
      evidenceExample
    };
  });

  const payload: NationalBenchmarkResult = {
    source: leaderSites.length > 0 ? 'live' : 'fallback',
    scannedAt: new Date().toISOString(),
    sampleSize: leaderUrls.length,
    successfulSites: leaderSites.length,
    leaderSites,
    patterns,
    topRecommendations: buildRecommendations(patterns)
  };

  benchmarkCache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data: payload
  };

  return payload;
}
