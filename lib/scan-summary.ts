import { clamp } from '@/lib/utils';
import type { MoneyKeyword, ScanChecks, ThirtyDayPlanItem } from '@/lib/types';
import { getIssueLibrary } from '@/lib/issue-library';
import { getVerticalConfig } from '@/lib/verticals';

type DeductionRule = {
  key: string;
  bucket: 'website' | 'local' | 'intent';
  points: number;
  fail: (checks: ScanChecks) => boolean;
};

const RULES: DeductionRule[] = [
  { key: 'no_https', bucket: 'website', points: 10, fail: (checks) => !checks.https },
  { key: 'missing_title', bucket: 'website', points: 8, fail: (checks) => !checks.title },
  { key: 'weak_title_intent', bucket: 'website', points: 8, fail: (checks) => !!checks.title && !checks.titleHasCityOrService },
  { key: 'missing_meta', bucket: 'website', points: 3, fail: (checks) => !checks.metaDescription },
  { key: 'missing_h1', bucket: 'website', points: 6, fail: (checks) => !checks.h1 },
  { key: 'weak_h1_intent', bucket: 'website', points: 6, fail: (checks) => !!checks.h1 && !checks.h1HasServiceOrCity },
  { key: 'missing_nap', bucket: 'website', points: 12, fail: (checks) => !checks.napDetected },
  { key: 'missing_estimate_cta', bucket: 'website', points: 10, fail: (checks) => !checks.estimateCtaDetected },
  { key: 'poor_mobile_perf', bucket: 'website', points: 8, fail: (checks) => checks.performanceScore < 50 },
  { key: 'missing_sitemap', bucket: 'website', points: 3, fail: (checks) => !checks.sitemapFound },
  { key: 'missing_maps_link', bucket: 'local', points: 5, fail: (checks) => !checks.mapsLinkDetected },
  { key: 'missing_map_embed', bucket: 'local', points: 3, fail: (checks) => !checks.mapEmbedDetected },
  { key: 'missing_directions_reviews_cta', bucket: 'local', points: 4, fail: (checks) => !checks.directionsOrReviewsCta },
  { key: 'missing_review_signals', bucket: 'local', points: 4, fail: (checks) => !checks.reviewWidgetOrSchema },
  { key: 'no_oem_signals', bucket: 'intent', points: 8, fail: (checks) => checks.oemSignals.length === 0 },
  { key: 'no_fleet_signals', bucket: 'intent', points: 6, fail: (checks) => checks.fleetSignals.length === 0 },
  { key: 'no_insurance_signals', bucket: 'intent', points: 6, fail: (checks) => checks.insuranceSignals.length === 0 }
];

function hashKeyword(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function withKeywordMetrics(keywords: string[]): MoneyKeyword[] {
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
}

export function buildMoneyKeywords(
  city: string,
  checks: Pick<ScanChecks, 'oemSignals' | 'fleetSignals' | 'insuranceSignals' | 'estimateCtaDetected'>,
  vertical?: string | null
) {
  const cityKey = city.toLowerCase().trim();
  const cfg = getVerticalConfig(vertical);
  const picks =
    cfg.slug === 'hvac'
      ? [
          `hvac repair ${cityKey}`,
          `air conditioning repair ${cityKey}`,
          `furnace repair ${cityKey}`,
          `hvac maintenance ${cityKey}`,
          `emergency hvac service ${cityKey}`
        ]
      : cfg.slug === 'plumbing'
        ? [
            `plumber ${cityKey}`,
            `emergency plumber ${cityKey}`,
            `drain cleaning ${cityKey}`,
            `water heater repair ${cityKey}`,
            `leak detection ${cityKey}`
          ]
        : cfg.slug === 'roofing'
          ? [
              `roof repair ${cityKey}`,
              `roof replacement ${cityKey}`,
              `roofing contractor ${cityKey}`,
              `storm damage roof repair ${cityKey}`,
              `roof inspection ${cityKey}`
            ]
          : [
              `collision repair ${cityKey}`,
              `auto body shop ${cityKey}`,
              `bumper repair ${cityKey}`,
              `hail damage repair ${cityKey}`,
              `free collision estimate ${cityKey}`
            ];

  if (cfg.slug === 'collision' && checks.insuranceSignals.some((signal) => signal.includes('insurance') || signal.includes('claim'))) {
    picks.unshift(`insurance collision repair ${cityKey}`);
  }
  if (cfg.slug === 'collision' && checks.fleetSignals.some((signal) => signal.includes('sprinter') || signal.includes('transit') || signal.includes('promaster'))) {
    picks.unshift(`commercial auto body ${cityKey}`);
  }
  if (cfg.slug === 'collision' && checks.estimateCtaDetected) picks.unshift(`auto body estimate ${cityKey}`);
  if (cfg.slug === 'hvac' && checks.estimateCtaDetected) picks.unshift(`hvac replacement quote ${cityKey}`);
  if (cfg.slug === 'roofing' && checks.estimateCtaDetected) picks.unshift(`free roof inspection ${cityKey}`);
  if (cfg.slug === 'plumbing' && checks.estimateCtaDetected) picks.unshift(`same day plumber ${cityKey}`);
  if (cfg.slug === 'collision' && checks.oemSignals.some((signal) => signal.includes('subaru'))) picks.unshift(`subaru certified collision repair ${cityKey}`);
  if (cfg.slug === 'collision' && checks.oemSignals.some((signal) => signal.includes('ford'))) picks.unshift(`ford certified body shop ${cityKey}`);
  if (cfg.slug === 'collision' && checks.oemSignals.some((signal) => signal.includes('gm'))) picks.unshift(`gm certified collision repair ${cityKey}`);
  if (cfg.slug === 'collision' && checks.oemSignals.some((signal) => signal.includes('nissan'))) picks.unshift(`nissan certified collision repair ${cityKey}`);

  return withKeywordMetrics([...new Set(picks)].slice(0, 5));
}

export function buildScores(checks: ScanChecks, vertical?: string | null) {
  const issueLibrary = getIssueLibrary(vertical);
  let websiteDeduction = 0;
  let localDeduction = 0;
  let intentDeduction = 0;
  const failedKeys: string[] = [];

  for (const rule of RULES) {
    if (!rule.fail(checks)) continue;
    failedKeys.push(rule.key);
    if (rule.bucket === 'website') websiteDeduction += rule.points;
    if (rule.bucket === 'local') localDeduction += rule.points;
    if (rule.bucket === 'intent') intentDeduction += rule.points;
  }

  const website = clamp(100 - websiteDeduction, 0, 100);
  const local = clamp(100 - localDeduction, 0, 100);
  const intent = clamp(100 - intentDeduction, 0, 100);
  const total = Math.round(0.45 * website + 0.3 * local + 0.25 * intent);
  const issues = failedKeys
    .map((key) => issueLibrary[key])
    .filter(Boolean)
    .sort((a, b) => {
      const rank = { High: 0, Med: 1, Low: 2 };
      return rank[a.severity] - rank[b.severity];
    })
    .slice(0, 10);

  return { total, website, local, intent, issues, failedKeys };
}

export function buildThirtyDayPlan(city: string, issueTitles: string[], vertical?: string | null): ThirtyDayPlanItem[] {
  const cfg = getVerticalConfig(vertical);
  if (cfg.slug === 'hvac') {
    return [
      { week: 'Week 1', focus: 'Fix service-call friction', outcome: `Ship homepage title/H1, business info, and ${cfg.primaryCtaLabel.toLowerCase()} updates targeting ${city}.` },
      { week: 'Week 2', focus: 'Publish money pages', outcome: `Launch repair, replacement, maintenance, and emergency-service pages tied to ${city} intent.` },
      { week: 'Week 3', focus: 'Strengthen trust and replacement confidence', outcome: 'Make financing, maintenance plans, licensing, and equipment specialties much more visible.' },
      { week: 'Week 4', focus: 'Measure and iterate', outcome: `Track movement on top keywords and close remaining leaks: ${issueTitles.slice(0, 2).join(', ') || 'technical cleanup'}.` }
    ];
  }
  if (cfg.slug === 'plumbing') {
    return [
      { week: 'Week 1', focus: 'Fix emergency-call friction', outcome: `Ship homepage title/H1, business info, and ${cfg.primaryCtaLabel.toLowerCase()} visibility updates targeting ${city}.` },
      { week: 'Week 2', focus: 'Publish specialty pages', outcome: `Launch drain, leak, water heater, sewer, and emergency-service pages tied to ${city} intent.` },
      { week: 'Week 3', focus: 'Strengthen homeowner trust', outcome: 'Make licensing, reviews, response-time language, and specialty proof much more visible.' },
      { week: 'Week 4', focus: 'Measure and iterate', outcome: `Track movement on top keywords and close remaining leaks: ${issueTitles.slice(0, 2).join(', ') || 'technical cleanup'}.` }
    ];
  }
  if (cfg.slug === 'roofing') {
    return [
      { week: 'Week 1', focus: 'Fix inspection and call friction', outcome: `Ship homepage title/H1, business info, and ${cfg.primaryCtaLabel.toLowerCase()} visibility updates targeting ${city}.` },
      { week: 'Week 2', focus: 'Publish storm and replacement pages', outcome: `Launch repair, replacement, storm-damage, hail, and inspection pages tied to ${city} intent.` },
      { week: 'Week 3', focus: 'Strengthen trust and claim guidance', outcome: 'Make warranties, financing, project proof, and insurance-help messaging much more visible.' },
      { week: 'Week 4', focus: 'Measure and iterate', outcome: `Track movement on top keywords and close remaining leaks: ${issueTitles.slice(0, 2).join(', ') || 'technical cleanup'}.` }
    ];
  }

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
}

function summaryFallback(
  shopName: string,
  city: string,
  total: number,
  issues: Array<{ title: string; fix: string }>
) {
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
}

export async function generateAiSummary(
  shopName: string,
  city: string,
  total: number,
  issues: Array<{ title: string; why: string; fix: string }>,
  options: {
    hasLivePageSpeed: boolean;
    serpSource: 'live' | 'cached' | 'fallback';
    hasLiveKeywordMetrics: boolean;
  },
  vertical?: string | null
): Promise<{
  text: string;
  provider: 'mistral' | 'openai' | 'fallback';
  sourceConfidence: 'live' | 'modeled' | 'fallback';
}> {
  const metricsAvailability = [
    `PageSpeed metrics: ${options.hasLivePageSpeed ? 'available' : 'not measured this run'}`,
    `SERP competitor data: ${options.serpSource}`,
    `Keyword volume/CPC data: ${options.hasLiveKeywordMetrics ? 'available' : 'modeled estimates only'}`
  ].join('\n');

  const cfg = getVerticalConfig(vertical);
  const prompt = `You are a blunt local SEO strategist. Write 6-10 sentences for a ${cfg.label.toLowerCase()} scan.
Shop: ${shopName || 'Unknown'}
City: ${city}
Score: ${total}
Data availability:
${metricsAvailability}
Issues: ${issues.map((issue, index) => `${index + 1}. ${issue.title} | ${issue.why} | ${issue.fix}`).join('\n')}
Required format:
- Mention exactly 2 wins.
- Mention exactly 3 biggest leaks.
- Do not invent numeric metrics or rankings that are not explicitly provided.
- If speed metrics are unavailable, say "speed details were not measured this run."
- End with the phrase "Fastest 30-day plan".`;

  const liveConfidence =
    options.hasLivePageSpeed && options.serpSource !== 'fallback' && options.hasLiveKeywordMetrics
      ? 'live'
      : 'modeled';

  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    try {
      const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${mistralKey}`
        },
        body: JSON.stringify({
          model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
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
        cache: 'no-store'
      });

      const data = await resp.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (resp.ok && text) return { text, provider: 'mistral', sourceConfidence: liveConfidence };
    } catch {
      // continue
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

      const data = await resp.json().catch(() => null) as Record<string, unknown> | null;
      const outputText =
        typeof data?.output_text === 'string'
          ? data.output_text.trim()
          : '';

      if (resp.ok && outputText) {
        return { text: outputText, provider: 'openai', sourceConfidence: liveConfidence };
      }
    } catch {
      // continue
    }
  }

  return {
    text: summaryFallback(shopName, city, total, issues),
    provider: 'fallback',
    sourceConfidence: 'fallback'
  };
}
