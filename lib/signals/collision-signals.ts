import { normalizeSpace } from '../utils';
import type { CollisionSignal } from '../types';

type SignalDef = {
  name: string;
  group: CollisionSignal['group'];
  patterns: RegExp[];
  confidence: number;
};

const SIGNAL_DEFS: SignalDef[] = [
  { name: 'subaru_certified', group: 'certification', patterns: [/subaru/i], confidence: 0.8 },
  { name: 'ford_certified', group: 'certification', patterns: [/\bford\b/i], confidence: 0.8 },
  { name: 'gm_certified', group: 'certification', patterns: [/\b(gm|general motors|chevrolet|gmc|buick|cadillac)\b/i], confidence: 0.8 },
  { name: 'hyundai_kia_genesis_certified', group: 'certification', patterns: [/\b(hyundai|kia|genesis)\b/i], confidence: 0.8 },
  { name: 'nissan_infiniti_certified', group: 'certification', patterns: [/\b(nissan|infiniti)\b/i], confidence: 0.8 },
  { name: 'fca_certified', group: 'certification', patterns: [/\b(chrysler|dodge|jeep|ram|fiat|fca)\b/i], confidence: 0.8 },
  { name: 'alfa_romeo_certified', group: 'certification', patterns: [/\balfa\s*romeo\b/i], confidence: 0.8 },
  { name: 'i_car_gold_class', group: 'certification', patterns: [/i-?car\s+gold\s+class/i], confidence: 0.95 },
  { name: 'i_car', group: 'certification', patterns: [/\bi-?car\b/i], confidence: 0.85 },
  { name: 'ase', group: 'certification', patterns: [/\base\b/i], confidence: 0.7 },
  { name: 'adas_calibration', group: 'capability', patterns: [/adas/i, /calibration/i], confidence: 0.9 },
  { name: 'pre_post_scan', group: 'capability', patterns: [/pre-?scan/i, /post-?scan/i], confidence: 0.9 },
  { name: 'aluminum_repair', group: 'capability', patterns: [/aluminum/i], confidence: 0.85 },
  { name: 'ev_repair', group: 'capability', patterns: [/\bev\b/i, /electric vehicle/i], confidence: 0.8 },
  { name: 'hail_repair', group: 'service', patterns: [/hail/i], confidence: 0.8 },
  { name: 'pdr', group: 'service', patterns: [/paintless dent repair|\bpdr\b/i], confidence: 0.8 },
  { name: 'towing', group: 'service', patterns: [/towing/i], confidence: 0.75 },
  { name: 'rental_car_assist', group: 'service', patterns: [/rental car|rental/i], confidence: 0.75 },
  { name: 'free_estimate_cta', group: 'service', patterns: [/free estimate|photo estimate|request estimate|get estimate/i], confidence: 0.85 }
];

const BASELINE_EXPECTED = [
  'i_car',
  'adas_calibration',
  'aluminum_repair',
  'free_estimate_cta',
  'hail_repair',
  'rental_car_assist'
];

function snippetAround(text: string, index: number): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + 130);
  return normalizeSpace(text.slice(start, end)).slice(0, 200);
}

export function detectCollisionSignals(htmlByUrl: Record<string, string>) {
  const detected: CollisionSignal[] = [];
  const seen = new Set<string>();

  for (const [url, html] of Object.entries(htmlByUrl)) {
    const pageText = normalizeSpace(html.replace(/<[^>]+>/g, ' '));

    for (const def of SIGNAL_DEFS) {
      const hitPattern = def.patterns.find((p) => p.test(pageText));
      if (!hitPattern) continue;
      if (seen.has(def.name)) continue;

      const match = pageText.match(hitPattern);
      const idx = match?.index ?? 0;
      detected.push({
        signal_name: def.name,
        confidence: def.confidence,
        group: def.group,
        evidence: {
          url,
          snippet: snippetAround(pageText, idx)
        }
      });
      seen.add(def.name);
    }
  }

  const missing = BASELINE_EXPECTED.filter((name) => !seen.has(name));

  return {
    detected,
    missing,
    allKnown: SIGNAL_DEFS.map((s) => s.name)
  };
}

export function mapCapabilityMissing(
  detectedNames: string[],
  capabilities?: { hasICar?: boolean; hasOEM?: boolean; hasAdas?: boolean; hasAluminum?: boolean }
): string[] {
  const missing: string[] = [];
  const has = new Set(detectedNames);

  if (capabilities?.hasICar && !has.has('i_car') && !has.has('i_car_gold_class')) missing.push('i_car');
  if (capabilities?.hasOEM && !detectedNames.some((n) => n.includes('certified'))) missing.push('oem_certifications');
  if (capabilities?.hasAdas && !has.has('adas_calibration')) missing.push('adas_calibration');
  if (capabilities?.hasAluminum && !has.has('aluminum_repair')) missing.push('aluminum_repair');

  return missing;
}
