import {
  getDashboardProfileById,
  isDashboardProfileId,
  type DashboardModuleId,
  type DashboardProfile,
  type DashboardProfileId
} from '@/lib/dashboard-profile';

export const DASHBOARD_FOCUS_TAGS = [
  'maps',
  'conversion',
  'hail',
  'oem',
  'reviews',
  'service-area',
  'fleet',
  'adas',
  'trust'
] as const;

export type DashboardFocusTag = (typeof DASHBOARD_FOCUS_TAGS)[number];

export const DASHBOARD_MODULE_OPTIONS: Array<{ id: DashboardModuleId; label: string }> = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'maps', label: 'Maps Authority' },
  { id: 'demand', label: 'Local Demand' },
  { id: 'competitorGap', label: 'Competitor Gap' },
  { id: 'servicePages', label: 'Service Pages' },
  { id: 'revenueLeak', label: 'Revenue Leak' },
  { id: 'repairPlan', label: 'Repair Plan' }
];

const moduleLabelById = Object.fromEntries(
  DASHBOARD_MODULE_OPTIONS.map((option) => [option.id, option.label])
) as Record<DashboardModuleId, string>;

export type DashboardCustomization = {
  preferredProfileId: DashboardProfileId | null;
  primaryModuleIds: DashboardModuleId[];
  focusTags: DashboardFocusTag[];
  customSummary: string | null;
  operatorNote: string | null;
  ownerWeeklyGoal: string | null;
};

export const EMPTY_DASHBOARD_CUSTOMIZATION: DashboardCustomization = {
  preferredProfileId: null,
  primaryModuleIds: [],
  focusTags: [],
  customSummary: null,
  operatorNote: null,
  ownerWeeklyGoal: null
};

function cleanText(value: unknown, max = 400) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseJsonArray<T extends string>(
  value: unknown,
  predicate: (candidate: string) => candidate is T
): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<T>();
  const rows: T[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    if (!predicate(item) || seen.has(item)) continue;
    seen.add(item);
    rows.push(item);
  }
  return rows;
}

function isDashboardModuleId(value: string): value is DashboardModuleId {
  return DASHBOARD_MODULE_OPTIONS.some((option) => option.id === value);
}

function isDashboardFocusTag(value: string): value is DashboardFocusTag {
  return DASHBOARD_FOCUS_TAGS.includes(value as DashboardFocusTag);
}

export function parseDashboardCustomizationRecord(
  row:
    | {
        preferredProfileId: string | null;
        primaryModuleIds: unknown;
        focusTags: unknown;
        customSummary: string | null;
        operatorNote: string | null;
        ownerWeeklyGoal: string | null;
      }
    | null
    | undefined
): DashboardCustomization {
  if (!row) return EMPTY_DASHBOARD_CUSTOMIZATION;

  const preferredProfileId = isDashboardProfileId(row.preferredProfileId)
    ? row.preferredProfileId
    : null;

  return {
    preferredProfileId,
    primaryModuleIds: parseJsonArray(row.primaryModuleIds, isDashboardModuleId).slice(0, 3),
    focusTags: parseJsonArray(row.focusTags, isDashboardFocusTag),
    customSummary: cleanText(row.customSummary, 600) || null,
    operatorNote: cleanText(row.operatorNote, 600) || null,
    ownerWeeklyGoal: cleanText(row.ownerWeeklyGoal, 220) || null
  };
}

export function buildDashboardCustomizationInput(args: {
  preferredProfileId: string | null;
  primaryModuleIds: string[];
  focusTags: string[];
  customSummary: string;
  operatorNote: string;
  ownerWeeklyGoal: string;
}): DashboardCustomization {
  const preferredProfileId = isDashboardProfileId(args.preferredProfileId)
    ? args.preferredProfileId
    : null;

  return {
    preferredProfileId,
    primaryModuleIds: parseJsonArray(args.primaryModuleIds, isDashboardModuleId).slice(0, 3),
    focusTags: parseJsonArray(args.focusTags, isDashboardFocusTag),
    customSummary: cleanText(args.customSummary, 600) || null,
    operatorNote: cleanText(args.operatorNote, 600) || null,
    ownerWeeklyGoal: cleanText(args.ownerWeeklyGoal, 220) || null
  };
}

export function resolveDashboardProfileWithCustomization(args: {
  detectedProfile: DashboardProfile;
  customization: DashboardCustomization;
}): DashboardProfile {
  const base = args.customization.preferredProfileId
    ? getDashboardProfileById(args.customization.preferredProfileId)
    : args.detectedProfile;

  if (args.customization.primaryModuleIds.length === 0) {
    return base;
  }

  return {
    ...base,
    moduleIds: args.customization.primaryModuleIds,
    moduleTitles: args.customization.primaryModuleIds.map((id) => moduleLabelById[id])
  };
}
