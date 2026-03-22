import { normalizeSpace } from '@/lib/utils';
import type { CollisionSignal } from '@/lib/types';
import { getVerticalConfig, type VerticalSlug } from '@/lib/verticals';

type SignalDef = {
  name: string;
  group: CollisionSignal['group'];
  patterns: RegExp[];
  confidence: number;
};

const SIGNAL_DEFS: Record<VerticalSlug, SignalDef[]> = {
  collision: [
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
  ],
  hvac: [
    { name: 'emergency_service', group: 'service', patterns: [/24\/7|emergency service|same-day service|same day service/i], confidence: 0.88 },
    { name: 'maintenance_plan', group: 'service', patterns: [/maintenance plan|maintenance agreement|membership plan|service agreement/i], confidence: 0.84 },
    { name: 'financing', group: 'service', patterns: [/financing|monthly payments|special financing/i], confidence: 0.8 },
    { name: 'licensed_technicians', group: 'certification', patterns: [/licensed.*technician|certified technician|nate certified/i], confidence: 0.82 },
    { name: 'heat_pump', group: 'capability', patterns: [/heat pump/i], confidence: 0.82 },
    { name: 'indoor_air_quality', group: 'capability', patterns: [/indoor air quality|air purification|iaq/i], confidence: 0.78 },
    { name: 'replacement_quote', group: 'service', patterns: [/free estimate|request service|schedule service|get a quote/i], confidence: 0.78 }
  ],
  roofing: [
    { name: 'storm_damage', group: 'service', patterns: [/storm damage|wind damage/i], confidence: 0.88 },
    { name: 'hail_damage', group: 'service', patterns: [/hail damage|hail repair/i], confidence: 0.88 },
    { name: 'insurance_claim_help', group: 'service', patterns: [/insurance claim|claims assistance|insurance restoration/i], confidence: 0.84 },
    { name: 'free_inspection', group: 'service', patterns: [/free inspection|roof inspection|schedule inspection/i], confidence: 0.84 },
    { name: 'manufacturer_certified', group: 'certification', patterns: [/certainteed|gaf|owens corning|master elite|preferred contractor/i], confidence: 0.82 },
    { name: 'warranty', group: 'certification', patterns: [/warranty|workmanship guarantee/i], confidence: 0.76 },
    { name: 'project_gallery', group: 'capability', patterns: [/recent projects|project gallery|before and after/i], confidence: 0.74 },
    { name: 'financing', group: 'service', patterns: [/financing|monthly payments/i], confidence: 0.78 }
  ],
  plumbing: [
    { name: 'emergency_service', group: 'service', patterns: [/24\/7|emergency plumbing|same-day plumbing|same day plumbing/i], confidence: 0.88 },
    { name: 'drain_cleaning', group: 'capability', patterns: [/drain cleaning|clogged drain/i], confidence: 0.82 },
    { name: 'water_heater', group: 'capability', patterns: [/water heater|tankless/i], confidence: 0.82 },
    { name: 'leak_detection', group: 'capability', patterns: [/leak detection|slab leak/i], confidence: 0.8 },
    { name: 'sewer_line', group: 'capability', patterns: [/sewer line|main line/i], confidence: 0.8 },
    { name: 'licensed_or_insured', group: 'certification', patterns: [/licensed and insured|licensed plumber/i], confidence: 0.82 },
    { name: 'book_service_cta', group: 'service', patterns: [/request service|book service|call now/i], confidence: 0.76 }
  ]
};

const BASELINE_EXPECTED: Record<VerticalSlug, string[]> = {
  collision: ['i_car', 'adas_calibration', 'aluminum_repair', 'free_estimate_cta', 'hail_repair', 'rental_car_assist'],
  hvac: ['emergency_service', 'maintenance_plan', 'financing', 'replacement_quote'],
  roofing: ['storm_damage', 'insurance_claim_help', 'free_inspection', 'warranty'],
  plumbing: ['emergency_service', 'drain_cleaning', 'water_heater', 'licensed_or_insured']
};

function snippetAround(text: string, index: number): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + 130);
  return normalizeSpace(text.slice(start, end)).slice(0, 200);
}

function stripNonContentHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|#39|lt|gt);/gi, ' ');
}

export function detectVerticalSignals(htmlByUrl: Record<string, string>, vertical?: string | null) {
  const verticalSlug = getVerticalConfig(vertical).slug;
  const defs = SIGNAL_DEFS[verticalSlug];
  const detected: CollisionSignal[] = [];
  const seen = new Set<string>();

  for (const [url, html] of Object.entries(htmlByUrl)) {
    const pageText = normalizeSpace(stripNonContentHtml(html));

    for (const def of defs) {
      const hitPattern = def.patterns.find((pattern) => pattern.test(pageText));
      if (!hitPattern || seen.has(def.name)) continue;

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

  return {
    detected,
    missing: BASELINE_EXPECTED[verticalSlug].filter((name) => !seen.has(name)),
    allKnown: defs.map((def) => def.name)
  };
}

