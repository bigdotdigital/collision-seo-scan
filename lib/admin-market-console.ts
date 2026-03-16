import { parseJson } from '@/lib/json';
import { prisma } from '@/lib/prisma';
import { getQueueMetrics } from '@/lib/queue/metrics';
import { parseReportPayload, type ReportPayload } from '@/lib/report-payload';

type Tone = 'strong' | 'warning' | 'weak' | 'neutral';

type ShopBaseRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  websiteUrl: string | null;
  publicProfileSlug: string | null;
  lat: number | null;
  lng: number | null;
  latestScan: {
    id: string;
    createdAt: Date;
    finishedAt: Date | null;
    scoreTotal: number;
    scoreWebsite: number;
    scoreLocal: number;
    scoreIntent: number;
    rawChecksJson: string;
    publicStatus: string;
  } | null;
  latestReview: {
    observedAt: Date;
    rating: number | null;
    reviewCount: number | null;
  } | null;
  latestSiteFeature: {
    observedAt: Date;
    checkedUrlCount: number | null;
    servicePageCount: number | null;
    oemSignalCount: number;
    hasEstimateCta: boolean;
    hasOnlineEstimateFlow: boolean;
    hasReviewProof: boolean;
    hasMapEmbed: boolean;
    hasDirectionsCta: boolean;
    hasLocationFinder: boolean;
    hasInsuranceGuidance: boolean;
    hasWarranty: boolean;
    hasAdasContent: boolean;
    hasCertificationPage: boolean;
    missingPagesJson: string | null;
  } | null;
  insurers: Array<{
    insurerName: string;
    relationshipType: string | null;
    signalType: string;
    confidence: number;
    observedAt: Date;
  }>;
};

export type AdminMarketConsoleState = {
  market: {
    id: string;
    city: string;
    state: string | null;
    label: string;
    slug: string;
  };
  nav: Array<{ label: string; href: string; active?: boolean }>;
  metrics: {
    totalShops: number;
    totalObservations: number;
    queueToday: number;
    medianRuntimeMs: number | null;
    updatedAtLabel: string;
  };
  map: {
    averageScanAgeHours: string;
    points: Array<{
      shopId: string;
      name: string;
      city: string;
      score: number;
      reviews: number;
      typeLabel: string;
      oemCount: number;
      tone: Tone;
      x: number;
      y: number;
      scanAgeLabel: string;
    }>;
  };
  leaderboard: Array<{
    shopId: string;
    rank: number;
    name: string;
    city: string;
    reviews: number;
    score: number;
    oemCount: number;
    lastScanLabel: string;
    tone: Tone;
  }>;
  opportunities: Array<{
    shopId: string;
    name: string;
    reviews: number;
    score: number;
    missingCount: number;
    opportunityScore: number;
  }>;
  topology: {
    focalShopId: string | null;
    nodes: Array<{
      id: string;
      label: string;
      shortLabel: string;
      x: number;
      y: number;
      tone: Tone;
      radius: number;
    }>;
    edges: Array<{ sourceId: string; targetId: string }>;
  };
  reviewVelocity: {
    yMax: number;
    series: Array<{
      shopId: string;
      label: string;
      tone: Tone;
      latestCount: number;
      points: Array<{ x: number; y: number }>;
    }>;
  };
  oemMatrix: Array<{
    label: string;
    foundCount: number;
    gapCount: number;
    foundPercent: number;
    gapPercent: number;
  }>;
  systemOperations: {
    queuedJobs: number;
    runningJobs: number;
    errorRate1h: string;
    workerStatus: string;
    recentQueueActivity: number[];
    recentJobs: Array<{
      id: string;
      type: string;
      status: string;
      attempts: number;
      runAtLabel: string;
      errorLabel: string;
    }>;
  };
  integrity: {
    publishedCount: number;
    privateCount: number;
    duplicateWarnings: Array<{
      host: string;
      shopCount: number;
      cities: string[];
    }>;
    chainClusters: Array<{
      label: string;
      locationCount: number;
      avgScore: number;
    }>;
    suspiciousScans: Array<{
      shopId: string;
      name: string;
      reason: string;
      score: number;
    }>;
  };
  drawer: {
    defaultShopId: string | null;
    shops: Record<
      string,
      {
        id: string;
        name: string;
        addressLabel: string;
        websiteLabel: string;
        publicReportUrl: string | null;
        reviews: number;
        score: number;
        typeLabel: string;
        scoreTone: Tone;
        oemCertifications: string[];
        insurerMentions: Array<{ name: string; signal: string; confidence: number }>;
        conversionSignals: string[];
        overlap: Array<{ name: string; percent: number; tone: Tone }>;
        crawl: {
          lastScanLabel: string;
          checkedPagesLabel: string;
          crawlErrorsLabel: string;
        };
      }
    >;
  };
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function marketLabel(city: string, state?: string | null) {
  return state ? `${city}, ${state}` : city;
}

function scoreTone(score: number): Tone {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'warning';
  return 'weak';
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return sorted[middle];
}

function formatCompactNumber(value: number | null | undefined) {
  if (!value) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatRelativeTime(date: Date | null | undefined) {
  if (!date) return 'Unavailable';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return 'Unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function parsePayload(rawChecksJson: string | null | undefined) {
  return parseReportPayload(parseJson<ReportPayload | null>(rawChecksJson, null));
}

function extractMissingPages(payload: ReportPayload | null, rawJson?: string | null) {
  const payloadMissing = Array.isArray(payload?.missingPages) ? payload?.missingPages : [];
  if (payloadMissing?.length) return payloadMissing;
  const raw = parseJson<string[] | null>(rawJson, null);
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : [];
}

const OEM_LABELS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Subaru', pattern: /subaru/i },
  { label: 'Ford', pattern: /\bford\b/i },
  { label: 'GM', pattern: /\bgm\b|gmc|chevrolet|cadillac/i },
  { label: 'Hyundai', pattern: /hyundai/i },
  { label: 'Kia', pattern: /\bkia\b/i },
  { label: 'Tesla', pattern: /tesla/i },
  { label: 'Nissan', pattern: /nissan|infiniti/i },
  { label: 'Toyota', pattern: /toyota|lexus/i }
];

function detectedOemLabels(payload: ReportPayload | null) {
  const signals = Array.isArray(payload?.checks?.oemSignals) ? payload?.checks?.oemSignals : [];
  const joined = signals.join(' ');
  return OEM_LABELS.filter((row) => row.pattern.test(joined)).map((row) => row.label);
}

function buildConversionSignals(payload: ReportPayload | null, siteFeature: ShopBaseRow['latestSiteFeature']) {
  const items = [
    payload?.checks?.estimateCtaDetected || siteFeature?.hasEstimateCta ? 'Estimate CTA' : null,
    payload?.checks?.onlineEstimateFlow || siteFeature?.hasOnlineEstimateFlow ? 'Online estimate flow' : null,
    payload?.checks?.reviewProofPresent || siteFeature?.hasReviewProof ? 'Review proof' : null,
    payload?.checks?.mapEmbedDetected || siteFeature?.hasMapEmbed ? 'Map embed' : null,
    payload?.checks?.directionsOrReviewsCta || siteFeature?.hasDirectionsCta ? 'Directions / reviews CTA' : null,
    payload?.checks?.insuranceGuidancePresent || siteFeature?.hasInsuranceGuidance ? 'Insurance guidance' : null
  ].filter(Boolean) as string[];

  return items.length ? items : ['No strong conversion signals detected'];
}

function chainLabel(websiteUrl?: string | null) {
  const url = websiteUrl || '';
  if (/gerbercollision\.com/i.test(url)) return 'Gerber';
  if (/caliber\.com/i.test(url)) return 'Caliber';
  if (/crashchampions/i.test(url)) return 'Crash Champions';
  if (/serviceking/i.test(url)) return 'Service King';
  if (/maaco/i.test(url)) return 'Maaco';
  return null;
}

function fallbackPoint(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 28 + (index % 4) * 8;
  return {
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius
  };
}

function projectMarketMap(rows: ShopBaseRow[]) {
  const withCoords = rows.filter((row) => typeof row.lat === 'number' && typeof row.lng === 'number');
  if (withCoords.length >= 4) {
    const lats = withCoords.map((row) => row.lat as number);
    const lngs = withCoords.map((row) => row.lng as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return rows.map((row, index) => {
      if (typeof row.lat !== 'number' || typeof row.lng !== 'number') {
        return { shopId: row.id, ...fallbackPoint(index, rows.length) };
      }
      const lngSpan = Math.max(0.01, maxLng - minLng);
      const latSpan = Math.max(0.01, maxLat - minLat);
      const x = 12 + ((row.lng - minLng) / lngSpan) * 76;
      const y = 15 + (1 - (row.lat - minLat) / latSpan) * 70;
      return { shopId: row.id, x, y };
    });
  }

  return rows.map((row, index) => ({ shopId: row.id, ...fallbackPoint(index, rows.length) }));
}

function buildTopologyLayout(nodes: Array<{ id: string; tone: Tone; label: string }>, focalId: string | null) {
  if (!nodes.length) return { nodes: [], edges: [] as Array<{ sourceId: string; targetId: string }> };
  const focalIndex = Math.max(
    0,
    focalId ? nodes.findIndex((node) => node.id === focalId) : 0
  );
  const ordered = [...nodes];
  const [focal] = ordered.splice(focalIndex, 1);
  const positioned = [
    {
      id: focal.id,
      label: focal.label,
      shortLabel: focal.label.slice(0, 4).toUpperCase(),
      x: 50,
      y: 50,
      tone: focal.tone,
      radius: 14
    }
  ];

  ordered.forEach((node, index) => {
    const angle = (index / Math.max(ordered.length, 1)) * Math.PI * 2;
    const radius = 28 + (index % 3) * 10;
    positioned.push({
      id: node.id,
      label: node.label,
      shortLabel: node.label.slice(0, 4).toUpperCase(),
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
      tone: node.tone,
      radius: 8 + Math.max(0, 4 - Math.floor(index / 2))
    });
  });

  return { nodes: positioned };
}

export async function getAdminMarketConsoleState(marketSlug: string): Promise<AdminMarketConsoleState | null> {
  const markets = await prisma.market.findMany({
    where: { vertical: 'collision' },
    select: { id: true, city: true, state: true, regionKey: true }
  });

  const market = markets.find((row) => slugify(row.city) === marketSlug);
  if (!market) return null;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60_000);

  const [
    shops,
    queueMetrics,
    queueToday,
    recentQueueJobs,
    reviewCount,
    siteFeatureCount,
    insurerCount,
    graphEdgeCount
  ] = await Promise.all([
    prisma.shop.findMany({
      where: { marketId: market.id },
      orderBy: { updatedAt: 'desc' },
      take: 180,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        address: true,
        websiteUrl: true,
        publicProfileSlug: true,
        lat: true,
        lng: true,
        scans: {
          where: { executionStatus: 'completed' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            createdAt: true,
            finishedAt: true,
            scoreTotal: true,
            scoreWebsite: true,
            scoreLocal: true,
            scoreIntent: true,
            rawChecksJson: true,
            publicStatus: true
          }
        },
        reviewObservations: {
          orderBy: { observedAt: 'desc' },
          take: 1,
          select: {
            observedAt: true,
            rating: true,
            reviewCount: true
          }
        },
        siteFeatureObservations: {
          orderBy: { observedAt: 'desc' },
          take: 1,
          select: {
            observedAt: true,
            checkedUrlCount: true,
            servicePageCount: true,
            oemSignalCount: true,
            hasEstimateCta: true,
            hasOnlineEstimateFlow: true,
            hasReviewProof: true,
            hasMapEmbed: true,
            hasDirectionsCta: true,
            hasLocationFinder: true,
            hasInsuranceGuidance: true,
            hasWarranty: true,
            hasAdasContent: true,
            hasCertificationPage: true,
            missingPagesJson: true
          }
        },
        insuranceRelationshipObservations: {
          orderBy: [{ observedAt: 'desc' }, { confidence: 'desc' }],
          take: 8,
          select: {
            insurerName: true,
            relationshipType: true,
            signalType: true,
            confidence: true,
            observedAt: true
          }
        }
      }
    }),
    getQueueMetrics(),
    prisma.queueJob.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.queueJob.findMany({
      where: { createdAt: { gte: dayAgo } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        type: true,
        status: true,
        attempts: true,
        runAt: true,
        errorType: true
      }
    }),
    prisma.shopReviewObservation.count({ where: { marketId: market.id } }),
    prisma.shopSiteFeatureObservation.count({ where: { marketId: market.id } }),
    prisma.shopInsuranceRelationshipObservation.count({ where: { shop: { marketId: market.id } } }),
    prisma.shopGraphEdge.count({
      where: {
        OR: [{ sourceShop: { marketId: market.id } }, { targetShop: { marketId: market.id } }]
      }
    })
  ]);

  const rows: ShopBaseRow[] = shops.map((shop) => ({
    id: shop.id,
    name: shop.name,
    city: shop.city,
    state: shop.state,
    address: shop.address,
    websiteUrl: shop.websiteUrl,
    publicProfileSlug: shop.publicProfileSlug,
    lat: shop.lat,
    lng: shop.lng,
    latestScan: shop.scans[0] || null,
    latestReview: shop.reviewObservations[0] || null,
    latestSiteFeature: shop.siteFeatureObservations[0] || null,
    insurers: shop.insuranceRelationshipObservations
  }));

  const scoredRows = rows.filter((row) => row.latestScan);
  const leaderboardRows = [...scoredRows].sort((a, b) => (b.latestScan?.scoreTotal || 0) - (a.latestScan?.scoreTotal || 0));
  const mapRows = leaderboardRows.slice(0, 80);
  const projected = projectMarketMap(mapRows);
  const pointByShopId = new Map(projected.map((point) => [point.shopId, point]));
  const averageScanAge = average(
    mapRows
      .map((row) => row.latestScan?.finishedAt || row.latestScan?.createdAt || null)
      .filter(Boolean)
      .map((date) => (Date.now() - (date as Date).getTime()) / (60 * 60_000))
  );

  const topLeaderboard = leaderboardRows.slice(0, 10).map((row, index) => ({
    shopId: row.id,
    rank: index + 1,
    name: row.name,
    city: row.city || market.city,
    reviews: row.latestReview?.reviewCount || 0,
    score: row.latestScan?.scoreTotal || 0,
    oemCount: row.latestSiteFeature?.oemSignalCount || detectedOemLabels(parsePayload(row.latestScan?.rawChecksJson)).length,
    lastScanLabel: formatRelativeTime(row.latestScan?.finishedAt || row.latestScan?.createdAt),
    tone: scoreTone(row.latestScan?.scoreTotal || 0)
  }));

  const opportunities = scoredRows
    .map((row) => {
      const payload = parsePayload(row.latestScan?.rawChecksJson);
      const missingPages = extractMissingPages(payload, row.latestSiteFeature?.missingPagesJson);
      const reviews = row.latestReview?.reviewCount || 0;
      const score = row.latestScan?.scoreTotal || 0;
      const opportunityScore = Math.round(reviews * 0.12 + Math.max(0, 85 - score) * 1.3 + missingPages.length * 3.4);
      return {
        shopId: row.id,
        name: row.name,
        reviews,
        score,
        missingCount: missingPages.length,
        opportunityScore
      };
    })
    .filter((row) => row.reviews >= 25)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 6);

  const topologyShopIds = topLeaderboard.slice(0, 8).map((row) => row.shopId);
  const topologyEdgesRaw = topologyShopIds.length
    ? await prisma.shopGraphEdge.findMany({
        where: {
          observedAt: { gte: ninetyDaysAgo },
          OR: [
            {
              sourceShopId: { in: topologyShopIds },
              targetShopId: { in: topologyShopIds }
            },
            {
              targetShopId: { in: topologyShopIds },
              sourceShopId: { in: topologyShopIds }
            }
          ]
        },
        orderBy: [{ observedAt: 'desc' }],
        take: 18,
        select: {
          sourceShopId: true,
          targetShopId: true
        }
      })
    : [];

  const topologyEdgeKey = new Set<string>();
  const topologyEdges = topologyEdgesRaw.filter((edge) => {
    const key = [edge.sourceShopId, edge.targetShopId].sort().join(':');
    if (topologyEdgeKey.has(key)) return false;
    topologyEdgeKey.add(key);
    return true;
  });

  const topologyNodeRows = topLeaderboard.slice(0, 6).map((row) => ({
    id: row.shopId,
    tone: row.tone,
    label: row.name
  }));
  const topologyLayout = buildTopologyLayout(topologyNodeRows, topLeaderboard[0]?.shopId || null);

  const velocityShopIds = [...topLeaderboard]
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 3)
    .map((row) => row.shopId);
  const velocityObservations = velocityShopIds.length
    ? await prisma.shopReviewObservation.findMany({
        where: {
          shopId: { in: velocityShopIds },
          observedAt: { gte: ninetyDaysAgo }
        },
        orderBy: [{ shopId: 'asc' }, { observedAt: 'asc' }],
        select: {
          shopId: true,
          observedAt: true,
          reviewCount: true
        }
      })
    : [];

  const velocityByShop = new Map<string, Array<{ observedAt: Date; reviewCount: number }>>();
  velocityObservations.forEach((row) => {
    if (typeof row.reviewCount !== 'number') return;
    const list = velocityByShop.get(row.shopId) || [];
    list.push({ observedAt: row.observedAt, reviewCount: row.reviewCount });
    velocityByShop.set(row.shopId, list);
  });
  const velocityMax = Math.max(
    100,
    ...Array.from(velocityByShop.values()).flat().map((row) => row.reviewCount)
  );
  const reviewVelocity = topLeaderboard
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 3)
    .map((row) => {
      const series = velocityByShop.get(row.shopId) || [];
      const points = series.map((point) => ({
        x: Math.round(((point.observedAt.getTime() - ninetyDaysAgo.getTime()) / (Date.now() - ninetyDaysAgo.getTime())) * 100),
        y: 100 - Math.round((point.reviewCount / velocityMax) * 85)
      }));
      return {
        shopId: row.shopId,
        label: row.name,
        tone: row.tone,
        latestCount: row.reviews,
        points
      };
    });

  const oemCounts = new Map<string, number>();
  leaderboardRows.forEach((row) => {
    const payload = parsePayload(row.latestScan?.rawChecksJson);
    detectedOemLabels(payload).forEach((label) => {
      oemCounts.set(label, (oemCounts.get(label) || 0) + 1);
    });
  });
  const totalShops = rows.length || 1;
  const oemMatrix = OEM_LABELS.map((row) => {
    const foundCount = oemCounts.get(row.label) || 0;
    const gapCount = Math.max(0, totalShops - foundCount);
    return {
      label: row.label,
      foundCount,
      gapCount,
      foundPercent: Math.round((foundCount / totalShops) * 100),
      gapPercent: Math.round((gapCount / totalShops) * 100)
    };
  })
    .filter((row) => row.foundCount > 0 || row.gapCount > 0)
    .slice(0, 8);

  const totalObservations = reviewCount + siteFeatureCount + insurerCount + graphEdgeCount;
  const publishedCount = scoredRows.filter((row) => row.latestScan?.publicStatus === 'published').length;
  const privateCount = Math.max(0, scoredRows.length - publishedCount);
  const queueRecentByBucket = new Array(12).fill(0);
  recentQueueJobs.forEach((job) => {
    const hoursAgo = (Date.now() - job.runAt.getTime()) / (60 * 60_000);
    if (hoursAgo < 0 || hoursAgo > 24) return;
    const bucket = Math.min(11, Math.floor(hoursAgo / 2));
    queueRecentByBucket[11 - bucket] += 1;
  });
  const oneHourJobs = recentQueueJobs.filter((job) => job.runAt.getTime() >= Date.now() - 60 * 60_000);
  const oneHourFailures = oneHourJobs.filter((job) => job.status === 'failed').length;
  const errorRate = oneHourJobs.length ? `${((oneHourFailures / oneHourJobs.length) * 100).toFixed(2)}%` : '0.00%';

  const duplicateWarnings = Array.from(
    rows.reduce((map, row) => {
      const host = row.websiteUrl ? new URL(row.websiteUrl).hostname.replace(/^www\./i, '').toLowerCase() : '';
      if (!host) return map;
      const existing = map.get(host) || { host, shopIds: new Set<string>(), cities: new Set<string>() };
      existing.shopIds.add(row.id);
      if (row.city) existing.cities.add(row.city);
      map.set(host, existing);
      return map;
    }, new Map<string, { host: string; shopIds: Set<string>; cities: Set<string> }>())
      .values()
  )
    .filter((row) => row.shopIds.size > 1)
    .map((row) => ({
      host: row.host,
      shopCount: row.shopIds.size,
      cities: Array.from(row.cities).slice(0, 4)
    }))
    .sort((a, b) => b.shopCount - a.shopCount)
    .slice(0, 8);

  const chainClusters = Array.from(
    rows.reduce((map, row) => {
      const label = chainLabel(row.websiteUrl);
      if (!label || !row.latestScan) return map;
      const existing = map.get(label) || { label, count: 0, scores: [] as number[] };
      existing.count += 1;
      existing.scores.push(row.latestScan.scoreTotal || 0);
      map.set(label, existing);
      return map;
    }, new Map<string, { label: string; count: number; scores: number[] }>())
      .values()
  )
    .map((row) => ({
      label: row.label,
      locationCount: row.count,
      avgScore: Math.round(average(row.scores))
    }))
    .sort((a, b) => b.locationCount - a.locationCount)
    .slice(0, 6);

  const suspiciousScans = scoredRows
    .map((row) => {
      const payload = parsePayload(row.latestScan?.rawChecksJson);
      const checkedPages = row.latestSiteFeature?.checkedUrlCount || payload?.checks?.checkedUrls?.length || 0;
      const fetchNotes = payload?.checks?.fetchNotes || [];
      const score = row.latestScan?.scoreTotal || 0;
      let reason: string | null = null;
      if (score <= 10) reason = 'Very low score';
      else if (checkedPages <= 1) reason = 'Single-page crawl';
      else if (fetchNotes.length >= 3) reason = 'Multiple fetch warnings';
      else if ((row.latestReview?.reviewCount || 0) > 100 && score < 35) reason = 'High-authority weak SEO outlier';
      if (!reason) return null;
      return {
        shopId: row.id,
        name: row.name,
        reason,
        score
      };
    })
    .filter(Boolean as never)
    .slice(0, 8) as Array<{ shopId: string; name: string; reason: string; score: number }>;

  const topologyOverlapByShop = new Map<string, Array<{ name: string; percent: number; tone: Tone }>>();
  if (topologyEdges.length) {
    const scoreByShopId = new Map(topLeaderboard.map((row) => [row.shopId, row.score]));
    const nameByShopId = new Map(rows.map((row) => [row.id, row.name]));
    topologyEdges.forEach((edge) => {
      const sourceScore = scoreByShopId.get(edge.sourceShopId) || 50;
      const targetScore = scoreByShopId.get(edge.targetShopId) || 50;
      const percent = Math.max(40, Math.min(92, 100 - Math.abs(sourceScore - targetScore)));
      const tone = percent >= 80 ? 'warning' : percent >= 60 ? 'neutral' : 'weak';

      const sourceList = topologyOverlapByShop.get(edge.sourceShopId) || [];
      sourceList.push({ name: nameByShopId.get(edge.targetShopId) || 'Competitor', percent, tone });
      topologyOverlapByShop.set(edge.sourceShopId, sourceList);

      const targetList = topologyOverlapByShop.get(edge.targetShopId) || [];
      targetList.push({ name: nameByShopId.get(edge.sourceShopId) || 'Competitor', percent, tone });
      topologyOverlapByShop.set(edge.targetShopId, targetList);
    });
  }

  const drawerShops = Object.fromEntries(
    leaderboardRows.slice(0, 20).map((row) => {
      const payload = parsePayload(row.latestScan?.rawChecksJson);
      const oemCertifications = detectedOemLabels(payload);
      const overlap = (topologyOverlapByShop.get(row.id) || []).sort((a, b) => b.percent - a.percent).slice(0, 3);
      const crawlErrors =
        payload?.pageFetchMeta?.filter((page) => !page.ok).length ||
        payload?.checks?.fetchNotes?.length ||
        0;
      const publicReportUrl =
        row.publicProfileSlug && row.latestScan?.publicStatus === 'published'
          ? `/collision-repair-seo-report/${slugify(row.state || 'co')}/${slugify(row.city || market.city)}/${row.publicProfileSlug}`
          : null;

      return [
        row.id,
        {
          id: row.id,
          name: row.name,
          addressLabel: row.address || marketLabel(row.city || market.city, row.state || market.state),
          websiteLabel: row.websiteUrl ? new URL(row.websiteUrl).hostname.replace(/^www\./i, '') : 'No website on file',
          publicReportUrl,
          reviews: row.latestReview?.reviewCount || 0,
          score: row.latestScan?.scoreTotal || 0,
          typeLabel: row.websiteUrl && /(caliber|gerber|crashchampions|serviceking|maaco)/i.test(row.websiteUrl) ? 'Chain' : 'Independent',
          scoreTone: scoreTone(row.latestScan?.scoreTotal || 0),
          oemCertifications,
          insurerMentions: row.insurers.slice(0, 6).map((insurer) => ({
            name: insurer.insurerName,
            signal: insurer.signalType,
            confidence: insurer.confidence
          })),
          conversionSignals: buildConversionSignals(payload, row.latestSiteFeature),
          overlap,
          crawl: {
            lastScanLabel: formatDateTime(row.latestScan?.finishedAt || row.latestScan?.createdAt),
            checkedPagesLabel: String(
              row.latestSiteFeature?.checkedUrlCount || payload?.pageFetchMeta?.length || payload?.checks?.checkedUrls?.length || 0
            ),
            crawlErrorsLabel: crawlErrors === 0 ? '0 (Clean)' : String(crawlErrors)
          }
        }
      ];
    })
  );

  return {
    market: {
      id: market.id,
      city: market.city,
      state: market.state,
      label: marketLabel(market.city, market.state),
      slug: marketSlug
    },
    nav: [
      { label: 'Overview', href: `/admin/markets/${marketSlug}`, active: true },
      { label: 'Admin', href: '/admin' },
      { label: 'Benchmarks', href: `/api/admin/benchmark-report?marketId=${market.id}&take=12` }
    ],
    metrics: {
      totalShops: rows.length,
      totalObservations,
      queueToday,
      medianRuntimeMs:
        typeof queueMetrics.medianDurationMsByType.scan_execute === 'number'
          ? queueMetrics.medianDurationMsByType.scan_execute
          : median(scoredRows.map((row) => row.latestScan?.finishedAt && row.latestScan?.createdAt ? row.latestScan.finishedAt.getTime() - row.latestScan.createdAt.getTime() : 0).filter(Boolean as never)),
      updatedAtLabel: new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(new Date())
    },
    map: {
      averageScanAgeHours: averageScanAge ? `${averageScanAge.toFixed(1)}h avg` : 'n/a',
      points: mapRows.map((row) => {
        const point = pointByShopId.get(row.id) || { x: 50, y: 50 };
        return {
          shopId: row.id,
          name: row.name,
          city: row.city || market.city,
          score: row.latestScan?.scoreTotal || 0,
          reviews: row.latestReview?.reviewCount || 0,
          typeLabel: row.websiteUrl && /(caliber|gerber|crashchampions|serviceking|maaco)/i.test(row.websiteUrl) ? 'Chain' : 'Independent',
          oemCount: row.latestSiteFeature?.oemSignalCount || 0,
          tone: scoreTone(row.latestScan?.scoreTotal || 0),
          x: point.x,
          y: point.y,
          scanAgeLabel: formatRelativeTime(row.latestScan?.finishedAt || row.latestScan?.createdAt)
        };
      })
    },
    leaderboard: topLeaderboard,
    opportunities,
    topology: {
      focalShopId: topLeaderboard[0]?.shopId || null,
      nodes: topologyLayout.nodes,
      edges: topologyEdges.map((edge) => ({
        sourceId: edge.sourceShopId,
        targetId: edge.targetShopId
      }))
    },
    reviewVelocity: {
      yMax: velocityMax,
      series: reviewVelocity
    },
    oemMatrix,
    systemOperations: {
      queuedJobs: queueMetrics.counts.pending,
      runningJobs: queueMetrics.counts.processing,
      errorRate1h: errorRate,
      workerStatus: `${queueMetrics.counts.processing > 0 ? 'active' : 'idle'} / postgres-backed`,
      recentQueueActivity: queueRecentByBucket,
      recentJobs: recentQueueJobs.slice(0, 8).map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        attempts: job.attempts,
        runAtLabel: formatRelativeTime(job.runAt),
        errorLabel: job.errorType || 'Clean'
      }))
    },
    integrity: {
      publishedCount,
      privateCount,
      duplicateWarnings,
      chainClusters,
      suspiciousScans
    },
    drawer: {
      defaultShopId: topLeaderboard[0]?.shopId || null,
      shops: drawerShops
    }
  };
}
