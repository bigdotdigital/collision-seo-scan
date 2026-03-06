import { safeFetchText } from '@/lib/security/safe-fetch';
import type { Competitor } from '@/lib/types';
import { detectCollisionSignals } from '@/lib/signals/collision-signals';

export type CompetitorAdvantage = {
  name: string;
  url?: string;
  advantages: string[];
  oemSignalCount: number;
  capabilityCount: number;
  estimateCta: boolean;
};

function extractBasicSeo(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return {
    hasTitle: Boolean(titleMatch?.[1]?.trim()),
    hasH1: Boolean(h1Match?.[1]?.trim()),
    hasMeta: Boolean(metaMatch?.[1]?.trim())
  };
}

export async function buildCompetitorComparison(input: {
  city: string;
  competitors: Competitor[];
  userSignalNames: string[];
}): Promise<CompetitorAdvantage[]> {
  const rows: CompetitorAdvantage[] = [];

  for (const competitor of input.competitors.slice(0, 5)) {
    if (!competitor.url) {
      rows.push({
        name: competitor.name,
        url: competitor.url,
        advantages: ['Competitor page fetch unavailable in this run.'],
        oemSignalCount: 0,
        capabilityCount: 0,
        estimateCta: false
      });
      continue;
    }

    try {
      const fetched = await safeFetchText(competitor.url, { timeoutMs: 7000 });
      if (!fetched.ok || !fetched.text) {
        rows.push({
          name: competitor.name,
          url: competitor.url,
          advantages: ['Competitor page fetch failed; comparison shown with limited data.'],
          oemSignalCount: 0,
          capabilityCount: 0,
          estimateCta: false
        });
        continue;
      }

      const signals = detectCollisionSignals({ [fetched.finalUrl]: fetched.text }).detected;
      const seo = extractBasicSeo(fetched.text);
      const sigNames = signals.map((s) => s.signal_name);
      const missingVsCompetitor = sigNames.filter((s) => !input.userSignalNames.includes(s)).slice(0, 4);

      const advantages: string[] = [];
      if (missingVsCompetitor.length) {
        advantages.push(`Has signals you are missing: ${missingVsCompetitor.join(', ')}`);
      }
      if (sigNames.includes('free_estimate_cta')) {
        advantages.push('Uses clear free/photo estimate language on-page.');
      }
      if (seo.hasTitle && seo.hasH1 && seo.hasMeta) {
        advantages.push('Has complete title/H1/meta basics on homepage.');
      }
      if (!advantages.length) advantages.push('Slightly stronger local trust/visibility footprint.');

      rows.push({
        name: competitor.name,
        url: competitor.url,
        advantages,
        oemSignalCount: sigNames.filter((s) => s.includes('certified') || s.includes('subaru') || s.includes('ford') || s.includes('gm')).length,
        capabilityCount: sigNames.filter((s) => ['adas_calibration', 'ev_repair', 'aluminum_repair', 'pre_post_scan'].includes(s)).length,
        estimateCta: sigNames.includes('free_estimate_cta')
      });
    } catch {
      rows.push({
        name: competitor.name,
        url: competitor.url,
        advantages: ['Competitor comparison timed out; showing fallback insight.'],
        oemSignalCount: 0,
        capabilityCount: 0,
        estimateCta: false
      });
    }
  }

  return rows;
}
