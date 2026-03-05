import { prisma } from '@/lib/prisma';
import { parseJson } from '@/lib/json';
import type { PageSpeedResult } from '@/lib/pagespeed';
import type {
  Competitor,
  Issue,
  MoneyKeyword,
  ScanRecord as BaseScanRecord,
  ThirtyDayPlanItem
} from '@/lib/types';

export type ScanRecord = BaseScanRecord & {
  scoreTotal: number;
  scoreWebsite: number;
  scoreLocal: number;
  scoreIntent: number;
  issues: Issue[];
  moneyKeywords: MoneyKeyword[];
  competitors: Competitor[];
  thirtyDayPlan: ThirtyDayPlanItem[];
  aiSummary: string | null;
};

const EMPTY_PAGESPEED: PageSpeedResult = {
  status: 'error',
  message: 'PageSpeed data is not available for this scan yet.',
  performanceScore: null,
  lcpMs: null,
  cls: null,
  tbtMs: null,
  speedIndexMs: null,
  diagnostics: []
};

const globalStore = globalThis as typeof globalThis & {
  collisionScanStore?: Map<string, ScanRecord>;
};

const scanStore = globalStore.collisionScanStore ?? new Map<string, ScanRecord>();
if (!globalStore.collisionScanStore) {
  globalStore.collisionScanStore = scanStore;
}

function toRecord(scan: {
  id: string;
  createdAt: Date;
  websiteUrl: string;
  shopName: string;
  city: string;
  email: string | null;
  phone: string | null;
  pagespeedJson: string | null;
  scoreTotal: number;
  scoreWebsite: number;
  scoreLocal: number;
  scoreIntent: number;
  issuesJson: string;
  moneyKeywordsJson: string;
  competitorsJson: string;
  thirtyDayPlanJson: string | null;
  aiSummary: string | null;
}): ScanRecord {
  return {
    id: scan.id,
    createdAt: scan.createdAt.toISOString(),
    url: scan.websiteUrl,
    shopName: scan.shopName,
    city: scan.city,
    email: scan.email,
    phone: scan.phone,
    pagespeed: parseJson<PageSpeedResult>(scan.pagespeedJson, EMPTY_PAGESPEED),
    scoreTotal: scan.scoreTotal,
    scoreWebsite: scan.scoreWebsite,
    scoreLocal: scan.scoreLocal,
    scoreIntent: scan.scoreIntent,
    issues: parseJson<Issue[]>(scan.issuesJson, []),
    moneyKeywords: parseJson<MoneyKeyword[]>(scan.moneyKeywordsJson, []),
    competitors: parseJson<Competitor[]>(scan.competitorsJson, []),
    thirtyDayPlan: parseJson<ThirtyDayPlanItem[]>(scan.thirtyDayPlanJson, []),
    aiSummary: scan.aiSummary
  };
}

export async function getScanRecord(id: string): Promise<ScanRecord | null> {
  try {
    const scan = await prisma.scan.findUnique({ where: { id } });
    if (scan) return toRecord(scan);
  } catch {
    // ignore and try in-memory store
  }

  return scanStore.get(id) ?? null;
}

export function saveScanRecord(record: ScanRecord): void {
  scanStore.set(record.id, record);
}
