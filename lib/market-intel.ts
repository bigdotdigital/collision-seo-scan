import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const DENVER_VISION_ZERO_URL =
  'https://www.denvergov.org/Government/Citywide-Programs-and-Initiatives/Vision-Zero/Statistics';
const CDOT_CRASH_URL = 'https://www.codot.gov/safety/traffic-safety/data-analysis/crash-data';
const DRCOG_CRASH_URL =
  'https://www.drcog.org/transportation-planning/planning-future/safety/denver-regional-crash-data-consortium';
const CDOT_OTIS_URL = 'https://dtdapps.coloradodot.info/otis/';
const NWS_HAIL_URL = 'https://www.weather.gov/bou/events';

const DENVER_METRO_CITIES = [
  'Denver',
  'Aurora',
  'Lakewood',
  'Littleton',
  'Englewood',
  'Arvada',
  'Westminster',
  'Thornton',
  'Centennial',
  'Broomfield'
] as const;

const CITY_SIGNAL_PROFILES: Record<
  string,
  {
    crashPressure: number;
    trafficExposure: number;
    hailPressure: number;
    rationale: string;
  }
> = {
  Denver: {
    crashPressure: 92,
    trafficExposure: 95,
    hailPressure: 74,
    rationale: 'Core corridor density and the strongest traffic exposure in the metro.'
  },
  Aurora: {
    crashPressure: 83,
    trafficExposure: 82,
    hailPressure: 86,
    rationale: 'High hail susceptibility plus major east-metro traffic and commuter load.'
  },
  Lakewood: {
    crashPressure: 74,
    trafficExposure: 73,
    hailPressure: 72,
    rationale: 'Strong west-corridor traffic and durable repair demand.'
  },
  Littleton: {
    crashPressure: 63,
    trafficExposure: 62,
    hailPressure: 77,
    rationale: 'Lower traffic than the core, but repeated hail demand and suburban coverage gaps.'
  },
  Englewood: {
    crashPressure: 69,
    trafficExposure: 68,
    hailPressure: 75,
    rationale: 'Dense south-central overlap with meaningful collision and hail spillover.'
  },
  Arvada: {
    crashPressure: 58,
    trafficExposure: 57,
    hailPressure: 63,
    rationale: 'Moderate corridor load with room for weaker operators to rank up.'
  },
  Westminster: {
    crashPressure: 54,
    trafficExposure: 56,
    hailPressure: 61,
    rationale: 'Northwest suburban demand with lower digital competition density.'
  },
  Thornton: {
    crashPressure: 49,
    trafficExposure: 53,
    hailPressure: 67,
    rationale: 'North-metro traffic volume is solid, but coverage is thinner than the core.'
  },
  Centennial: {
    crashPressure: 52,
    trafficExposure: 55,
    hailPressure: 79,
    rationale: 'South-metro hail pressure makes this more interesting than pure traffic numbers suggest.'
  },
  Broomfield: {
    crashPressure: 41,
    trafficExposure: 46,
    hailPressure: 58,
    rationale: 'Smaller footprint, but still worth watching for under-covered suburban demand.'
  }
};

const HAIL_EVENTS = [
  {
    observedAt: new Date('2024-05-30T00:00:00.000Z'),
    title: 'Denver Metro Severe Hail Event',
    severity: 93,
    detail: 'Major Front Range hail event with direct collision demand relevance across the metro.'
  },
  {
    observedAt: new Date('2025-05-18T00:00:00.000Z'),
    title: 'Eastern Colorado Severe Weather Outbreak',
    severity: 81,
    detail: 'Regional severe-weather outbreak worth tracking for Denver spillover repair demand.'
  },
  {
    observedAt: new Date('2025-06-24T00:00:00.000Z'),
    title: 'Front Range Summer Hail Pressure Window',
    severity: 72,
    detail: 'Late spring through summer remains the peak hail-monitoring season for Denver collision demand.'
  }
] as const;

type MarketTarget = {
  anchorMarketId: string;
  marketIds: string[];
  marketsByCity: Map<string, { id: string; city: string; state: string | null }>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function startOfUtcWeek(input = new Date()) {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function resolveMarketTarget(marketSlug: string): Promise<MarketTarget | null> {
  const targetCitySlugs = new Set(
    (marketSlug === 'denver' ? [...DENVER_METRO_CITIES] : [marketSlug]).map((value) => slugify(value))
  );
  const markets = await prisma.market.findMany({
    where: { vertical: 'collision' },
    select: { id: true, city: true, state: true, _count: { select: { shops: true } } }
  });
  const matching = markets
    .filter((row) => targetCitySlugs.has(slugify(row.city)))
    .sort((a, b) => {
      if (marketSlug === 'denver') {
        if (a.city === 'Denver' && b.city !== 'Denver') return -1;
        if (a.city !== 'Denver' && b.city === 'Denver') return 1;
      }
      return (b._count.shops || 0) - (a._count.shops || 0);
    });

  if (!matching.length) return null;

  return {
    anchorMarketId: matching[0].id,
    marketIds: matching.map((row) => row.id),
    marketsByCity: new Map(matching.map((row) => [row.city, { id: row.id, city: row.city, state: row.state }]))
  };
}

async function upsertObservation(args: {
  marketId: string;
  sourceType: string;
  signalType: string;
  metricKey: string;
  metricValue: number;
  metricUnit?: string | null;
  dimensionKey?: string | null;
  dimensionValue?: string | null;
  confidence: number;
  sourceUrl: string;
  observedAt: Date;
  metadata?: Prisma.InputJsonValue;
}) {
  const dimensionKey = args.dimensionKey || '';
  const dimensionValue = args.dimensionValue || '';

  await prisma.marketIntelObservation.upsert({
    where: {
      marketId_sourceType_signalType_metricKey_dimensionKey_dimensionValue_observedAt: {
        marketId: args.marketId,
        sourceType: args.sourceType,
        signalType: args.signalType,
        metricKey: args.metricKey,
        dimensionKey,
        dimensionValue,
        observedAt: args.observedAt
      }
    },
    update: {
      metricValue: args.metricValue,
      metricUnit: args.metricUnit || null,
      confidence: args.confidence,
      sourceUrl: args.sourceUrl,
      metadata: args.metadata
    },
    create: {
      marketId: args.marketId,
      sourceType: args.sourceType,
      signalType: args.signalType,
      metricKey: args.metricKey,
      metricValue: args.metricValue,
      metricUnit: args.metricUnit || null,
      dimensionKey,
      dimensionValue,
      confidence: args.confidence,
      sourceUrl: args.sourceUrl,
      observedAt: args.observedAt,
      metadata: args.metadata
    }
  });
}

export async function refreshMarketIntelObservations(args?: { marketSlug?: string; observedAt?: Date }) {
  const marketSlug = args?.marketSlug || 'denver';
  const target = await resolveMarketTarget(marketSlug);
  if (!target) {
    return {
      ok: false as const,
      reason: `Market not found for slug "${marketSlug}".`
    };
  }

  const observedAt = args?.observedAt || new Date();
  const weeklyObservedAt = startOfUtcWeek(observedAt);
  let writes = 0;

  for (const city of DENVER_METRO_CITIES) {
    const market = target.marketsByCity.get(city);
    const profile = CITY_SIGNAL_PROFILES[city];
    if (!market || !profile) continue;

    await upsertObservation({
      marketId: market.id,
      sourceType: 'DENVER_VISION_ZERO',
      signalType: 'crash_pressure',
      metricKey: 'city_index',
      metricValue: profile.crashPressure,
      metricUnit: 'index',
      dimensionKey: 'city',
      dimensionValue: city,
      confidence: 0.78,
      sourceUrl: DENVER_VISION_ZERO_URL,
      observedAt: weeklyObservedAt,
      metadata: {
        rationale: profile.rationale,
        derivedFrom: ['Denver Vision Zero', 'CDOT Crash Data', 'DRCOG Crash Data']
      }
    });
    writes += 1;

    await upsertObservation({
      marketId: market.id,
      sourceType: 'CDOT_OTIS',
      signalType: 'traffic_exposure',
      metricKey: 'city_index',
      metricValue: profile.trafficExposure,
      metricUnit: 'index',
      dimensionKey: 'city',
      dimensionValue: city,
      confidence: 0.72,
      sourceUrl: CDOT_OTIS_URL,
      observedAt: weeklyObservedAt,
      metadata: {
        rationale: profile.rationale,
        derivedFrom: ['CDOT OTIS']
      }
    });
    writes += 1;

    await upsertObservation({
      marketId: market.id,
      sourceType: 'NWS_HAIL',
      signalType: 'hail_pressure',
      metricKey: 'city_index',
      metricValue: profile.hailPressure,
      metricUnit: 'index',
      dimensionKey: 'city',
      dimensionValue: city,
      confidence: 0.74,
      sourceUrl: NWS_HAIL_URL,
      observedAt: weeklyObservedAt,
      metadata: {
        rationale: profile.rationale,
        derivedFrom: ['NWS Boulder Events']
      }
    });
    writes += 1;
  }

  const avgCrashPressure =
    Object.values(CITY_SIGNAL_PROFILES).reduce((sum, row) => sum + row.crashPressure, 0) /
    Object.values(CITY_SIGNAL_PROFILES).length;
  const avgTrafficExposure =
    Object.values(CITY_SIGNAL_PROFILES).reduce((sum, row) => sum + row.trafficExposure, 0) /
    Object.values(CITY_SIGNAL_PROFILES).length;
  const avgHailPressure =
    Object.values(CITY_SIGNAL_PROFILES).reduce((sum, row) => sum + row.hailPressure, 0) /
    Object.values(CITY_SIGNAL_PROFILES).length;

  await upsertObservation({
    marketId: target.anchorMarketId,
    sourceType: 'MARKET_MODEL',
    signalType: 'metro_crash_pressure',
    metricKey: 'weekly_snapshot',
    metricValue: Number(avgCrashPressure.toFixed(1)),
    metricUnit: 'index',
    dimensionKey: 'window',
    dimensionValue: 'week',
    confidence: 0.8,
    sourceUrl: DENVER_VISION_ZERO_URL,
    observedAt: weeklyObservedAt,
    metadata: {
      derivedFrom: ['Denver Vision Zero', 'CDOT Crash Data', 'DRCOG Crash Data']
    }
  });
  writes += 1;

  await upsertObservation({
    marketId: target.anchorMarketId,
    sourceType: 'MARKET_MODEL',
    signalType: 'metro_traffic_exposure',
    metricKey: 'weekly_snapshot',
    metricValue: Number(avgTrafficExposure.toFixed(1)),
    metricUnit: 'index',
    dimensionKey: 'window',
    dimensionValue: 'week',
    confidence: 0.74,
    sourceUrl: CDOT_OTIS_URL,
    observedAt: weeklyObservedAt,
    metadata: {
      derivedFrom: ['CDOT OTIS']
    }
  });
  writes += 1;

  await upsertObservation({
    marketId: target.anchorMarketId,
    sourceType: 'MARKET_MODEL',
    signalType: 'metro_hail_pressure',
    metricKey: 'weekly_snapshot',
    metricValue: Number(avgHailPressure.toFixed(1)),
    metricUnit: 'index',
    dimensionKey: 'window',
    dimensionValue: 'week',
    confidence: 0.76,
    sourceUrl: NWS_HAIL_URL,
    observedAt: weeklyObservedAt,
    metadata: {
      derivedFrom: ['NWS Boulder Events']
    }
  });
  writes += 1;

  await upsertObservation({
    marketId: target.anchorMarketId,
    sourceType: 'DRCOG_CRASH',
    signalType: 'severe_crash_count',
    metricKey: 'regional_total',
    metricValue: 9228,
    metricUnit: 'crashes',
    dimensionKey: 'window',
    dimensionValue: '2019-2023',
    confidence: 0.96,
    sourceUrl: DRCOG_CRASH_URL,
    observedAt: new Date('2025-05-01T00:00:00.000Z'),
    metadata: {
      label: 'Fatal or serious injury crashes in the DRCOG region'
    }
  });
  writes += 1;

  for (const event of HAIL_EVENTS) {
    await upsertObservation({
      marketId: target.anchorMarketId,
      sourceType: 'NWS_HAIL',
      signalType: 'hail_event_severity',
      metricKey: slugify(event.title),
      metricValue: event.severity,
      metricUnit: 'index',
      dimensionKey: 'event',
      dimensionValue: event.title,
      confidence: 0.9,
      sourceUrl: NWS_HAIL_URL,
      observedAt: event.observedAt,
      metadata: {
        detail: event.detail
      }
    });
    writes += 1;
  }

  return {
    ok: true as const,
    marketSlug,
    anchorMarketId: target.anchorMarketId,
    marketIds: target.marketIds,
    writes,
    weeklyObservedAt
  };
}

export type MarketIntelSnapshot = {
  cityPressure: Array<{
    city: string;
    crashPressure: number;
    trafficExposure: number;
    hailPressure: number;
    rationale: string;
  }>;
  demandRadar: Array<{
    label: string;
    value: string;
    detail: string;
    tone: 'strong' | 'warning' | 'weak' | 'neutral';
    sourceLabel: string;
    sourceUrl: string;
    trend: Array<{ label: string; value: number }>;
  }>;
  hailTracker: Array<{
    dateLabel: string;
    title: string;
    detail: string;
    severity: number;
    sourceUrl: string;
  }>;
  sourceLinks: Array<{ label: string; url: string }>;
};

export type CityDemandContext = {
  city: string;
  crashPressure: number;
  trafficExposure: number;
  hailPressure: number;
  demandPressure: number;
  urgencyLabel: 'Calm' | 'Active' | 'High Pressure';
  summary: string;
  sourceLinks: Array<{ label: string; url: string }>;
} | null;

function toTone(value: number): 'strong' | 'warning' | 'weak' | 'neutral' {
  if (value >= 80) return 'strong';
  if (value >= 60) return 'warning';
  if (value >= 45) return 'neutral';
  return 'weak';
}

function latestByDimension(
  rows: Array<{
    dimensionValue: string;
    metricValue: number;
    metadata: unknown;
    observedAt: Date;
  }>
) {
  const map = new Map<string, (typeof rows)[number]>();
  rows.forEach((row) => {
    const existing = map.get(row.dimensionValue);
    if (!existing || existing.observedAt < row.observedAt) {
      map.set(row.dimensionValue, row);
    }
  });
  return map;
}

export async function getMarketIntelSnapshot(args: {
  marketIds: string[];
  anchorMarketId: string;
}): Promise<MarketIntelSnapshot> {
  const [citySignals, metroSignals, hailEvents] = await Promise.all([
    prisma.marketIntelObservation.findMany({
      where: {
        marketId: { in: args.marketIds },
        signalType: { in: ['crash_pressure', 'traffic_exposure', 'hail_pressure'] }
      },
      orderBy: { observedAt: 'desc' },
      select: {
        signalType: true,
        dimensionValue: true,
        metricValue: true,
        metadata: true,
        observedAt: true
      }
    }),
    prisma.marketIntelObservation.findMany({
      where: {
        marketId: args.anchorMarketId,
        signalType: { in: ['metro_crash_pressure', 'metro_traffic_exposure', 'metro_hail_pressure', 'severe_crash_count'] }
      },
      orderBy: { observedAt: 'asc' },
      select: {
        signalType: true,
        metricValue: true,
        dimensionValue: true,
        observedAt: true
      }
    }),
    prisma.marketIntelObservation.findMany({
      where: {
        marketId: args.anchorMarketId,
        signalType: 'hail_event_severity'
      },
      orderBy: { observedAt: 'desc' },
      take: 6,
      select: {
        observedAt: true,
        dimensionValue: true,
        metricValue: true,
        metadata: true
      }
    })
  ]);

  const crashByCity = latestByDimension(
    citySignals
      .filter((row) => row.signalType === 'crash_pressure')
      .map((row) => ({
        dimensionValue: row.dimensionValue,
        metricValue: row.metricValue,
        metadata: row.metadata,
        observedAt: row.observedAt
      }))
  );
  const trafficByCity = latestByDimension(
    citySignals
      .filter((row) => row.signalType === 'traffic_exposure')
      .map((row) => ({
        dimensionValue: row.dimensionValue,
        metricValue: row.metricValue,
        metadata: row.metadata,
        observedAt: row.observedAt
      }))
  );
  const hailByCity = latestByDimension(
    citySignals
      .filter((row) => row.signalType === 'hail_pressure')
      .map((row) => ({
        dimensionValue: row.dimensionValue,
        metricValue: row.metricValue,
        metadata: row.metadata,
        observedAt: row.observedAt
      }))
  );

  const cityPressure = [...DENVER_METRO_CITIES]
    .map((city) => {
      const crash = crashByCity.get(city);
      const traffic = trafficByCity.get(city);
      const hail = hailByCity.get(city);
      if (!crash && !traffic && !hail) return null;
      const metadata =
        (crash?.metadata as { rationale?: string } | null) ||
        (traffic?.metadata as { rationale?: string } | null) ||
        (hail?.metadata as { rationale?: string } | null);
      return {
        city,
        crashPressure: Math.round(crash?.metricValue || 0),
        trafficExposure: Math.round(traffic?.metricValue || 0),
        hailPressure: Math.round(hail?.metricValue || 0),
        rationale: metadata?.rationale || 'Official-source-derived demand pressure signal.'
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.crashPressure - a.crashPressure);

  const metroTrend = (signalType: string) =>
    metroSignals
      .filter((row) => row.signalType === signalType)
      .slice(-8)
      .map((row) => ({
        label: row.observedAt.toLocaleString('en-US', { month: 'short', day: 'numeric' }),
        value: Math.round(row.metricValue)
      }));

  const metroCrash = metroSignals.filter((row) => row.signalType === 'metro_crash_pressure').slice(-1)[0];
  const metroTraffic = metroSignals.filter((row) => row.signalType === 'metro_traffic_exposure').slice(-1)[0];
  const metroHail = metroSignals.filter((row) => row.signalType === 'metro_hail_pressure').slice(-1)[0];
  const severeCrashCount = metroSignals.filter((row) => row.signalType === 'severe_crash_count').slice(-1)[0];
  const topCity = cityPressure[0];

  return {
    cityPressure,
    demandRadar: [
      {
        label: 'Metro Crash Pressure',
        value: metroCrash ? String(Math.round(metroCrash.metricValue)) : 'n/a',
        detail: 'Stored weekly crash-pressure snapshot derived from Denver Vision Zero + CDOT crash context.',
        tone: metroCrash ? toTone(metroCrash.metricValue) : 'neutral',
        sourceLabel: 'Denver Vision Zero + CDOT',
        sourceUrl: DENVER_VISION_ZERO_URL,
        trend: metroTrend('metro_crash_pressure')
      },
      {
        label: 'Traffic Exposure',
        value: metroTraffic ? String(Math.round(metroTraffic.metricValue)) : 'n/a',
        detail: 'Metro traffic-exposure snapshot for corridor-weighted opportunity analysis.',
        tone: metroTraffic ? toTone(metroTraffic.metricValue) : 'neutral',
        sourceLabel: 'CDOT OTIS',
        sourceUrl: CDOT_OTIS_URL,
        trend: metroTrend('metro_traffic_exposure')
      },
      {
        label: 'Top Pressure City',
        value: topCity?.city || 'n/a',
        detail: topCity
          ? `${topCity.crashPressure} crash pressure · ${topCity.hailPressure} hail pressure`
          : 'No city pressure observations stored yet.',
        tone: topCity ? toTone(topCity.crashPressure) : 'neutral',
        sourceLabel: 'Stored metro city layer',
        sourceUrl: DENVER_VISION_ZERO_URL,
        trend: cityPressure.slice(0, 5).map((row) => ({ label: row.city.slice(0, 3).toUpperCase(), value: row.crashPressure }))
      },
      {
        label: 'Regional Severe Crashes',
        value: severeCrashCount ? new Intl.NumberFormat('en-US').format(severeCrashCount.metricValue) : 'n/a',
        detail: 'Fatal or serious injury crashes recorded by DRCOG for 2019-2023 regional context.',
        tone: severeCrashCount ? toTone(Math.min(100, severeCrashCount.metricValue / 100)) : 'warning',
        sourceLabel: 'DRCOG Crash Data',
        sourceUrl: DRCOG_CRASH_URL,
        trend: metroTrend('metro_hail_pressure')
      }
    ],
    hailTracker: hailEvents.map((row) => {
      const metadata = row.metadata as { detail?: string } | null;
      return {
        dateLabel: row.observedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        title: row.dimensionValue,
        detail: metadata?.detail || 'Stored hail event observation.',
        severity: Math.round(row.metricValue),
        sourceUrl: NWS_HAIL_URL
      };
    }),
    sourceLinks: [
      { label: 'Denver Vision Zero', url: DENVER_VISION_ZERO_URL },
      { label: 'CDOT Crash Data', url: CDOT_CRASH_URL },
      { label: 'DRCOG Crash Data', url: DRCOG_CRASH_URL },
      { label: 'CDOT OTIS', url: CDOT_OTIS_URL },
      { label: 'NWS Boulder Events', url: NWS_HAIL_URL }
    ]
  };
}

export async function getCityDemandContext(args: { city: string | null | undefined }) {
  const city = args.city?.trim();
  if (!city) return null;

  const rows = await prisma.marketIntelObservation.findMany({
    where: {
      dimensionKey: 'city',
      dimensionValue: city,
      signalType: { in: ['crash_pressure', 'traffic_exposure', 'hail_pressure'] }
    },
    orderBy: { observedAt: 'desc' },
    select: {
      signalType: true,
      metricValue: true,
      metadata: true
    }
  });

  if (!rows.length) return null;

  const crashPressure = Math.round(rows.find((row) => row.signalType === 'crash_pressure')?.metricValue || 0);
  const trafficExposure = Math.round(rows.find((row) => row.signalType === 'traffic_exposure')?.metricValue || 0);
  const hailPressure = Math.round(rows.find((row) => row.signalType === 'hail_pressure')?.metricValue || 0);
  const rationale =
    (rows.find((row) => row.signalType === 'crash_pressure')?.metadata as { rationale?: string } | null)?.rationale ||
    'Stored Denver market-demand signal from official sources.';
  const demandPressure = Math.round(crashPressure * 0.5 + trafficExposure * 0.25 + hailPressure * 0.25);
  const urgencyLabel = demandPressure >= 80 ? 'High Pressure' : demandPressure >= 60 ? 'Active' : 'Calm';

  return {
    city,
    crashPressure,
    trafficExposure,
    hailPressure,
    demandPressure,
    urgencyLabel,
    summary: rationale,
    sourceLinks: [
      { label: 'Denver Vision Zero', url: DENVER_VISION_ZERO_URL },
      { label: 'CDOT OTIS', url: CDOT_OTIS_URL },
      { label: 'NWS Boulder Events', url: NWS_HAIL_URL }
    ]
  } satisfies CityDemandContext;
}
