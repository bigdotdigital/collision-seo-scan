import { upsertShopFromInput } from '@/lib/shop-core';
import { recordShopSourceObservation, refreshShopDigitalPresenceSnapshot } from '@/lib/shop-data';

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

const DENVER_MARKET_CITY_ALLOWLIST = new Set(
  [
    ...DENVER_METRO_CITIES,
    'Wheat Ridge',
    'Sheridan',
    'Glendale',
    'Greenwood Village',
    'Highlands Ranch',
    'Northglenn',
    'Commerce City',
    'Golden'
  ].map((value) => value.toLowerCase())
);

const DISCOVERY_QUERIES = [
  'collision repair',
  'auto body shop',
  'auto body repair',
  'hail damage repair'
] as const;

type PlaceCandidate = {
  id: string;
  name: string;
  formattedAddress: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  nationalPhoneNumber: string | null;
  primaryTypeDisplayName: string | null;
};

function looksLikeCollisionShop(candidate: PlaceCandidate) {
  const haystack = `${candidate.name} ${candidate.primaryTypeDisplayName || ''}`.toLowerCase();
  if (/(yelp|facebook|instagram|directory|best|top 10)/i.test(haystack)) return false;
  return /(collision|auto body|body shop|hail|paint|dent|coachworks|automotive)/i.test(haystack);
}

function parsePlace(row: Record<string, unknown>): PlaceCandidate | null {
  const id = String(row.id || '');
  const name = String((row.displayName as { text?: string } | undefined)?.text || '').trim();
  if (!id || !name) return null;

  const formattedAddress = String(row.formattedAddress || '') || null;
  const addressParts = formattedAddress ? formattedAddress.split(',').map((part) => part.trim()) : [];
  const city = addressParts.length >= 3 ? addressParts[1] || null : null;
  const stateZip = addressParts.length >= 3 ? addressParts[2] || '' : addressParts.length >= 2 ? addressParts[1] || '' : '';
  const state = stateZip ? stateZip.split(/\s+/)[0] || null : null;

  return {
    id,
    name,
    formattedAddress,
    city,
    state,
    lat:
      typeof (row.location as { latitude?: unknown } | undefined)?.latitude === 'number'
        ? (row.location as { latitude: number }).latitude
        : null,
    lng:
      typeof (row.location as { longitude?: unknown } | undefined)?.longitude === 'number'
        ? (row.location as { longitude: number }).longitude
        : null,
    rating: typeof row.rating === 'number' ? row.rating : null,
    userRatingCount: typeof row.userRatingCount === 'number' ? row.userRatingCount : null,
    websiteUri: String(row.websiteUri || '') || null,
    googleMapsUri: String(row.googleMapsUri || '') || null,
    nationalPhoneNumber: String(row.nationalPhoneNumber || '') || null,
    primaryTypeDisplayName: String((row.primaryTypeDisplayName as { text?: string } | undefined)?.text || '') || null
  };
}

function isAllowedDenverMarketCity(city: string | null) {
  if (!city) return false;
  return DENVER_MARKET_CITY_ALLOWLIST.has(city.toLowerCase());
}

async function searchGooglePlaces(textQuery: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
      'x-goog-fieldmask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.primaryTypeDisplayName'
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'en',
      regionCode: 'US',
      maxResultCount: 20
    }),
    cache: 'no-store',
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`places_search_failed:${res.status}:${body.slice(0, 160)}`);
  }

  const json = (await res.json().catch(() => null)) as { places?: Array<Record<string, unknown>> } | null;
  const rows = Array.isArray(json?.places) ? json.places : [];
  return rows.map(parsePlace).filter((row): row is PlaceCandidate => Boolean(row)).filter(looksLikeCollisionShop);
}

export async function discoverDenverMetroShops() {
  const seen = new Set<string>();
  const discovered: PlaceCandidate[] = [];
  const failures: Array<{ city: string; query: string; error: string }> = [];

  for (const city of DENVER_METRO_CITIES) {
    for (const query of DISCOVERY_QUERIES) {
      const textQuery = `${query} ${city} Colorado`;
      console.info('[discover:denver:start]', JSON.stringify({ city, query, textQuery }));
      let places: PlaceCandidate[] = [];
      try {
        places = await searchGooglePlaces(textQuery);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_error';
        console.error('[discover:denver:error]', JSON.stringify({ city, query, error: message }));
        failures.push({ city, query, error: message });
        continue;
      }
      console.info('[discover:denver:result]', JSON.stringify({ city, query, count: places.length }));
      for (const place of places.filter((row) => isAllowedDenverMarketCity(row.city))) {
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        discovered.push(place);
      }
    }
  }

  let createdOrUpdated = 0;
  let withWebsite = 0;

  for (const place of discovered) {
    console.info(
      '[discover:denver:upsert:start]',
      JSON.stringify({ name: place.name, city: place.city, hasWebsite: Boolean(place.websiteUri), placeId: place.id })
    );
    const shop = await upsertShopFromInput({
      name: place.name,
      websiteUrl: place.websiteUri,
      phone: place.nationalPhoneNumber,
      address: place.formattedAddress,
      city: place.city,
      state: place.state,
      lat: place.lat,
      lng: place.lng,
      googlePlaceId: place.id,
      primaryCategory: place.primaryTypeDisplayName,
      vertical: 'collision'
    });

    await recordShopSourceObservation({
      shopId: shop.id,
      observedAt: new Date(),
      city: place.city,
      state: place.state,
      vertical: 'collision',
      sourceType: 'GOOGLE_MAPS',
      sourceUrl: place.googleMapsUri,
      externalId: place.id,
      observedName: place.name,
      observedPhone: place.nationalPhoneNumber,
      observedAddress: place.formattedAddress,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      metadata: {
        websiteUri: place.websiteUri,
        primaryTypeDisplayName: place.primaryTypeDisplayName,
        lat: place.lat,
        lng: place.lng
      },
      confidence: 0.95
    });

    if (place.websiteUri) {
      await recordShopSourceObservation({
        shopId: shop.id,
        observedAt: new Date(),
        city: place.city,
        state: place.state,
        vertical: 'collision',
        sourceType: 'WEBSITE',
        sourceUrl: place.websiteUri,
        observedName: place.name,
        observedPhone: place.nationalPhoneNumber,
        observedAddress: place.formattedAddress,
        confidence: 0.9
      });
      withWebsite += 1;
    }

    await refreshShopDigitalPresenceSnapshot({ shopId: shop.id });
    createdOrUpdated += 1;
    console.info(
      '[discover:denver:upsert:done]',
      JSON.stringify({ shopId: shop.id, name: shop.name, city: shop.city, createdOrUpdated, withWebsite })
    );
  }

  return {
    cities: [...DENVER_METRO_CITIES],
    queries: [...DISCOVERY_QUERIES],
    discovered: discovered.length,
    createdOrUpdated,
    withWebsite,
    failures
  };
}
