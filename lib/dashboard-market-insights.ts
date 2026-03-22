import { prisma } from '@/lib/prisma';
import { getVerticalConfig } from '@/lib/verticals';

type CohortScanRow = {
  city: string | null;
  scoreTotal: number;
  scoreWebsite: number;
  scoreLocal: number;
  scoreIntent: number;
  rawChecksJson: string;
};

type CohortFeatureRow = {
  score: number;
  hasPrimaryConversion: boolean;
  hasReviews: boolean;
  hasAuthority: boolean;
};

export type DashboardMarketInsights = {
  cohortLabel: string;
  cohortSize: number;
  cityRank: number | null;
  scoreDelta: number;
  websiteDelta: number;
  localDelta: number;
  intentDelta: number;
  percentileLabel: string;
  leverageNotes: string[];
  issueRates: {
    noPrimaryConversion: number;
    noReviews: number;
    noAuthority: number;
  };
  issueLabels: {
    primaryConversion: string;
    authority: string;
  };
};

function parseRawChecks(rawChecksJson: string) {
  try {
    return JSON.parse(rawChecksJson || '{}') as Record<string, any>;
  } catch {
    return {};
  }
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function featureRows(scans: CohortScanRow[], vertical?: string | null): CohortFeatureRow[] {
  const cfg = getVerticalConfig(vertical);
  return scans.map((scan) => {
    const raw = parseRawChecks(scan.rawChecksJson);
    const checks = raw?.checks || {};
    return {
      score: scan.scoreTotal,
      hasPrimaryConversion: Boolean(checks.onlineEstimateFlow || checks.estimateCtaDetected || raw?.estimateCtaDetected),
      hasReviews: Boolean(
        (raw?.googlePlace?.userRatingCount || 0) > 0 || (raw?.reviews?.reviews || 0) > 0
      ),
      hasAuthority:
        cfg.slug === 'collision'
          ? Array.isArray(checks.oemSignals) && checks.oemSignals.length > 0
          : cfg.slug === 'hvac'
            ? Boolean(checks.warrantyMentioned || checks.insuranceGuidancePresent)
            : cfg.slug === 'roofing'
              ? Boolean(checks.warrantyMentioned || checks.insuranceGuidancePresent)
              : Boolean(
                  checks.warrantyMentioned ||
                    checks.insuranceGuidancePresent
                )
    };
  });
}

function compareAverage(rows: CohortFeatureRow[], key: keyof Omit<CohortFeatureRow, 'score'>) {
  const yes = rows.filter((row) => row[key]);
  const no = rows.filter((row) => !row[key]);
  return {
    withFeature: average(yes.map((row) => row.score)),
    withoutFeature: average(no.map((row) => row.score))
  };
}

export async function buildDashboardMarketInsights(input: {
  city?: string | null;
  vertical?: string | null;
  scoreTotal?: number | null;
  scoreWebsite?: number | null;
  scoreLocal?: number | null;
  scoreIntent?: number | null;
}) {
  const cfg = getVerticalConfig(input.vertical);
  const scans = await prisma.scan.findMany({
    where: {
      executionStatus: 'completed',
      organizationId: { not: null },
      vertical: cfg.slug
    },
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: {
      city: true,
      scoreTotal: true,
      scoreWebsite: true,
      scoreLocal: true,
      scoreIntent: true,
      rawChecksJson: true
    }
  });

  const normalizedCity = input.city?.trim().toLowerCase() || '';
  const cityCohort = normalizedCity
    ? scans.filter((scan) => (scan.city || '').trim().toLowerCase() === normalizedCity)
    : [];
  const cohort = cityCohort.length >= 12 ? cityCohort : scans;
  const cohortLabel =
    cityCohort.length >= 12 && input.city ? `${input.city} ${cfg.label.toLowerCase()} cohort` : `all scanned ${cfg.label.toLowerCase()} shops`;

  const scoreDelta = (input.scoreTotal ?? 0) - average(cohort.map((scan) => scan.scoreTotal));
  const websiteDelta = (input.scoreWebsite ?? 0) - average(cohort.map((scan) => scan.scoreWebsite));
  const localDelta = (input.scoreLocal ?? 0) - average(cohort.map((scan) => scan.scoreLocal));
  const intentDelta = (input.scoreIntent ?? 0) - average(cohort.map((scan) => scan.scoreIntent));

  const rankedScores = cohort.map((scan) => scan.scoreTotal).sort((a, b) => a - b);
  const lowerOrEqual = rankedScores.filter((score) => score <= (input.scoreTotal ?? 0)).length;
  const percentile = percent(lowerOrEqual, rankedScores.length || 1);

  const rows = featureRows(cohort, cfg.slug);
  const primaryConversion = compareAverage(rows, 'hasPrimaryConversion');
  const reviews = compareAverage(rows, 'hasReviews');
  const authority = compareAverage(rows, 'hasAuthority');

  const cityCounts = Object.entries(
    scans.reduce<Record<string, number>>((acc, scan) => {
      const key = scan.city || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const cityRank = normalizedCity
    ? (() => {
        const index = cityCounts.findIndex(([city]) => city.trim().toLowerCase() === normalizedCity);
        return index >= 0 ? index + 1 : null;
      })()
    : null;

  const leverageNotes = [
    `Shops with a visible ${cfg.primaryCtaLabel.toLowerCase()} flow average ${primaryConversion.withFeature}, versus ${primaryConversion.withoutFeature} without one.`,
    `Shops with stronger ${cfg.authorityLabel.toLowerCase()} signals average ${authority.withFeature}, versus ${authority.withoutFeature} without them.`,
    `Shops with saved review signals average ${reviews.withFeature}, versus ${reviews.withoutFeature} without them.`
  ];

  return {
    cohortLabel,
    cohortSize: cohort.length,
    cityRank,
    scoreDelta,
    websiteDelta,
    localDelta,
    intentDelta,
    percentileLabel: `Top ${Math.max(1, 100 - percentile + 1)}% of ${cohortLabel}`,
    leverageNotes,
    issueRates: {
      noPrimaryConversion: percent(rows.filter((row) => !row.hasPrimaryConversion).length, rows.length),
      noReviews: percent(rows.filter((row) => !row.hasReviews).length, rows.length),
      noAuthority: percent(rows.filter((row) => !row.hasAuthority).length, rows.length)
    },
    issueLabels: {
      primaryConversion: `No visible ${cfg.primaryCtaLabel.toLowerCase()} path`,
      authority: `Weak ${cfg.authorityLabel.toLowerCase()} signals`
    }
  } satisfies DashboardMarketInsights;
}
