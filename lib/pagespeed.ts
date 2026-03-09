import 'server-only';

export type DiagnosticImpact = 'high' | 'med' | 'low';

export type PageSpeedDiagnostic = {
  id: string;
  title: string;
  description: string;
  impact: DiagnosticImpact;
  recommendation: string;
};

export type PageSpeedResult = {
  status: 'ok' | 'error';
  message?: string;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  speedIndexMs: number | null;
  diagnostics: PageSpeedDiagnostic[];
};

const PREFERRED_AUDITS = [
  'render-blocking-resources',
  'unused-javascript',
  'uses-optimized-images',
  'uses-responsive-images',
  'efficient-animated-content',
  'uses-text-compression',
  'uses-long-cache-ttl',
  'dom-size',
  'unminified-javascript',
  'unminified-css',
  'server-response-time',
  'uses-rel-preconnect',
  'third-party-summary',
  'largest-contentful-paint',
  'total-blocking-time'
] as const;

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function recommendationForAudit(id: string, title: string): string {
  const map: Record<string, string> = {
    'render-blocking-resources': 'Defer or inline non-critical CSS/JS to speed first paint.',
    'unused-javascript': 'Remove unused JS and split bundles by page.',
    'uses-optimized-images': 'Serve next-gen compressed images at correct dimensions.',
    'uses-responsive-images': 'Use responsive image sizes for mobile and desktop.',
    'efficient-animated-content': 'Replace heavy GIF/animation assets with optimized formats.',
    'uses-text-compression': 'Enable gzip or brotli compression for text assets.',
    'uses-long-cache-ttl': 'Increase cache TTL for static assets.',
    'dom-size': 'Reduce DOM complexity on key pages.',
    'unminified-javascript': 'Minify JavaScript assets in production.',
    'unminified-css': 'Minify CSS assets in production.',
    'server-response-time': 'Improve server response time and edge caching.',
    'uses-rel-preconnect': 'Preconnect to critical third-party origins.',
    'third-party-summary': 'Limit heavy third-party scripts on core pages.',
    'largest-contentful-paint': 'Optimize above-the-fold assets to improve LCP.',
    'total-blocking-time': 'Reduce long main-thread tasks and JS execution time.'
  };

  return map[id] || `Improve ${title.toLowerCase()} to reduce load friction.`;
}

function impactFromScore(score: number | null | undefined): DiagnosticImpact {
  if (score === null || score === undefined || score < 0.5) return 'high';
  if (score < 0.75) return 'med';
  return 'low';
}

function emptyError(message: string): PageSpeedResult {
  return {
    status: 'error',
    message,
    performanceScore: null,
    lcpMs: null,
    cls: null,
    tbtMs: null,
    speedIndexMs: null,
    diagnostics: []
  };
}

export async function runPageSpeed(url: string): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return emptyError('PageSpeed API key is not configured.');
  }

  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('strategy', 'mobile');
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.set('category', 'seo');
  endpoint.searchParams.set('category', 'best-practices');
  endpoint.searchParams.set('category', 'accessibility');
  endpoint.searchParams.set('key', apiKey);

  const requestOnce = async (timeoutMs: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint.toString(), {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      const json = await response.json().catch(() => null);
      return { response, json };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    let { response, json } = await requestOnce(25_000);

    if (!response.ok && response.status >= 500) {
      const retried = await requestOnce(25_000);
      response = retried.response;
      json = retried.json;
    }

    if (!response.ok || !json) {
      return emptyError('PageSpeed request failed.');
    }

    if (json.error) {
      const message = typeof json.error.message === 'string' ? json.error.message : 'PageSpeed returned an error.';
      return emptyError(message);
    }

    const lighthouse = json?.lighthouseResult;
    if (!lighthouse) {
      return emptyError('PageSpeed did not return Lighthouse data.');
    }

    const audits = (lighthouse.audits || {}) as Record<string, any>;
    const performanceScoreRaw = lighthouse?.categories?.performance?.score;
    const performanceScore =
      typeof performanceScoreRaw === 'number' ? Math.round(performanceScoreRaw * 100) : null;

    const lcpMs = typeof audits['largest-contentful-paint']?.numericValue === 'number'
      ? Math.round(audits['largest-contentful-paint'].numericValue)
      : null;
    const cls = typeof audits['cumulative-layout-shift']?.numericValue === 'number'
      ? Number(audits['cumulative-layout-shift'].numericValue.toFixed(3))
      : null;
    const tbtMs = typeof audits['total-blocking-time']?.numericValue === 'number'
      ? Math.round(audits['total-blocking-time'].numericValue)
      : null;
    const speedIndexMs = typeof audits['speed-index']?.numericValue === 'number'
      ? Math.round(audits['speed-index'].numericValue)
      : null;

    const candidates = Object.entries(audits)
      .filter(([id, audit]) => {
        const mode = audit?.scoreDisplayMode;
        const score = audit?.score;
        const detailsType = typeof audit?.details?.type === 'string' ? audit.details.type : null;
        const inPreferred = PREFERRED_AUDITS.includes(id as (typeof PREFERRED_AUDITS)[number]);

        // Keep diagnostics focused on actionable speed/technical opportunities.
        if (
          mode === 'notApplicable' ||
          mode === 'manual' ||
          mode === 'informative' ||
          mode === 'error'
        ) {
          return false;
        }

        if (!inPreferred && detailsType !== 'opportunity') return false;

        return score === null || score === undefined || score < 0.9;
      })
      .map(([id, audit]) => {
        const prefIndex = PREFERRED_AUDITS.indexOf(id as (typeof PREFERRED_AUDITS)[number]);
        const score = typeof audit?.score === 'number' ? audit.score : null;
        return {
          id,
          title: typeof audit?.title === 'string' ? audit.title : id,
          description:
            typeof audit?.description === 'string'
              ? stripHtml(audit.description)
              : 'This metric can be improved to increase speed and UX.',
          score,
          prefIndex: prefIndex === -1 ? 999 : prefIndex
        };
      })
      .sort((a, b) => {
        if (a.prefIndex !== b.prefIndex) return a.prefIndex - b.prefIndex;
        const as = a.score ?? -1;
        const bs = b.score ?? -1;
        return as - bs;
      })
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        impact: impactFromScore(item.score),
        recommendation: recommendationForAudit(item.id, item.title)
      }));

    return {
      status: 'ok',
      performanceScore,
      lcpMs,
      cls,
      tbtMs,
      speedIndexMs,
      diagnostics: candidates
    };
  } catch (error) {
    const msg = error instanceof Error && error.name === 'AbortError'
      ? 'PageSpeed request timed out. Please try again in a moment.'
      : 'Unable to run PageSpeed analysis right now.';
    return emptyError(msg);
  }
}
