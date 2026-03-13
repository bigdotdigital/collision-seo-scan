import { normalizeWebsiteUrl } from '@/lib/security/url';

export type GooglePlaceProfile = {
  placeId: string;
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

export async function fetchGooglePlaceProfile(args: {
  shopName: string;
  city: string;
  websiteUrl?: string | null;
  addressHint?: string | null;
  stateHint?: string | null;
}): Promise<{ source: 'live' | 'fallback'; profile: GooglePlaceProfile | null; detail: string }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  if (!apiKey) {
    return {
      source: 'fallback',
      profile: null,
      detail: 'GOOGLE_PLACES_API_KEY not configured.'
    };
  }

  const query = [args.shopName, args.addressHint, args.city, args.stateHint]
    .filter(Boolean)
    .join(' ')
    .trim();
  if (!query) {
    return {
      source: 'fallback',
      profile: null,
      detail: 'Missing shop/city query.'
    };
  }

  try {
    let res: Response | null = null;
    let json:
      | {
          places?: Array<Record<string, unknown>>;
          error?: { message?: string };
        }
      | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
          'x-goog-fieldmask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.nationalPhoneNumber,places.primaryTypeDisplayName'
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'en',
          regionCode: 'US',
          maxResultCount: 5
        }),
        cache: 'no-store'
      });

      json = (await res.json().catch(() => null)) as
        | {
            places?: Array<Record<string, unknown>>;
            error?: { message?: string };
          }
        | null;

      if (res.ok) break;
      if (res.status < 500 && res.status !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }

    if (!res) {
      return {
        source: 'fallback',
        profile: null,
        detail: 'Google Places request could not be started.'
      };
    }

    if (!res.ok) {
      return {
        source: 'fallback',
        profile: null,
        detail: json?.error?.message || `Google Places request failed (${res.status}).`
      };
    }

    const places = Array.isArray(json?.places) ? json.places : [];
    if (places.length === 0) {
      return { source: 'fallback', profile: null, detail: 'No matching place result found.' };
    }

    const targetHost = (() => {
      try {
        const normalized = normalizeWebsiteUrl(args.websiteUrl || '');
        if (!normalized) return '';
        return new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();
      } catch {
        return '';
      }
    })();

    const score = (row: Record<string, unknown>) => {
      const name = String((row.displayName as { text?: string } | undefined)?.text || '').toLowerCase();
      const website = String(row.websiteUri || '').toLowerCase();
      const formattedAddress = String(row.formattedAddress || '').toLowerCase();
      const cityHint = args.city.toLowerCase();
      const stateHint = (args.stateHint || '').toLowerCase();
      const addressHint = (args.addressHint || '').toLowerCase();
      let points = 0;
      if (name.includes(args.shopName.toLowerCase().split(' ')[0] || '')) points += 2;
      if (targetHost && website.includes(targetHost)) points += 3;
      if (name.includes(cityHint) || formattedAddress.includes(cityHint)) points += 1;
      if (stateHint && formattedAddress.includes(stateHint)) points += 1;
      if (addressHint) {
        const streetNumber = addressHint.match(/\b\d{2,6}\b/)?.[0] || '';
        if (streetNumber && formattedAddress.includes(streetNumber)) points += 2;
        const addressWords = addressHint
          .split(/\s+/)
          .map((part) => part.replace(/[^a-z0-9]/gi, '').toLowerCase())
          .filter((part) => part.length >= 4)
          .slice(0, 4);
        const matchedWords = addressWords.filter((part) => formattedAddress.includes(part)).length;
        points += matchedWords;
      }
      return points;
    };

    const picked = [...places].sort((a, b) => score(b) - score(a))[0];
    const displayName = (picked.displayName as { text?: string } | undefined)?.text || '';
    const formattedAddress = String(picked.formattedAddress || '') || null;
    const addressParts = formattedAddress
      ? formattedAddress.split(',').map((part) => part.trim())
      : [];
    const city = addressParts.length >= 2 ? addressParts[addressParts.length - 3] || null : null;
    const stateZip = addressParts.length >= 2 ? addressParts[addressParts.length - 2] || '' : '';
    const state = stateZip ? stateZip.split(' ')[0] || null : null;

    const profile: GooglePlaceProfile = {
      placeId: String(picked.id || ''),
      name: displayName || args.shopName,
      formattedAddress,
      city,
      state,
      lat: typeof (picked.location as { latitude?: unknown } | undefined)?.latitude === 'number'
        ? ((picked.location as { latitude: number }).latitude || null)
        : null,
      lng: typeof (picked.location as { longitude?: unknown } | undefined)?.longitude === 'number'
        ? ((picked.location as { longitude: number }).longitude || null)
        : null,
      rating: typeof picked.rating === 'number' ? picked.rating : null,
      userRatingCount:
        typeof picked.userRatingCount === 'number' ? picked.userRatingCount : null,
      websiteUri: String(picked.websiteUri || '') || null,
      googleMapsUri: String(picked.googleMapsUri || '') || null,
      nationalPhoneNumber: String(picked.nationalPhoneNumber || '') || null,
      primaryTypeDisplayName:
        String((picked.primaryTypeDisplayName as { text?: string } | undefined)?.text || '') ||
        null
    };

    if (!profile.placeId) {
      return { source: 'fallback', profile: null, detail: 'Google Places result missing place id.' };
    }

    return { source: 'live', profile, detail: 'Live Google Places profile matched.' };
  } catch (error) {
    return {
      source: 'fallback',
      profile: null,
      detail: error instanceof Error ? error.message : 'Google Places request error.'
    };
  }
}
