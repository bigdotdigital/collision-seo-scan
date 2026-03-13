import { prisma } from '@/lib/prisma';
import { normalizeSpace } from '@/lib/utils';
import type { Competitor, MapPackResult } from '@/lib/types';
import { hostnameOf, timeoutFetch } from '@/lib/scan-pages';

const NON_SHOP_DOMAINS = [
  'yelp.com',
  'yellowpages.com',
  'mapquest.com',
  'bbb.org',
  'angi.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'tripadvisor.com',
  'wikipedia.org'
];

const CHAIN_DOMAINS = [
  'caliber.com',
  'gerbercollision.com',
  'crashchampions.com',
  'maaco.com',
  'fixauto.com',
  'carstar.com',
  'abraauto.com',
  'serviceking.com',
  'classiccollision.com'
];

const NON_SHOP_TITLE_HINTS = [
  'best',
  'top 10',
  'directory',
  'list of',
  'near me results',
  'reviews for',
  'wiki',
  'reddit'
];

const MAP_PACK_QUERY_TEMPLATES = [
  'collision repair {city}',
  'auto body shop near me',
  'bumper repair {city}',
  'hail damage repair {city}'
];

function isShopCompetitorCandidate(candidate: { name?: string; url?: string }) {
  const host = hostnameOf(candidate.url);
  if (
    host &&
    (NON_SHOP_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`)) ||
      CHAIN_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`)))
  ) {
    return false;
  }

  const name = (candidate.name || '').toLowerCase();
  if (!name.trim()) return false;
  if (NON_SHOP_TITLE_HINTS.some((hint) => name.includes(hint))) return false;
  if (/(yelp|yellow pages|mapquest|tripadvisor|wikipedia|facebook)/i.test(name)) return false;
  return /(collision|auto body|body shop|paint|repair|coachworks|motors|automotive)/i.test(name);
}

function normalizeMapResultName(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = normalizeSpace(value);
  return trimmed.length > 0 ? trimmed : null;
}

function canonicalName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fallbackMapPack(city: string, shopName: string, competitors: Competitor[]): MapPackResult {
  const cityKey = city.trim().toLowerCase();
  const rank1 = competitors[0]?.name || 'Unavailable';
  const rank2 = competitors[1]?.name || 'Unavailable';
  const rank3 = competitors[2]?.name || 'Unavailable';

  return {
    source: 'fallback',
    info: 'Map pack ranks were unavailable in this run and will be pulled on teardown.',
    likelySignals: [
      'Review velocity and star rating advantage',
      'Tighter service + location category match',
      'Stronger city service pages and internal linking',
      'More prominent estimate CTA and conversion flow'
    ],
    queries: MAP_PACK_QUERY_TEMPLATES.map((template) => ({
      query: template.replace('{city}', cityKey),
      rank1,
      rank2,
      rank3,
      yourRank: `${shopName} (position unavailable)`
    }))
  };
}

function extractCachedMapPack(input: unknown): MapPackResult | null {
  if (!input || typeof input !== 'object') return null;
  const row = input as Record<string, unknown>;
  const pack = row.mapPack;
  if (!pack || typeof pack !== 'object') return null;
  const typed = pack as Record<string, unknown>;
  if (!Array.isArray(typed.queries) || typed.queries.length === 0) return null;

  const queries = typed.queries
    .map((query) => query as Record<string, unknown>)
    .map((query) => ({
      query: typeof query.query === 'string' ? query.query : '',
      rank1: typeof query.rank1 === 'string' ? query.rank1 : 'n/a',
      rank2: typeof query.rank2 === 'string' ? query.rank2 : 'n/a',
      rank3: typeof query.rank3 === 'string' ? query.rank3 : 'n/a',
      yourRank: typeof query.yourRank === 'string' ? query.yourRank : 'n/a'
    }))
    .filter((query) => query.query.length > 0);

  if (queries.length === 0) return null;

  return {
    source: 'cached',
    info:
      typeof typed.info === 'string'
        ? typed.info
        : 'Map pack ranks are from a recent cached scan for this market.',
    likelySignals: Array.isArray(typed.likelySignals)
      ? typed.likelySignals.filter((item): item is string => typeof item === 'string').slice(0, 6)
      : [],
    queries
  };
}

export async function getCompetitors(
  city: string,
  shopName: string,
  websiteUrl: string
): Promise<{ competitors: Competitor[]; source: 'live' | 'cached' | 'fallback' }> {
  const cityKey = city.trim().toLowerCase();
  const cacheCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ownHost = hostnameOf(websiteUrl);

  try {
    const recent = await prisma.scan.findFirst({
      where: {
        createdAt: { gte: cacheCutoff },
        OR: [{ websiteUrl }, { shopName: { equals: shopName, mode: 'insensitive' } }]
      },
      orderBy: { createdAt: 'desc' },
      select: { competitorsJson: true }
    });

    if (recent?.competitorsJson) {
      const parsed = JSON.parse(recent.competitorsJson) as unknown;
      if (Array.isArray(parsed)) {
        const competitors = parsed
          .map((item, index) => {
            const row = item as Record<string, unknown>;
            return {
              name:
                typeof row.name === 'string' && row.name.trim()
                  ? row.name
                  : `Competitor ${index + 1}`,
              url: typeof row.url === 'string' ? row.url : undefined,
              note:
                typeof row.note === 'string'
                  ? row.note
                  : 'Live competitor signal from recent cached SERP data.',
              differentiatorGuess:
                typeof row.differentiatorGuess === 'string'
                  ? row.differentiatorGuess
                  : 'Likely stronger local pack visibility and review recency.'
            } as Competitor;
          })
          .filter((item) => isShopCompetitorCandidate(item))
          .filter((item) => hostnameOf(item.url) !== ownHost)
          .slice(0, 3);

        if (competitors.length > 0) {
          return {
            competitors: competitors.map((item) => ({
              ...item,
              note: `Cached within 24h for ${cityKey}.`
            })),
            source: 'cached'
          };
        }
      }
    }
  } catch {
    // cache read should not block scanning
  }

  const serpKey = process.env.SERP_API_KEY;
  if (serpKey) {
    try {
      const query = encodeURIComponent(`${city} collision repair`);
      const endpoint = `https://serpapi.com/search.json?engine=google&q=${query}&api_key=${encodeURIComponent(serpKey)}`;
      const res = await timeoutFetch(endpoint, 10000);
      const json = await res.json();
      const organic = Array.isArray(json.organic_results) ? json.organic_results : [];
      const competitors: Competitor[] = organic
        .map((item: Record<string, unknown>, index: number) => ({
          name: typeof item.title === 'string' ? item.title : `Competitor ${index + 1}`,
          url: typeof item.link === 'string' ? item.link : undefined,
          note: 'Live competitor signal from current SERP data.',
          differentiatorGuess: 'Likely stronger local pack visibility and review recency.'
        }))
        .filter((item: Competitor) => isShopCompetitorCandidate(item))
        .filter((item: Competitor) => hostnameOf(item.url) !== ownHost)
        .slice(0, 3);

      if (competitors.length > 0) {
        return { competitors, source: 'live' };
      }
    } catch {
      // fall through
    }
  }

  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (placesKey) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': placesKey,
          'x-goog-fieldmask':
            'places.displayName,places.websiteUri,places.googleMapsUri,places.primaryTypeDisplayName,places.rating,places.userRatingCount'
        },
        body: JSON.stringify({
          textQuery: `${city} collision repair`,
          languageCode: 'en',
          regionCode: 'US',
          maxResultCount: 8
        }),
        cache: 'no-store'
      });

      const json = (await res.json().catch(() => null)) as
        | { places?: Array<Record<string, unknown>> }
        | null;
      const rows = Array.isArray(json?.places) ? json.places : [];
      const competitors: Competitor[] = rows
        .map((row, index) => ({
          name:
            typeof (row.displayName as { text?: unknown } | undefined)?.text === 'string'
              ? String((row.displayName as { text: string }).text)
              : `Competitor ${index + 1}`,
          url: typeof row.websiteUri === 'string' ? row.websiteUri : undefined,
          note:
            typeof row.googleMapsUri === 'string'
              ? row.googleMapsUri
              : 'Live competitor signal from Google Places.',
          differentiatorGuess:
            typeof row.primaryTypeDisplayName === 'object' &&
            typeof (row.primaryTypeDisplayName as { text?: unknown }).text === 'string'
              ? `Primary category: ${String((row.primaryTypeDisplayName as { text: string }).text)}`
              : 'Live competitor signal from Google Places.'
        }))
        .filter((item: Competitor) => isShopCompetitorCandidate(item))
        .filter((item: Competitor) => hostnameOf(item.url) !== ownHost)
        .filter((item: Competitor) => !item.name.toLowerCase().includes(shopName.toLowerCase()))
        .slice(0, 3);

      if (competitors.length > 0) {
        return { competitors, source: 'live' };
      }
    } catch {
      // fall through
    }
  }

  return { competitors: [], source: 'fallback' };
}

export async function getMapPack(city: string, shopName: string, competitors: Competitor[]) {
  const cityKey = city.trim().toLowerCase();
  const cacheCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const recent = await prisma.scan.findFirst({
      where: {
        createdAt: { gte: cacheCutoff },
        shopName: { equals: shopName, mode: 'insensitive' }
      },
      orderBy: { createdAt: 'desc' },
      select: { rawChecksJson: true }
    });

    if (recent?.rawChecksJson) {
      const cached = extractCachedMapPack(JSON.parse(recent.rawChecksJson));
      if (cached) return cached;
    }
  } catch {
    // cache read should not block scanning
  }

  const serpKey = process.env.SERP_API_KEY;
  if (!serpKey) return fallbackMapPack(city, shopName, competitors);

  const shopKey = canonicalName(shopName);
  const fallback = fallbackMapPack(city, shopName, competitors);

  try {
    const queries = await Promise.all(
      MAP_PACK_QUERY_TEMPLATES.map(async (template) => {
        const query = template.replace('{city}', cityKey);
        const endpoint =
          `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}` +
          `&api_key=${encodeURIComponent(serpKey)}`;
        const res = await timeoutFetch(endpoint, 10_000);
        const json = await res.json();
        const localResults = Array.isArray(json?.local_results) ? json.local_results : [];
        const names = localResults
          .map((entry: Record<string, unknown>) => normalizeMapResultName(entry.title || entry.name))
          .filter((value: string | null): value is string => Boolean(value));

        const found = names.findIndex((name: string) => {
          const key = canonicalName(name);
          return key.includes(shopKey) || shopKey.includes(key);
        });

        return {
          query,
          rank1: names[0] || fallback.queries[0].rank1,
          rank2: names[1] || fallback.queries[0].rank2,
          rank3: names[2] || fallback.queries[0].rank3,
          yourRank:
            found >= 0
              ? `#${found + 1}`
              : names.length > 0
                ? `outside top ${Math.min(names.length, 20)}`
                : 'not found'
        };
      })
    );

    if (queries.some((row) => row.rank1 && row.rank1 !== 'n/a')) {
      return {
        source: 'live',
        info: 'Live map pack ranks pulled from current local search results.',
        likelySignals: fallback.likelySignals,
        queries
      } as MapPackResult;
    }
  } catch {
    // fall through
  }

  return fallback;
}
