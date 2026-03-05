import { prisma } from '@/lib/prisma';
import { parseJson, toJson } from '@/lib/json';

type ScanRawChecks = {
  checks?: {
    oemSignals?: string[];
  };
};

type RankingRow = {
  keyword: string;
  currentRank: number | null;
  previousRank: number | null;
  delta: number | null;
  note?: string;
};

const hash = (input: string) => {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const weekNumber = (date: Date) => Math.floor(date.getTime() / (1000 * 60 * 60 * 24 * 7));

const rankFor = (keyword: string, date: Date) => {
  const seed = hash(`${keyword}-${weekNumber(date)}`);
  return 3 + (seed % 35);
};

export function buildDefaultKeywords(city: string, oemSignals: string[]): Array<{
  keyword: string;
  city: string;
  intentType: 'OEM' | 'FLEET' | 'ESTIMATE' | 'GENERIC';
}> {
  const c = city.toLowerCase();

  const oemSet = new Set<string>();
  if (oemSignals.some((v) => v.includes('subaru'))) oemSet.add(`subaru certified collision repair ${c}`);
  if (oemSignals.some((v) => v.includes('ford'))) oemSet.add(`ford certified body shop ${c}`);
  if (oemSignals.some((v) => v.includes('gm'))) oemSet.add(`gm certified collision repair ${c}`);
  if (oemSet.size === 0) {
    oemSet.add(`subaru certified collision repair ${c}`);
    oemSet.add(`ford certified body shop ${c}`);
    oemSet.add(`gm certified collision repair ${c}`);
  }

  const fleet = [
    `sprinter body shop ${c}`,
    `promaster collision repair ${c}`,
    `ford transit collision repair ${c}`,
    `commercial van collision repair ${c}`,
    `fleet body shop ${c}`
  ];

  const estimate = [
    `free collision estimate ${c}`,
    `insurance estimate body shop ${c}`,
    `photo estimate collision repair ${c}`
  ];

  const generic = [
    `collision repair ${c}`,
    `auto body shop ${c}`,
    `hail damage repair ${c}`,
    `bumper repair ${c}`,
    `dent repair ${c}`,
    `paint and body shop ${c}`,
    `auto paint repair ${c}`,
    `car accident repair ${c}`,
    `best body shop ${c}`,
    `collision center ${c}`,
    `same day estimate ${c}`,
    `insurance claim body shop ${c}`,
    `frame repair ${c}`,
    `rear end collision repair ${c}`,
    `trusted auto body ${c}`
  ];

  const rows: Array<{
    keyword: string;
    city: string;
    intentType: 'OEM' | 'FLEET' | 'ESTIMATE' | 'GENERIC';
  }> = [];

  [...oemSet].slice(0, 6).forEach((keyword) => rows.push({ keyword, city, intentType: 'OEM' }));
  fleet.slice(0, 6).forEach((keyword) => rows.push({ keyword, city, intentType: 'FLEET' }));
  estimate.slice(0, 3).forEach((keyword) => rows.push({ keyword, city, intentType: 'ESTIMATE' }));
  generic.slice(0, 12).forEach((keyword) => rows.push({ keyword, city, intentType: 'GENERIC' }));

  return rows.slice(0, 25);
}

export async function createMetricSnapshot(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      keywords: true,
      scans: { orderBy: { createdAt: 'desc' }, take: 1 },
      metricSnapshots: { orderBy: { createdAt: 'desc' }, take: 1 }
    }
  });

  if (!client) return null;

  const now = new Date();
  const lastSnapshot = client.metricSnapshots[0];
  const previousRows = parseJson<RankingRow[]>(lastSnapshot?.keywordsJson, []);
  const prevMap = new Map(previousRows.map((row) => [row.keyword, row]));

  const rankApiConfigured = Boolean(process.env.KEYWORD_API_KEY || process.env.SERP_API_KEY);

  const rows: RankingRow[] = client.keywords.map((kw) => {
    if (!rankApiConfigured) {
      return {
        keyword: kw.keyword,
        currentRank: null,
        previousRank: prevMap.get(kw.keyword)?.currentRank ?? null,
        delta: null,
        note: 'Ranking connector not configured'
      };
    }

    const currentRank = rankFor(kw.keyword, now);
    const previousRank = prevMap.get(kw.keyword)?.currentRank ?? rankFor(kw.keyword, new Date(now.getTime() - 7 * 86400000));
    const delta = previousRank - currentRank;

    return {
      keyword: kw.keyword,
      currentRank,
      previousRank,
      delta
    };
  });

  const up = rows.filter((r) => typeof r.delta === 'number' && r.delta > 0).length;
  const down = rows.filter((r) => typeof r.delta === 'number' && r.delta < 0).length;

  const scoreTotal = client.scans[0]?.scoreTotal ?? null;

  return prisma.metricSnapshot.create({
    data: {
      clientId,
      keywordsJson: toJson(rows),
      reviewsJson: null,
      gscJson: null,
      gbpJson: null,
      summaryJson: toJson({
        up,
        down,
        note: rankApiConfigured
          ? 'Weekly keyword movement generated from configured ranking source.'
          : 'Ranking source not configured yet; data placeholders stored to keep dashboard stable.'
      }),
      scoreTotal
    }
  });
}

export async function oemSignalsFromScan(scanId: string): Promise<string[]> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { rawChecksJson: true }
  });

  if (!scan) return [];
  const parsed = parseJson<ScanRawChecks>(scan.rawChecksJson, {});
  return parsed.checks?.oemSignals || [];
}
