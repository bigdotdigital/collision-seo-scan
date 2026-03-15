import * as cheerio from 'cheerio';
import { normalizeSpace } from '@/lib/utils';
import { knownInsurerNames, normalizeInsurerName } from '@/lib/insurance-normalization';
import type { InsuranceRelationshipSignal } from '@/lib/types';

const RELATIONSHIP_PATTERNS: Array<{ pattern: RegExp; relationshipType: string; confidence: number }> = [
  { pattern: /preferred shop|preferred repair/i, relationshipType: 'preferred_shop', confidence: 0.82 },
  { pattern: /insurance partner|partner with/i, relationshipType: 'insurance_partner', confidence: 0.8 },
  { pattern: /direct repair program|\bdrp\b/i, relationshipType: 'DRP', confidence: 0.9 },
  { pattern: /claims assistance|claim support|insurance help/i, relationshipType: 'claims_assistance', confidence: 0.65 }
];

function scoreSignal(signalType: InsuranceRelationshipSignal['signalType'], text: string, relationshipType: string | null) {
  if (signalType === 'logo') return 0.9;
  if (signalType === 'outbound_link') return 0.75;
  if (signalType === 'badge') return 0.8;
  if (signalType === 'structured_data') return 0.7;
  if (/we work with|we accept|partner with|preferred/i.test(text)) return 0.85;
  if (relationshipType === 'claims_assistance') return 0.6;
  if (/all insurance accepted/i.test(text)) return 0.2;
  return 0.45;
}

function relationshipTypeFor(text: string) {
  const match = RELATIONSHIP_PATTERNS.find((row) => row.pattern.test(text));
  return match?.relationshipType || null;
}

function insurersInText(text: string) {
  const hits = new Set<string>();
  const lower = text.toLowerCase();

  for (const insurer of knownInsurerNames()) {
    const pattern = new RegExp(`\\b${escapeRegex(insurer.toLowerCase())}\\b`, 'i');
    if (pattern.test(lower)) {
      hits.add(insurer);
    }
  }

  return [...hits];
}

function snippet(text: string) {
  return normalizeSpace(text).slice(0, 280) || null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractInsuranceRelationshipSignals(htmlByUrl: Record<string, string>) {
  const signals = new Map<string, InsuranceRelationshipSignal>();

  for (const [sourceUrl, html] of Object.entries(htmlByUrl)) {
    if (!html) continue;
    const $ = cheerio.load(html);

    $('img').each((_, el) => {
      const attrs = [$(el).attr('alt'), $(el).attr('src'), $(el).attr('title')].filter(Boolean).join(' ');
      const insurerName = normalizeInsurerName(attrs);
      if (!insurerName) return;
      rememberSignal(signals, {
        insurerName,
        relationshipType: 'insurance_partner',
        signalType: 'logo',
        confidence: 0.9,
        sourceUrl,
        sourceText: snippet(attrs)
      });
    });

    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = normalizeSpace($(el).text());
      const insurerName = normalizeInsurerName(`${text} ${href}`);
      if (!insurerName) return;
      const relationshipType = relationshipTypeFor(`${text} ${href}`);
      rememberSignal(signals, {
        insurerName,
        relationshipType,
        signalType: href ? 'outbound_link' : 'page_text',
        confidence: scoreSignal(href ? 'outbound_link' : 'page_text', `${text} ${href}`, relationshipType),
        sourceUrl,
        sourceText: snippet(`${text} ${href}`)
      });
    });

    const blocks = $('section,article,div,li,p,span,h2,h3,h4,td,th')
      .map((_, el) => normalizeSpace($(el).text()))
      .get()
      .filter(Boolean);

    for (const block of blocks) {
      const insurers = insurersInText(block);
      if (insurers.length === 0) continue;
      const relationshipType = relationshipTypeFor(block);
      for (const insurerName of insurers) {
        rememberSignal(signals, {
          insurerName,
          relationshipType,
          signalType: /partner|preferred|drp/i.test(block) ? 'badge' : 'page_text',
          confidence: scoreSignal(/partner|preferred|drp/i.test(block) ? 'badge' : 'page_text', block, relationshipType),
          sourceUrl,
          sourceText: snippet(block)
        });
      }
    }
  }

  return [...signals.values()];
}

function rememberSignal(store: Map<string, InsuranceRelationshipSignal>, signal: InsuranceRelationshipSignal) {
  const key = `${signal.insurerName}:${signal.sourceUrl || 'unknown'}:${signal.signalType}`;
  const existing = store.get(key);
  if (!existing || existing.confidence < signal.confidence) {
    store.set(key, signal);
  }
}
