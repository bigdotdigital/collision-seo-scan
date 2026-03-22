import { mapCapabilityMissing } from '@/lib/signals/collision-signals';
import { detectVerticalSignals } from '@/lib/signals/vertical-signals';
import type { PageSpeedResult } from '@/lib/pagespeed';
import { computeCategoryScores } from '@/lib/scoring/category-scores';
import { buildTopFixes } from '@/lib/scoring/top-fixes';
import { buildCompetitorComparison } from '@/lib/competitors/compare';
import { runNationalCollisionBenchmark } from '@/lib/benchmark/national-collision';
import type { PageFetchMeta, ScanResult } from '@/lib/types';
import { extractInsuranceRelationshipSignals } from '@/lib/insurance-signals';
import { getVerticalConfig } from '@/lib/verticals';
import {
  extractSitemapUrls,
  fetchText,
  hostnameOf,
  parsePages,
  prioritizeSitemapUrls,
  runPerformanceHeuristic
} from '@/lib/scan-pages';
import { getCompetitors, getMapPack } from '@/lib/scan-market';
import {
  buildMoneyKeywords,
  buildScores,
  buildThirtyDayPlan,
  generateAiSummary
} from '@/lib/scan-summary';

type ScanCapabilities = {
  hasICar?: boolean;
  hasOEM?: boolean;
  hasAdas?: boolean;
  hasAluminum?: boolean;
};

type LoadedPages = {
  htmlByUrl: Record<string, string>;
  fetchNotes: string[];
  pageFetchMeta: PageFetchMeta[];
  sitemapOk: boolean;
};

async function loadPages(websiteUrl: string): Promise<LoadedPages> {
  const base = websiteUrl.replace(/\/$/, '');
  const coreUrls = [base, `${base}/contact`, `${base}/services`, `${base}/certifications`, `${base}/estimate`];
  const htmlByUrl: Record<string, string> = {};
  const fetchNotes: string[] = [];
  const pageFetchMeta: PageFetchMeta[] = [];

  await Promise.all(
    coreUrls.map(async (url) => {
      const page = await fetchText(url, pageFetchMeta);
      if (page.ok && page.text) {
        htmlByUrl[page.finalUrl] = page.text;
      } else {
        fetchNotes.push(`${url} not fetched (status ${page.status || 'timeout/error'})`);
      }
    })
  );

  const sitemap = await fetchText(`${base}/sitemap.xml`, pageFetchMeta);
  const sitemapUrls = sitemap.ok ? extractSitemapUrls(sitemap.text, hostnameOf(base)) : [];
  const extraUrls = prioritizeSitemapUrls(sitemapUrls, websiteUrl)
    .filter((url) => !coreUrls.includes(url))
    .slice(0, 8);

  await Promise.all(
    extraUrls.map(async (url) => {
      const page = await fetchText(url, pageFetchMeta);
      if (page.ok && page.text) {
        htmlByUrl[page.finalUrl] = page.text;
      } else {
        fetchNotes.push(`${url} not fetched (status ${page.status || 'timeout/error'})`);
      }
    })
  );

  if (!htmlByUrl[base]) {
    htmlByUrl[base] = '';
    fetchNotes.push('Homepage fetch failed; scan quality is limited.');
  }

  return {
    htmlByUrl,
    fetchNotes,
    pageFetchMeta,
    sitemapOk: sitemap.ok
  };
}

function performanceInput(pagespeed?: PageSpeedResult): PageSpeedResult {
  return (
    pagespeed || {
      status: 'error',
      performanceScore: null,
      lcpMs: null,
      cls: null,
      tbtMs: null,
      speedIndexMs: null,
      diagnostics: []
    }
  );
}

export async function runScan(
  websiteUrl: string,
  city: string,
  shopName: string,
  capabilities?: ScanCapabilities,
  pagespeed?: PageSpeedResult,
  vertical?: string | null
): Promise<ScanResult> {
  const startedAt = Date.now();
  const verticalSlug = getVerticalConfig(vertical).slug;
  const loaded = await loadPages(websiteUrl);
  const checks = parsePages(loaded.htmlByUrl, city, shopName, websiteUrl, capabilities);

  checks.fetchNotes = loaded.fetchNotes;
  if (pagespeed?.status === 'ok' && typeof pagespeed.performanceScore === 'number') {
    checks.performanceScore = pagespeed.performanceScore;
    checks.performanceMethod = 'lighthouse';
  } else {
    checks.performanceScore = await runPerformanceHeuristic(websiteUrl.replace(/\/$/, ''));
    checks.performanceMethod = 'ttfb-heuristic';
  }
  checks.sitemapFound = loaded.sitemapOk;

  const scores = buildScores(checks, verticalSlug);
  const signals = detectVerticalSignals(loaded.htmlByUrl, verticalSlug);
  const insuranceRelationshipSignals = extractInsuranceRelationshipSignals(loaded.htmlByUrl);
  const capabilityMissing =
    verticalSlug === 'collision'
      ? mapCapabilityMissing(
          signals.detected.map((signal) => signal.signal_name),
          capabilities
        )
      : [];
  const missingSignals = [...new Set([...signals.missing, ...capabilityMissing])];
  const missingPages = ['services', 'certifications', 'contact', 'estimate'].filter(
    (page) => !Object.keys(loaded.htmlByUrl).some((url) => url.toLowerCase().includes(`/${page}`))
  );

  const categoryScores = computeCategoryScores({
    checks,
    pagespeed: performanceInput(pagespeed),
    detectedSignals: signals.detected,
    missingSignals,
    pagesAnalyzed: Object.keys(loaded.htmlByUrl).length,
    vertical: verticalSlug
  });

  const topFixes = buildTopFixes({
    issues: scores.issues,
    missingSignals,
    missingPages,
    hasPerformanceData: pagespeed?.status === 'ok',
    vertical: verticalSlug
  });

  const moneyKeywords = buildMoneyKeywords(city, checks, verticalSlug);
  const [competitorResult, nationalBenchmark] = await Promise.all([
    getCompetitors(city, shopName, websiteUrl),
    verticalSlug === 'collision' ? runNationalCollisionBenchmark(checks) : Promise.resolve(null)
  ]);
  const mapPack = await getMapPack(city, shopName, competitorResult.competitors);
  const competitorAdvantages =
    verticalSlug === 'collision'
      ? await buildCompetitorComparison({
          city,
          competitors: competitorResult.competitors,
          userSignalNames: signals.detected.map((signal) => signal.signal_name)
        })
      : [];

  const hasLiveKeywordMetrics = moneyKeywords.some((row) => row.source === 'api');
  const aiSummaryResult = await generateAiSummary(shopName, city, scores.total, scores.issues, {
    hasLivePageSpeed: pagespeed?.status === 'ok',
    serpSource: competitorResult.source,
    hasLiveKeywordMetrics
  }, verticalSlug);
  const thirtyDayPlan = buildThirtyDayPlan(
    city,
    scores.issues.map((issue) => issue.title),
    verticalSlug
  );

  console.info(
    `AI_PROVIDER=${aiSummaryResult.provider} city=${city.toLowerCase().trim()} shop=${(shopName || 'unknown').toLowerCase().replace(/\\s+/g, '-')}`
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
    nationalBenchmark: nationalBenchmark || undefined,
    missingPages,
    pageFetchMeta: loaded.pageFetchMeta,
    scanDurationMs: Date.now() - startedAt,
    sources: {
      serp: competitorResult.source,
      mapPack: mapPack.source,
      aiSummary: aiSummaryResult.sourceConfidence,
      keywords: hasLiveKeywordMetrics ? 'live' : 'modeled'
    },
    moneyKeywords,
    competitors: competitorResult.competitors,
    mapPack,
    insuranceRelationshipSignals,
    aiSummary: aiSummaryResult.text,
    thirtyDayPlan
  };
}
