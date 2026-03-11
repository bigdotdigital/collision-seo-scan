import { isLikelyNonShopCompetitor } from '@/lib/competitor-filter';
import { parseJson } from '@/lib/json';
import { parseReportPayload, type ReportPayload, type SourceConfidence } from '@/lib/report-payload';

type ScanKeywordRow = {
  keyword?: string;
  volume?: number | null;
  source?: string;
};

type ScanCompetitorRow = {
  name?: string;
  url?: string;
  note?: string;
};

export type KeywordSuggestion = {
  term: string;
  source: SourceConfidence;
  note: string;
};

export type CompetitorSuggestion = {
  name: string;
  websiteUrl: string | null;
  source: SourceConfidence;
  note: string;
};

type SuggestionInput = {
  shopName: string;
  city: string;
  websiteUrl?: string | null;
  moneyKeywordsJson?: string | null;
  competitorsJson?: string | null;
  rawChecksJson?: string | null;
};

function uniqueNormalized(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function titleCaseCity(city: string) {
  return city
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function buildDeterministicKeywordSuggestions(city: string, reportPayload: ReportPayload | null): string[] {
  const normalizedCity = city.trim().toLowerCase();
  const picks = [
    `collision repair ${normalizedCity}`,
    `auto body shop ${normalizedCity}`,
    `collision center ${normalizedCity}`,
    `bumper repair ${normalizedCity}`,
    `hail damage repair ${normalizedCity}`,
    `auto paint repair ${normalizedCity}`,
    `car accident repair ${normalizedCity}`,
    `body shop estimate ${normalizedCity}`
  ];

  if (reportPayload?.checks.estimateCtaDetected || reportPayload?.checks.onlineEstimateFlow) {
    picks.unshift(`free collision estimate ${normalizedCity}`);
    picks.unshift(`auto body estimate ${normalizedCity}`);
  }
  if (reportPayload?.checks.insuranceSignals.some((signal) => /(insurance|claim)/i.test(signal))) {
    picks.unshift(`insurance claim repair ${normalizedCity}`);
  }
  if (reportPayload?.checks.oemSignals.some((signal) => /subaru/i.test(signal))) {
    picks.push(`subaru certified collision repair ${normalizedCity}`);
  }
  if (reportPayload?.checks.oemSignals.some((signal) => /ford/i.test(signal))) {
    picks.push(`ford certified body shop ${normalizedCity}`);
  }
  if (reportPayload?.checks.oemSignals.some((signal) => /\bgm\b|chevrolet|cadillac|gmc/i.test(signal))) {
    picks.push(`gm certified collision repair ${normalizedCity}`);
  }

  return uniqueNormalized(picks).slice(0, 12);
}

function sanitizeAiKeywordSuggestions(input: unknown, city: string): string[] {
  const rows = Array.isArray(input) ? input : [];
  return uniqueNormalized(
    rows
      .filter((row): row is string => typeof row === 'string')
      .map((row) => row.replace(/\s+/g, ' ').trim())
      .filter((row) => row.length >= 6 && row.length <= 80)
      .filter((row) => row.toLowerCase().includes(city.trim().toLowerCase()))
  ).slice(0, 10);
}

async function generateAiKeywordSuggestions(input: {
  shopName: string;
  city: string;
  websiteUrl?: string | null;
  reportPayload: ReportPayload | null;
}): Promise<string[]> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return [];

  const prompt = [
    'Return only a JSON array of 8 local SEO keyword phrases for an auto body shop.',
    `Shop: ${input.shopName || 'Auto body shop'}`,
    `City: ${titleCaseCity(input.city)}`,
    `Website: ${input.websiteUrl || 'Unknown'}`,
    'Requirements:',
    '- phrases must be realistic customer search queries',
    '- include the city in every keyword',
    '- do not include brand names of competing businesses',
    '- include OEM certification phrases only if they are supported',
    `Supported OEM signals: ${(input.reportPayload?.checks.oemSignals || []).join(', ') || 'none'}`,
    `Insurance signals: ${(input.reportPayload?.checks.insuranceSignals || []).join(', ') || 'none'}`,
    `Estimate flow detected: ${input.reportPayload?.checks.estimateCtaDetected || input.reportPayload?.checks.onlineEstimateFlow ? 'yes' : 'no'}`
  ].join('\n');

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
        max_output_tokens: 300
      }),
      cache: 'no-store'
    });
    const data = (await resp.json().catch(() => null)) as { output_text?: string } | null;
    if (!resp.ok || !data?.output_text) return [];

    const parsed = JSON.parse(data.output_text);
    return sanitizeAiKeywordSuggestions(parsed, input.city);
  } catch {
    return [];
  }
}

function extractReportPayload(rawChecksJson?: string | null) {
  return parseReportPayload(parseJson<unknown>(rawChecksJson || '', null));
}

export async function deriveKeywordSuggestions(
  input: SuggestionInput & { allowAi?: boolean }
): Promise<KeywordSuggestion[]> {
  const reportPayload = extractReportPayload(input.rawChecksJson);
  const scanKeywords = parseJson<ScanKeywordRow[]>(input.moneyKeywordsJson || '', []);
  const fromScan = uniqueNormalized(
    scanKeywords
      .map((row) => (typeof row?.keyword === 'string' ? row.keyword : ''))
      .filter(Boolean)
  );

  if (fromScan.length > 0) {
    const source = reportPayload?.sources.keywords || 'modeled';
    return fromScan.slice(0, 12).map((term) => ({
      term,
      source,
      note:
        source === 'live'
          ? 'Suggested from the latest scan keyword feed.'
          : 'Suggested from the latest modeled keyword scan.'
    }));
  }

  const deterministic = buildDeterministicKeywordSuggestions(input.city, reportPayload);
  if (input.allowAi) {
    const aiTerms = await generateAiKeywordSuggestions({
      shopName: input.shopName,
      city: input.city,
      websiteUrl: input.websiteUrl,
      reportPayload
    });
    if (aiTerms.length > 0) {
      return uniqueNormalized([...aiTerms, ...deterministic]).slice(0, 12).map((term) => ({
        term,
        source: 'modeled',
        note: 'AI-assisted fallback keyword suggestion. Add and validate with ranking snapshots.'
      }));
    }
  }

  return deterministic.map((term) => ({
    term,
    source: reportPayload ? 'modeled' : 'fallback',
    note: reportPayload
      ? 'Fallback keyword suggestion derived from the latest shop scan.'
      : 'Fallback keyword suggestion derived from city + shop type.'
  }));
}

export function deriveCompetitorSuggestions(input: SuggestionInput): CompetitorSuggestion[] {
  const reportPayload = extractReportPayload(input.rawChecksJson);
  const scanCompetitors = parseJson<ScanCompetitorRow[]>(input.competitorsJson || '', []);

  const combined = [
    ...scanCompetitors.map((row) => ({
      name: typeof row?.name === 'string' ? row.name.trim() : '',
      websiteUrl: typeof row?.url === 'string' ? row.url.trim() || null : null,
      note: typeof row?.note === 'string' ? row.note : 'Suggested from the latest scan competitor set.',
      source: reportPayload?.sources.competitors || 'fallback'
    })),
    ...((reportPayload?.competitorAdvantages || []).map((row) => ({
      name: row.name.trim(),
      websiteUrl: row.url?.trim() || null,
      note: row.advantages[0] || 'Suggested from the latest competitor comparison payload.',
      source: reportPayload?.sources.competitors || 'fallback'
    })) || [])
  ];

  const seen = new Set<string>();
  const suggestions: CompetitorSuggestion[] = [];

  for (const row of combined) {
    const key = row.name.toLowerCase();
    if (!row.name || seen.has(key)) continue;
    if (isLikelyNonShopCompetitor(row.name, row.websiteUrl)) continue;
    if (input.shopName && row.name.toLowerCase().includes(input.shopName.toLowerCase())) continue;
    seen.add(key);
    suggestions.push({
      name: row.name,
      websiteUrl: row.websiteUrl,
      note: row.note,
      source: row.source
    });
  }

  return suggestions.slice(0, 6);
}
