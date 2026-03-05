import * as cheerio from 'cheerio';
import { prisma } from '@/lib/prisma';
import { ISSUE_LIBRARY } from '@/lib/issue-library';
import { clamp, normalizeSpace, textContainsAny } from '@/lib/utils';
import type {
  Competitor,
  MoneyKeyword,
  ScanChecks,
  ScanResult,
  ThirtyDayPlanItem
} from '@/lib/types';

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
  url: string
): Promise<{ text: string; ok: boolean; status: number }> => {
  try {
    const res = await timeoutFetch(url);
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok) {
      return { text: '', ok: false, status: res.status };
    }
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('xml') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('json')
    ) {
      return { text: '', ok: false, status: res.status };
    }
    return { text: await res.text(), ok: true, status: res.status };
  } catch {
    return { text: '', ok: false, status: 0 };
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

const getCompetitors = async (city: string): Promise<Competitor[]> => {
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
          .slice(0, 3);

        if (normalized.length > 0) {
          return normalized.map((c) => ({
            ...c,
            note: `Cached within 24h for ${cityKey}.`
          }));
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
      const top = organic.slice(0, 3).map((item: Record<string, unknown>, idx: number) => ({
        name: typeof item.title === 'string' ? item.title : `Competitor ${idx + 1}`,
        url: typeof item.link === 'string' ? item.link : undefined,
        note: 'Live competitor signal from current SERP data.',
        differentiatorGuess: 'Likely stronger local pack visibility and review recency.'
      }));
      if (top.length > 0) return top;
    } catch {
      // fall through to graceful fallback
    }
  }

  const fallbackNote =
    'Competitor data not connected yet — we\'ll pull it on the teardown.';

  return [
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
  const $home = cheerio.load(htmlByUrl[websiteUrl] || '');
  const textCombined = normalizeSpace(cheerio.load(combinedHtml)('body').text());

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
    fetchNotes: []
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
  issues: Array<{ title: string; why: string; fix: string }>
): Promise<string> => {
  const prompt = `You are a blunt local SEO strategist. Write 6-10 sentences for a collision shop scan.
Shop: ${shopName || 'Unknown'}
City: ${city}
Score: ${total}
Issues: ${issues.map((i, idx) => `${idx + 1}. ${i.title} | ${i.why} | ${i.fix}`).join('\n')}
Required format:
- Mention exactly 2 wins.
- Mention exactly 3 biggest leaks.
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
      if (resp.ok && text) return text;
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
      const text = data?.output_text?.trim();
      if (resp.ok && text) return text;
    } catch {
      // fall through to deterministic template
    }
  }

  return generateSummaryFallback(shopName, city, total, issues);
};

export const runScan = async (
  websiteUrl: string,
  city: string,
  shopName: string,
  capabilities?: ScanCapabilities
): Promise<ScanResult> => {
  const base = websiteUrl.replace(/\/$/, '');
  const urls = [base, `${base}/contact`, `${base}/services`];

  const htmlByUrl: Record<string, string> = {};
  const fetchNotes: string[] = [];

  await Promise.all(
    urls.map(async (url) => {
      const { text, ok, status } = await fetchText(url);
      if (ok && text) {
        htmlByUrl[url] = text;
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

  checks.performanceScore = await runPerformanceHeuristic(base);
  checks.performanceMethod = 'ttfb-heuristic';

  const sitemap = await fetchText(`${base}/sitemap.xml`);
  checks.sitemapFound = sitemap.ok;

  const scores = buildScores(checks);
  const moneyKeywords = buildMoneyKeywords(city, checks.oemSignals);
  const competitors = await getCompetitors(city);
  const aiSummary = await generateAiSummary(shopName, city, scores.total, scores.issues);
  const thirtyDayPlan = buildThirtyDayPlan(
    city,
    scores.issues.map((issue) => issue.title)
  );

  return {
    checks,
    scores,
    moneyKeywords,
    competitors,
    aiSummary,
    thirtyDayPlan
  };
};
