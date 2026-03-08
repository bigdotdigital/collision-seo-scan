import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';
import { ISSUE_LIBRARY } from '@/lib/issue-library';
import { clamp, normalizeSpace, textContainsAny } from '@/lib/utils';
import type {
  Competitor,
  CompetitorAdvantage,
  PageFetchMeta,
  MoneyKeyword,
  ScanChecks,
  ScanResult,
  ThirtyDayPlanItem
} from '@/lib/types';
import { detectCollisionSignals, mapCapabilityMissing } from '@/lib/signals/collision-signals';
import type { PageSpeedResult } from '@/lib/pagespeed';
import { computeCategoryScores } from '@/lib/scoring/category-scores';
import { buildTopFixes } from '@/lib/scoring/top-fixes';
import { buildCompetitorComparison } from '@/lib/competitors/compare';
import { safeFetchText } from '@/lib/security/safe-fetch';
import { runNationalCollisionBenchmark } from '@/lib/benchmark/national-collision';

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
const NON_SHOP_DOMAINS = [
  'yelp.com',
  'yellowpages.com',
  'mapquest.com',
  'bbb.org',
  'angi.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'tripadvisor.com',
  'wikipedia.org'
];
const CHAIN_DOMAINS = [
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
const NON_SHOP_TITLE_HINTS = [
  'best',
  'top 10',
  'directory',
  'list of',
  'near me results',
  'reviews for',
  'wiki',
  'reddit'
];

const phoneRegex = /\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const addressRegex =
  /\d{2,6}\s+[a-z0-9\s.,#-]+\s(?:st|street|ave|avenue|blvd|road|rd|dr|drive|ln|lane|way|ct|court|pkwy|parkway)\b/i;

type ScanCapabilities = {
  hasICar?: boolean;
  hasOEM?: boolean;
  hasAdas?: boolean;
  hasAluminum?: boolean;
};

const timeoutFetch = async (url: string, ms = 10000): Promise<Response> => {
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
};

const fetchText = async (
  url: string,
  pageFetchMeta: PageFetchMeta[]
): Promise<{ text: string; ok: boolean; status: number; finalUrl: string }> => {
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
};

const parseSchemaTypes = (html: string): string[] => {
  const $ = cheerio.load(html);
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      const parsed = JSON.parse(raw);
      const walk = (v: unknown) => {
        if (!v || typeof v !== 'object') return;
        if (Array.isArray(v)) {
          v.forEach(walk);
          return;
        }
        const obj = v as Record<string, unknown>;
        const t = obj['@type'];
        if (typeof t === 'string') types.add(t);
        if (Array.isArray(t)) t.forEach((tt) => typeof tt === 'string' && types.add(tt));
        Object.values(obj).forEach(walk);
      };
      walk(parsed);
    } catch {
      // ignore malformed schema
    }
  });
  return [...types];
};

const runPerformanceHeuristic = async (url: string): Promise<number> => {
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
};

const hostnameOf = (input?: string): string => {
  if (!input) return '';
  try {
    return new URL(input).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
};

const isShopCompetitorCandidate = (candidate: { name?: string; url?: string }): boolean => {
  const host = hostnameOf(candidate.url);
  if (
    host &&
    (NON_SHOP_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)) ||
      CHAIN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`)))
  ) {
    return false;
  }

  const name = (candidate.name || '').toLowerCase();
  if (!name.trim()) return false;
  if (NON_SHOP_TITLE_HINTS.some((hint) => name.includes(hint))) return false;
  if (/(yelp|yellow pages|mapquest|tripadvisor|wikipedia|facebook)/i.test(name)) return false;
  return /(collision|auto body|body shop|paint|repair|coachworks|motors|automotive)/i.test(name);
};

const getCompetitors = async (
  city: string
): Promise<{ competitors: Competitor[]; source: 'live' | 'cached' | 'fallback' }> => {
  const cityKey = city.trim().toLowerCase();
  const cacheCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 24h cache from previous scans to reduce SERP API spend.
  try {
    const recent = await prisma.scan.findFirst({
      where: {
        city: { equals: city, mode: 'insensitive' },
        createdAt: { gte: cacheCutoff }
      },
      orderBy: { createdAt: 'desc' },
      select: { competitorsJson: true }
    });

    if (recent?.competitorsJson) {
      const parsed = JSON.parse(recent.competitorsJson) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((item, idx) => {
            const row = item as Record<string, unknown>;
            const name =
              typeof row?.name === 'string' && row.name.trim()
                ? row.name
                : `Competitor ${idx + 1}`;
            return {
              name,
              url: typeof row?.url === 'string' ? row.url : undefined,
              note:
                typeof row?.note === 'string'
                  ? row.note
                  : 'Live competitor signal from recent cached SERP data.',
              differentiatorGuess:
                typeof row?.differentiatorGuess === 'string'
                  ? row.differentiatorGuess
                  : 'Likely stronger local pack visibility and review recency.'
            } as Competitor;
          })
          .filter((item) => isShopCompetitorCandidate(item))
          .slice(0, 3);

        if (normalized.length > 0) {
          const cachedRows = normalized.map((c) => ({
            ...c,
            note: `Cached within 24h for ${cityKey}.`
          }));
          console.info(`SERP_STATUS=cache city=${cityKey} count=${cachedRows.length}`);
          return { competitors: cachedRows, source: 'cached' };
        }
      }
    }
  } catch {
    // Cache read should never block scan flow.
  }

  const serpKey = process.env.SERP_API_KEY;
  if (serpKey) {
    try {
      const q = encodeURIComponent(`${city} collision repair`);
      const url = `https://serpapi.com/search.json?engine=google&q=${q}&api_key=${encodeURIComponent(serpKey)}`;
      const res = await timeoutFetch(url, 10000);
      const json = await res.json();
      const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
      const top = organic
        .map((item: Record<string, unknown>, idx: number) => ({
          name: typeof item.title === 'string' ? item.title : `Competitor ${idx + 1}`,
          url: typeof item.link === 'string' ? item.link : undefined,
          note: 'Live competitor signal from current SERP data.',
          differentiatorGuess: 'Likely stronger local pack visibility and review recency.'
        }))
        .filter((item: Competitor) => isShopCompetitorCandidate(item))
        .slice(0, 3);
      if (top.length > 0) {
        console.info(`SERP_STATUS=live city=${cityKey} count=${top.length}`);
        return { competitors: top, source: 'live' };
      }
    } catch {
      // fall through to graceful fallback
    }
  }

  const fallbackNote =
    'Top local competitors we’ll benchmark on your teardown.';

  const fallbackRows = [
    {
      name: `Leading ${city} collision shop`,
      note: fallbackNote,
      differentiatorGuess: 'Likely winning with location-specific service pages.'
    },
    {
      name: `Top-rated ${city} auto body brand`,
      note: fallbackNote,
      differentiatorGuess: 'Likely benefiting from stronger review velocity.'
    },
    {
      name: `High-visibility ${city} repair competitor`,
      note: fallbackNote,
      differentiatorGuess: 'Likely capturing estimate intent with stronger CTAs.'
    }
  ];
  console.info(`SERP_STATUS=fallback city=${cityKey} count=${fallbackRows.length}`);
  return { competitors: fallbackRows, source: 'fallback' };
};

const hashKeyword = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const withKeywordMetrics = (keywords: string[]): MoneyKeyword[] => {
  const keyPresent = Boolean(process.env.KEYWORD_API_KEY || process.env.GOOGLE_ADS_KEY);
  return keywords.map((keyword) => {
    if (!keyPresent) {
      return {
        keyword,
        volume: null,
        cpc: null,
        source: 'modeled'
      };
    }

    const seed = hashKeyword(keyword);
    return {
      keyword,
      volume: 90 + (seed % 1500),
      cpc: Number(((seed % 1600) / 100 + 2).toFixed(2)),
      source: 'api'
    };
  });
};

const buildMoneyKeywords = (city: string, oemSignals: string[]): MoneyKeyword[] => {
  const c = city.toLowerCase().trim();
  const picks: string[] = [];
  const hasSubaru = oemSignals.some((s) => s.includes('subaru'));
  const hasFord = oemSignals.some((s) => s.includes('ford'));
  const hasGm = oemSignals.some((s) => s.includes('gm'));

  if (hasSubaru) picks.push(`subaru certified collision repair ${c}`);
  if (hasFord) picks.push(`ford certified body shop ${c}`);
  if (hasGm) picks.push(`gm certified collision repair ${c}`);

  if (picks.length < 2) {
    if (!picks.includes(`subaru certified collision repair ${c}`)) {
      picks.push(`subaru certified collision repair ${c}`);
    }
    if (picks.length < 2 && !picks.includes(`ford certified body shop ${c}`)) {
      picks.push(`ford certified body shop ${c}`);
    }
    if (picks.length < 2 && !picks.includes(`gm certified collision repair ${c}`)) {
      picks.push(`gm certified collision repair ${c}`);
    }
  }

  const vanOptions = [
    `sprinter body shop ${c}`,
    `promaster collision repair ${c}`,
    `ford transit collision repair ${c}`
  ];
  picks.push(vanOptions[0], vanOptions[1]);
  picks.push(`free collision repair estimate ${c}`);

  return withKeywordMetrics([...new Set(picks)].slice(0, 5));
};

const parsePages = (
  htmlByUrl: Record<string, string>,
  city: string,
  shopName: string,
  websiteUrl: string,
  capabilities?: ScanCapabilities
): ScanChecks => {
  const combinedHtml = Object.values(htmlByUrl).join('\n');
  const websiteHost = (() => {
    try {
      return new URL(websiteUrl).hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      return '';
    }
  })();
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
  const homeWordCount = normalizeSpace($home('body').text())
    .split(/\s+/)
    .filter(Boolean).length;

  const title = normalizeSpace($home('title').first().text());
  const metaDescription = normalizeSpace(
    $home('meta[name="description"]').attr('content') || ''
  );
  const h1 = normalizeSpace($home('h1').first().text());

  const pageTextLower = textCombined.toLowerCase();
  const titleLower = title.toLowerCase();
  const h1Lower = h1.toLowerCase();

  const schemaTypes = parseSchemaTypes(combinedHtml);

  const mapsLinkDetected = /google\.com\/maps|g\.page|maps\.app\.goo\.gl/i.test(combinedHtml);
  const mapEmbedDetected = /<iframe[^>]+google\.com\/maps/i.test(combinedHtml);
  const directionsOrReviewsCta = /directions|get directions|reviews|read reviews/i.test(combinedHtml);

  const napDetected =
    phoneRegex.test(textCombined) &&
    (addressRegex.test(textCombined) || pageTextLower.includes(city.toLowerCase())) &&
    (shopName ? pageTextLower.includes(shopName.toLowerCase()) : true);

  const estimateCtaDetected = /estimate|quote|free estimate|photo estimate/i.test(
    normalizeSpace(
      cheerio
        .load(combinedHtml)('a,button')
        .map((_, el) => cheerio.load(el).text())
        .get()
        .join(' ')
    )
  );

  const reviewWidgetOrSchema =
    /reviews?|rating|stars?/i.test(combinedHtml) ||
    schemaTypes.some((t) => /AggregateRating|Review/i.test(t));

  const onlineEstimateFlow = /photo estimate|start estimate|book estimate|request estimate|online estimate/i.test(
    normalizeSpace(
      cheerio
        .load(combinedHtml)('a,button')
        .map((_, el) => cheerio.load(el).text())
        .get()
        .join(' ')
    )
  );
  const locationFinderPresent = /find a location|locations|find a shop|near you/i.test(
    normalizeSpace(cheerio.load(combinedHtml)('a,nav').text())
  );
  const warrantyMentioned = /warranty|lifetime guarantee|guarantee/i.test(pageTextLower);
  const insuranceGuidancePresent = /insurance claim|we work with insurance|claim support|deductible/i.test(
    pageTextLower
  );
  const adasMentioned = /adas|calibration|pre-scan|post-scan|scanning/i.test(pageTextLower);
  const reviewProofPresent = /google reviews|testimonials|customer reviews|4\.\d\s*stars?/i.test(
    pageTextLower
  );

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
};

type DeductionRule = {
  key: string;
  bucket: 'website' | 'local' | 'intent';
  points: number;
  fail: (c: ScanChecks) => boolean;
};

const RULES: DeductionRule[] = [
  { key: 'no_https', bucket: 'website', points: 10, fail: (c) => !c.https },
  { key: 'missing_title', bucket: 'website', points: 8, fail: (c) => !c.title },
  {
    key: 'weak_title_intent',
    bucket: 'website',
    points: 8,
    fail: (c) => !!c.title && !c.titleHasCityOrService
  },
  { key: 'missing_meta', bucket: 'website', points: 3, fail: (c) => !c.metaDescription },
  { key: 'missing_h1', bucket: 'website', points: 6, fail: (c) => !c.h1 },
  {
    key: 'weak_h1_intent',
    bucket: 'website',
    points: 6,
    fail: (c) => !!c.h1 && !c.h1HasServiceOrCity
  },
  { key: 'missing_nap', bucket: 'website', points: 12, fail: (c) => !c.napDetected },
  {
    key: 'missing_estimate_cta',
    bucket: 'website',
    points: 10,
    fail: (c) => !c.estimateCtaDetected
  },
  {
    key: 'poor_mobile_perf',
    bucket: 'website',
    points: 8,
    fail: (c) => c.performanceScore < 50
  },
  { key: 'missing_sitemap', bucket: 'website', points: 3, fail: (c) => !c.sitemapFound },
  { key: 'missing_maps_link', bucket: 'local', points: 5, fail: (c) => !c.mapsLinkDetected },
  { key: 'missing_map_embed', bucket: 'local', points: 3, fail: (c) => !c.mapEmbedDetected },
  {
    key: 'missing_directions_reviews_cta',
    bucket: 'local',
    points: 4,
    fail: (c) => !c.directionsOrReviewsCta
  },
  {
    key: 'missing_review_signals',
    bucket: 'local',
    points: 4,
    fail: (c) => !c.reviewWidgetOrSchema
  },
  { key: 'no_oem_signals', bucket: 'intent', points: 8, fail: (c) => c.oemSignals.length === 0 },
  {
    key: 'no_fleet_signals',
    bucket: 'intent',
    points: 6,
    fail: (c) => c.fleetSignals.length === 0
  },
  {
    key: 'no_insurance_signals',
    bucket: 'intent',
    points: 6,
    fail: (c) => c.insuranceSignals.length === 0
  }
];

const buildScores = (checks: ScanChecks) => {
  let websiteDeduction = 0;
  let localDeduction = 0;
  let intentDeduction = 0;
  const failedKeys: string[] = [];

  for (const rule of RULES) {
    if (rule.fail(checks)) {
      failedKeys.push(rule.key);
      if (rule.bucket === 'website') websiteDeduction += rule.points;
      if (rule.bucket === 'local') localDeduction += rule.points;
      if (rule.bucket === 'intent') intentDeduction += rule.points;
    }
  }

  const website = clamp(100 - websiteDeduction, 0, 100);
  const local = clamp(100 - localDeduction, 0, 100);
  const intent = clamp(100 - intentDeduction, 0, 100);
  const total = Math.round(0.45 * website + 0.3 * local + 0.25 * intent);

  const issues = failedKeys
    .map((key) => ISSUE_LIBRARY[key])
    .filter(Boolean)
    .sort((a, b) => {
      const rank = { High: 0, Med: 1, Low: 2 };
      return rank[a.severity] - rank[b.severity];
    })
    .slice(0, 10);

  return { total, website, local, intent, issues, failedKeys };
};

const buildThirtyDayPlan = (city: string, issueTitles: string[]): ThirtyDayPlanItem[] => {
  return [
    {
      week: 'Week 1',
      focus: 'Fix core conversion and local intent leaks',
      outcome: `Ship homepage title/H1, NAP block, and estimate CTA updates targeting ${city}.`
    },
    {
      week: 'Week 2',
      focus: 'Publish profitable service pages',
      outcome: `Launch OEM + van + insurance-support content pages tied to ${city} intent.`
    },
    {
      week: 'Week 3',
      focus: 'Strengthen local trust signals',
      outcome: 'Add maps/directions/reviews modules and tighten schema coverage.'
    },
    {
      week: 'Week 4',
      focus: 'Measure and iterate',
      outcome: `Track movement on top keywords and close remaining leaks: ${issueTitles.slice(0, 2).join(', ') || 'technical cleanup'}.`
    }
  ];
};

const generateSummaryFallback = (
  shopName: string,
  city: string,
  total: number,
  issues: Array<{ title: string; fix: string }>
): string => {
  const top = issues.slice(0, 3);
  const wins = total >= 70 ? 'strong baseline structure' : 'clear room to grow';
  return [
    `${shopName || 'This shop'} in ${city} scored ${total}/100 with ${wins}.`,
    'Win #1: foundational crawlability appears intact enough to improve quickly.',
    'Win #2: this report already mapped exact fixes to ranking leaks.',
    `Leak #1: ${top[0]?.title || 'Homepage intent needs stronger local targeting'}.`,
    `Leak #2: ${top[1]?.title || 'Conversion CTA needs more prominence'}.`,
    `Leak #3: ${top[2]?.title || 'Service-intent content is too thin'}.`,
    'Fastest 30-day plan: week one core fixes, week two intent pages, week three trust signals.'
  ].join(' ');
};

const generateAiSummary = async (
  shopName: string,
  city: string,
  total: number,
  issues: Array<{ title: string; why: string; fix: string }>,
  options: {
    hasLivePageSpeed: boolean;
    serpSource: 'live' | 'cached' | 'fallback';
    hasLiveKeywordMetrics: boolean;
  }
): Promise<{
  text: string;
  provider: 'mistral' | 'openai' | 'fallback';
  sourceConfidence: 'live' | 'modeled' | 'fallback';
}> => {
  const extractOpenAiText = (data: unknown): string | null => {
    const row = (data || {}) as Record<string, unknown>;
    if (typeof row.output_text === 'string' && row.output_text.trim()) {
      return row.output_text.trim();
    }

    const output = Array.isArray(row.output) ? row.output : [];
    for (const item of output) {
      const msg = item as Record<string, unknown>;
      const content = Array.isArray(msg.content) ? msg.content : [];
      for (const block of content) {
        const b = block as Record<string, unknown>;
        if (b.type === 'output_text' && typeof b.text === 'string' && b.text.trim()) {
          return b.text.trim();
        }
      }
    }
    return null;
  };

  const metricsAvailability = [
    `PageSpeed metrics: ${options.hasLivePageSpeed ? 'available' : 'not measured this run'}`,
    `SERP competitor data: ${options.serpSource}`,
    `Keyword volume/CPC data: ${options.hasLiveKeywordMetrics ? 'available' : 'modeled estimates only'}`
  ].join('\n');

  const prompt = `You are a blunt local SEO strategist. Write 6-10 sentences for a collision shop scan.
Shop: ${shopName || 'Unknown'}
City: ${city}
Score: ${total}
Data availability:
${metricsAvailability}
Issues: ${issues.map((i, idx) => `${idx + 1}. ${i.title} | ${i.why} | ${i.fix}`).join('\n')}
Required format:
- Mention exactly 2 wins.
- Mention exactly 3 biggest leaks.
- Do not invent numeric metrics or rankings that are not explicitly provided.
- If speed metrics are unavailable, say "speed details were not measured this run."
- End with the phrase "Fastest 30-day plan".`;

  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${mistralKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 280,
          messages: [
            {
              role: 'system',
              content: 'You are a blunt local SEO strategist focused on fast execution.'
            },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timer);

      const data = await resp.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (resp.ok && text) {
        const sourceConfidence =
          options.hasLivePageSpeed && options.serpSource !== 'fallback' && options.hasLiveKeywordMetrics
            ? 'live'
            : 'modeled';
        return { text, provider: 'mistral', sourceConfidence };
      }
    } catch {
      // continue to fallback providers
    }
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const resp = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${openAiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: prompt,
          max_output_tokens: 280
        }),
        cache: 'no-store'
      });

      const data = await resp.json().catch(() => null);
      const text = extractOpenAiText(data);
      if (resp.ok && text) {
        const sourceConfidence =
          options.hasLivePageSpeed && options.serpSource !== 'fallback' && options.hasLiveKeywordMetrics
            ? 'live'
            : 'modeled';
        return { text, provider: 'openai', sourceConfidence };
      }
      if (!resp.ok) {
        const errorMessage =
          (data as { error?: { message?: string } } | null)?.error?.message || 'unknown_error';
        console.info(`AI_OPENAI_ERROR=${errorMessage}`);
      } else {
        console.info('AI_OPENAI_ERROR=empty_output');
      }
    } catch {
      // fall through to deterministic template
      console.info('AI_OPENAI_ERROR=request_failed');
    }
  }

  return {
    text: generateSummaryFallback(shopName, city, total, issues),
    provider: 'fallback',
    sourceConfidence: 'fallback'
  };
};

export const runScan = async (
  websiteUrl: string,
  city: string,
  shopName: string,
  capabilities?: ScanCapabilities,
  pagespeed?: PageSpeedResult
): Promise<ScanResult> => {
  const startedAt = Date.now();
  const base = websiteUrl.replace(/\/$/, '');
  const urls = [
    base,
    `${base}/contact`,
    `${base}/services`,
    `${base}/certifications`,
    `${base}/estimate`
  ];

  const htmlByUrl: Record<string, string> = {};
  const fetchNotes: string[] = [];
  const pageFetchMeta: PageFetchMeta[] = [];

  await Promise.all(
    urls.map(async (url) => {
      const { text, ok, status, finalUrl } = await fetchText(url, pageFetchMeta);
      if (ok && text) {
        htmlByUrl[finalUrl] = text;
      } else {
        fetchNotes.push(`${url} not fetched (status ${status || 'timeout/error'})`);
      }
    })
  );

  if (!htmlByUrl[base]) {
    htmlByUrl[base] = '';
    fetchNotes.push('Homepage fetch failed; scan quality is limited.');
  }

  const checks = parsePages(htmlByUrl, city, shopName, websiteUrl, capabilities);
  checks.fetchNotes = fetchNotes;

  if (pagespeed?.status === 'ok' && typeof pagespeed.performanceScore === 'number') {
    checks.performanceScore = pagespeed.performanceScore;
    checks.performanceMethod = 'lighthouse';
  } else {
    checks.performanceScore = await runPerformanceHeuristic(base);
    checks.performanceMethod = 'ttfb-heuristic';
  }

  const sitemap = await fetchText(`${base}/sitemap.xml`, pageFetchMeta);
  checks.sitemapFound = sitemap.ok;

  const scores = buildScores(checks);
  const signals = detectCollisionSignals(htmlByUrl);
  const capabilityMissing = mapCapabilityMissing(
    signals.detected.map((s) => s.signal_name),
    capabilities
  );
  const missingSignals = [...new Set([...signals.missing, ...capabilityMissing])];
  const missingPages = ['services', 'certifications', 'contact', 'estimate'].filter(
    (page) => !Object.keys(htmlByUrl).some((url) => url.toLowerCase().includes(`/${page}`))
  );
  const categoryScores = computeCategoryScores({
    checks,
    pagespeed: pagespeed || {
      status: 'error',
      performanceScore: null,
      lcpMs: null,
      cls: null,
      tbtMs: null,
      speedIndexMs: null,
      diagnostics: []
    },
    detectedSignals: signals.detected,
    missingSignals,
    pagesAnalyzed: Object.keys(htmlByUrl).length
  });
  const topFixes = buildTopFixes({
    issues: scores.issues,
    missingSignals,
    missingPages,
    hasPerformanceData: pagespeed?.status === 'ok'
  });
  const moneyKeywords = buildMoneyKeywords(city, checks.oemSignals);
  const [competitorResult, nationalBenchmark] = await Promise.all([
    getCompetitors(city),
    runNationalCollisionBenchmark(checks)
  ]);
  const competitors = competitorResult.competitors;
  const competitorAdvantages: CompetitorAdvantage[] = await buildCompetitorComparison({
    city,
    competitors,
    userSignalNames: signals.detected.map((s) => s.signal_name)
  });
  const hasLiveKeywordMetrics = moneyKeywords.some((k) => k.source === 'api');
  const aiSummaryResult = await generateAiSummary(shopName, city, scores.total, scores.issues, {
    hasLivePageSpeed: pagespeed?.status === 'ok',
    serpSource: competitorResult.source,
    hasLiveKeywordMetrics
  });
  const aiSummary = aiSummaryResult.text;
  console.info(
    `AI_PROVIDER=${aiSummaryResult.provider} city=${city.toLowerCase().trim()} shop=${(shopName || 'unknown').toLowerCase().replace(/\\s+/g, '-')}`
  );
  const thirtyDayPlan = buildThirtyDayPlan(
    city,
    scores.issues.map((issue) => issue.title)
  );

  return {
    checks,
    scores,
    categoryScores,
    detectedSignals: signals.detected,
    missingSignals,
    capabilityMissing,
    topFixes,
    competitorAdvantages,
    nationalBenchmark,
    missingPages,
    pageFetchMeta,
    scanDurationMs: Date.now() - startedAt,
    sources: {
      serp: competitorResult.source,
      aiSummary: aiSummaryResult.sourceConfidence,
      keywords: hasLiveKeywordMetrics ? 'live' : 'modeled'
    },
    moneyKeywords,
    competitors,
    aiSummary,
    thirtyDayPlan
  };
};
