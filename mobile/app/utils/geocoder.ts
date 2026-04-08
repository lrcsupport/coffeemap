import { GOOGLE_PLACES_API_KEY } from '../config/apiKeys';

export type GeocodedPlace = {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string;
  phoneNumber: string | null;
  website: string | null;
  openingHours: string[] | null;
  priceLevel: number | null;
  rating: number | null;
  googleMapsUrl: string;
};

// ── Main geocoding function ─────────────────────────────────

/**
 * Geocodes a place by searching Google Places Text Search API.
 * Tries multiple query strategies in order of specificity.
 * Returns the best confident result or null.
 */
export async function geocodePlace(
  name: string,
  location: string | null,
  handle: string
): Promise<GeocodedPlace | null> {
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'your_api_key_here') {
    console.warn('[geocoder] No Google Places API key configured. Skipping geocoding.');
    return null;
  }

  // Strategy 1: displayName + location (most specific)
  if (name && location) {
    const result = await searchPlaces(`${name} ${location}`);
    if (result && isConfidentMatch(result, handle, name)) {
      return result;
    }
  }

  // Strategy 2: handle + location
  if (location) {
    const handleQuery = handle.replace(/[_.]/g, ' ');
    const result = await searchPlaces(`${handleQuery} ${location}`);
    if (result && isConfidentMatch(result, handle, name)) {
      return result;
    }
  }

  // Strategy 3: displayName alone (broadest)
  if (name) {
    const result = await searchPlaces(name);
    if (result && isConfidentMatch(result, handle, name)) {
      return result;
    }
  }

  // Strategy 4: handle as search term
  const handleQuery = handle.replace(/[_.]/g, ' ');
  const result = await searchPlaces(handleQuery);
  if (result && isConfidentMatch(result, handle, name)) {
    return result;
  }

  console.warn(`[geocoder] No confident match found for "${name}" (@${handle})`);
  return null;
}

// ── Google Places Text Search ───────────────────────────────

async function searchPlaces(query: string): Promise<GeocodedPlace | null> {
  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': [
            'places.displayName',
            'places.formattedAddress',
            'places.location',
            'places.id',
            'places.nationalPhoneNumber',
            'places.websiteUri',
            'places.currentOpeningHours',
            'places.priceLevel',
            'places.rating',
            'places.googleMapsUri',
          ].join(','),
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 3,
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[geocoder] Places API returned ${response.status} for "${query}"`);
      return null;
    }

    const data = await response.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      name: place.displayName?.text ?? query,
      formattedAddress: place.formattedAddress ?? '',
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      placeId: place.id ?? '',
      phoneNumber: place.nationalPhoneNumber ?? null,
      website: place.websiteUri ?? null,
      openingHours: place.currentOpeningHours?.weekdayDescriptions ?? null,
      priceLevel: parsePriceLevel(place.priceLevel),
      rating: place.rating ?? null,
      googleMapsUrl: place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    };
  } catch (err) {
    console.warn(`[geocoder] Search failed for "${query}":`, err);
    return null;
  }
}

function parsePriceLevel(level: string | undefined): number | null {
  if (!level) return null;
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level] ?? null;
}

// ── Confidence check ────────────────────────────────────────

/**
 * Checks if the returned place name loosely matches the Instagram handle
 * or display name. Prevents totally wrong results from being accepted.
 */
export function isConfidentMatch(
  result: GeocodedPlace,
  handle: string,
  displayName: string
): boolean {
  const resultName = result.name.toLowerCase();
  const resultAddr = result.formattedAddress.toLowerCase();

  // Tokenize handle (split on _ and .)
  const handleTokens = handle
    .toLowerCase()
    .split(/[_.]/)
    .filter((t) => t.length > 2);

  // Tokenize display name
  const nameTokens = displayName
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  // Check if any significant handle token appears in result name
  const handleMatch = handleTokens.some(
    (token) => resultName.includes(token) || resultAddr.includes(token)
  );

  // Check if any display name word appears in result name
  const nameMatch = nameTokens.some(
    (token) => resultName.includes(token) || resultAddr.includes(token)
  );

  // At least one type of match required
  return handleMatch || nameMatch;
}

// ── Reverse geocoding (address → lat/lng) ───────────────────

/**
 * Converts a user-typed address to lat/lng using Google Geocoding API.
 * Use this when the user manually enters an address.
 */
export async function reverseGeocodeFromAddress(
  address: string
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'your_api_key_here') {
    console.warn('[geocoder] No API key for reverse geocoding.');
    return null;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address)}` +
      `&key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const result = data.results?.[0];
    if (!result) return null;

    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (err) {
    console.warn('[geocoder] Reverse geocode failed:', err);
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Formats a price level number as dollar signs.
 */
export function formatPriceLevel(level: number | null): string {
  if (level === null) return '';
  return '$'.repeat(Math.max(1, level));
}

/**
 * Formats a rating as stars string.
 */
export function formatRating(rating: number | null): string {
  if (rating === null) return '';
  return `${rating.toFixed(1)} ★`;
}
