import * as cheerio from 'cheerio';
import { normalizeSpace, textContainsAny } from '@/lib/utils';
import type { PageFetchMeta, ScanChecks } from '@/lib/types';
import { safeFetchText } from '@/lib/security/safe-fetch';

const UA =
  'Mozilla/5.0 (compatible; CollisionSEOScan/2.0; +https://collisionseoscan.local)';

const SERVICE_TERMS = [
  'collision',
  'body shop',
  'auto body',
  'auto repair',
  'paint',
  'hail repair',
  'dent repair'
];

const CITY_TERMS = ['denver', 'aurora', 'lakewood', 'commerce city', 'co'];
const OEM_TERMS = ['subaru', 'ford', 'gm', 'nissan', 'certified', 'oem'];
const FLEET_TERMS = ['sprinter', 'promaster', 'transit'];
const INSURANCE_TERMS = ['insurance', 'claim', 'deductible', 'rental', 'estimate'];

const phoneRegex = /\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const addressRegex =
  /\d{2,6}\s+[a-z0-9\s.,#-]+\s(?:st|street|ave|avenue|blvd|road|rd|dr|drive|ln|lane|way|ct|court|pkwy|parkway)\b/i;

type ScanCapabilities = {
  hasICar?: boolean;
  hasOEM?: boolean;
  hasAdas?: boolean;
  hasAluminum?: boolean;
};

export const hostnameOf = (input?: string) => {
  if (!input) return '';
  try {
    return new URL(input).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};

export async function timeoutFetch(url: string, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xml,application/json' },
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store'
    });
  } finally {
    clearTimeout(timer);
  }
}

export function extractSitemapUrls(xml: string, baseHost: string): string[] {
  if (!xml) return [];

  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)]
    .map((match) => normalizeSpace(match[1] || ''))
    .filter(Boolean);

  return [...new Set(matches)].filter((candidate) => {
    try {
      const parsed = new URL(candidate);
      return parsed.hostname.replace(/^www\./i, '').toLowerCase() === baseHost;
    } catch {
      return false;
    }
  });
}

export function prioritizeSitemapUrls(urls: string[], baseUrl: string) {
  const preferred = [
    /\/$/,
    /\/about/i,
    /\/contact/i,
    /\/services?/i,
    /\/estimate/i,
    /\/cert/i,
    /\/repair/i,
    /\/collision/i,
    /\/body/i,
    /\/paint/i,
    /\/hail/i,
    /\/dent/i,
    /\/faq/i,
    /\/insurance/i
  ];

  const baseHost = hostnameOf(baseUrl);
  return [...urls]
    .filter((url) => hostnameOf(url) === baseHost)
    .sort((a, b) => {
      const aPath = new URL(a).pathname || '/';
      const bPath = new URL(b).pathname || '/';
      const aRank = preferred.findIndex((pattern) => pattern.test(aPath));
      const bRank = preferred.findIndex((pattern) => pattern.test(bPath));
      const aScore = aRank === -1 ? 999 : aRank;
      const bScore = bRank === -1 ? 999 : bRank;
      if (aScore !== bScore) return aScore - bScore;
      return aPath.length - bPath.length;
    });
}

export async function fetchText(
  url: string,
  pageFetchMeta: PageFetchMeta[]
): Promise<{ text: string; ok: boolean; status: number; finalUrl: string }> {
  try {
    const fetched = await safeFetchText(url, {
      timeoutMs: 10_000,
      userAgent: UA
    });
    pageFetchMeta.push({
      url: fetched.finalUrl || url,
      status: fetched.status,
      fetchMs: fetched.durationMs,
      bytes: fetched.bytes,
      ok: fetched.ok
    });
    return {
      text: fetched.text,
      ok: fetched.ok,
      status: fetched.status,
      finalUrl: fetched.finalUrl || url
    };
  } catch {
    pageFetchMeta.push({
      url,
      status: 0,
      fetchMs: 10_000,
      bytes: 0,
      ok: false
    });
    return { text: '', ok: false, status: 0, finalUrl: url };
  }
}

function parseSchemaTypes(html: string) {
  const $ = cheerio.load(html);
  const types = new Set<string>();

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      const parsed = JSON.parse(raw);
      const walk = (value: unknown) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }
        const row = value as Record<string, unknown>;
        const type = row['@type'];
        if (typeof type === 'string') types.add(type);
        if (Array.isArray(type)) type.forEach((item) => typeof item === 'string' && types.add(item));
        Object.values(row).forEach(walk);
      };
      walk(parsed);
    } catch {
      // ignore malformed schema
    }
  });

  return [...types];
}

export async function runPerformanceHeuristic(url: string) {
  const started = Date.now();
  try {
    await timeoutFetch(url, 10000);
    const ttfb = Date.now() - started;
    if (ttfb <= 400) return 90;
    if (ttfb <= 700) return 75;
    if (ttfb <= 1000) return 60;
    if (ttfb <= 1600) return 45;
    return 30;
  } catch {
    return 30;
  }
}

export function parsePages(
  htmlByUrl: Record<string, string>,
  city: string,
  shopName: string,
  websiteUrl: string,
  capabilities?: ScanCapabilities
): ScanChecks {
  const combinedHtml = Object.values(htmlByUrl).join('\n');
  const websiteHost = hostnameOf(websiteUrl);

  const homeHtml = (() => {
    const direct =
      htmlByUrl[websiteUrl] ||
      htmlByUrl[websiteUrl.replace(/\/$/, '')] ||
      htmlByUrl[websiteUrl.endsWith('/') ? websiteUrl : `${websiteUrl}/`];
    if (direct && direct.trim().length > 0) return direct;

    const candidates = Object.entries(htmlByUrl)
      .filter(([url, html]) => {
        if (!html || !html.trim()) return false;
        try {
          const parsed = new URL(url);
          const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
          const path = parsed.pathname || '/';
          return host === websiteHost && (path === '/' || path === '');
        } catch {
          return false;
        }
      })
      .map(([, html]) => html);

    if (candidates.length > 0) {
      return candidates.sort((a, b) => b.length - a.length)[0];
    }
    return '';
  })();

  const $home = cheerio.load(homeHtml || combinedHtml || '');
  const textCombined = normalizeSpace(cheerio.load(combinedHtml)('body').text());
  const homeWordCount = normalizeSpace($home('body').text()).split(/\s+/).filter(Boolean).length;
  const title = normalizeSpace($home('title').first().text());
  const metaDescription = normalizeSpace($home('meta[name="description"]').attr('content') || '');
  const h1 = normalizeSpace($home('h1').first().text());
  const pageTextLower = textCombined.toLowerCase();
  const titleLower = title.toLowerCase();
  const h1Lower = h1.toLowerCase();
  const schemaTypes = parseSchemaTypes(combinedHtml);

  const mapsLinkDetected =
    /google\.com\/maps|g\.page|maps\.app\.goo\.gl|goo\.gl\/maps|placeid|google\.com\/search\?[^"']*tbm=lcl/i.test(
      combinedHtml
    );
  const mapEmbedDetected =
    /<iframe[^>]+google\.com\/maps|maps\/embed|google\.maps|data-lat=|data-lng=|mapbox|leaflet|staticmap/i.test(
      combinedHtml
    );
  const directionsOrReviewsCta = /directions|get directions|reviews|read reviews/i.test(combinedHtml);

  const napDetected =
    phoneRegex.test(textCombined) &&
    (addressRegex.test(textCombined) || pageTextLower.includes(city.toLowerCase())) &&
    (shopName ? pageTextLower.includes(shopName.toLowerCase()) : true);

  const actionText = normalizeSpace(
    cheerio
      .load(combinedHtml)('a,button')
      .map((_, el) => cheerio.load(el).text())
      .get()
      .join(' ')
  );

  const estimateCtaDetected = /estimate|quote|free estimate|photo estimate/i.test(actionText);
  const reviewWidgetOrSchema =
    /reviews?|rating|stars?/i.test(combinedHtml) || schemaTypes.some((type) => /AggregateRating|Review/i.test(type));
  const onlineEstimateFlow = /photo estimate|start estimate|book estimate|request estimate|online estimate/i.test(
    actionText
  );
  const locationFinderPresent = /find a location|locations|find a shop|near you/i.test(
    normalizeSpace(cheerio.load(combinedHtml)('a,nav').text())
  );
  const warrantyMentioned = /warranty|lifetime guarantee|guarantee/i.test(pageTextLower);
  const insuranceGuidancePresent = /insurance claim|we work with insurance|claim support|deductible/i.test(
    pageTextLower
  );
  const adasMentioned = /adas|calibration|pre-scan|post-scan|scanning/i.test(pageTextLower);
  const reviewProofPresent = /google reviews|testimonials|customer reviews|4\.\d\s*stars?/i.test(pageTextLower);

  const oemSignals = OEM_TERMS.filter((term) => pageTextLower.includes(term));
  const fleetSignals = FLEET_TERMS.filter((term) => pageTextLower.includes(term));
  const insuranceSignals = INSURANCE_TERMS.filter((term) => pageTextLower.includes(term));

  if (capabilities?.hasOEM) oemSignals.push('oem');
  if (capabilities?.hasICar) oemSignals.push('i-car');
  if (capabilities?.hasAdas) insuranceSignals.push('adas');
  if (capabilities?.hasAluminum) fleetSignals.push('aluminum');

  return {
    checkedUrls: Object.keys(htmlByUrl),
    https: /^https:\/\//i.test(websiteUrl),
    title,
    titleHasCityOrService:
      textContainsAny(titleLower, SERVICE_TERMS) ||
      titleLower.includes(city.toLowerCase()) ||
      textContainsAny(titleLower, CITY_TERMS),
    metaDescription,
    h1,
    h1HasServiceOrCity:
      textContainsAny(h1Lower, SERVICE_TERMS) ||
      h1Lower.includes(city.toLowerCase()) ||
      textContainsAny(h1Lower, CITY_TERMS),
    napDetected,
    estimateCtaDetected,
    performanceScore: 0,
    performanceMethod: 'ttfb-heuristic',
    sitemapFound: false,
    mapsLinkDetected,
    mapEmbedDetected,
    directionsOrReviewsCta,
    reviewWidgetOrSchema,
    oemSignals: [...new Set(oemSignals)],
    fleetSignals: [...new Set(fleetSignals)],
    insuranceSignals: [...new Set(insuranceSignals)],
    schemaTypes,
    fetchNotes: [],
    homeWordCount,
    onlineEstimateFlow,
    locationFinderPresent,
    warrantyMentioned,
    insuranceGuidancePresent,
    adasMentioned,
    reviewProofPresent
  };
}
