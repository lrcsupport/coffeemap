import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CACHE_TTL_DAYS = 30;
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Verify auth token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");

  // Create Supabase clients
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Verify user
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { username, userLat, userLng } = body;
  if (!username) {
    return new Response(JSON.stringify({ error: "username is required" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const handle = username.toLowerCase().trim();

  // Check geocoding cache first
  const { data: cached } = await supabaseAdmin
    .from("geocoding_cache")
    .select("*")
    .eq("username", handle)
    .single();

  if (cached) {
    const cachedAge = Date.now() - new Date(cached.cached_at).getTime();
    const ttlMs = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (cachedAge < ttlMs) {
      return new Response(JSON.stringify({ location: formatCacheResult(cached) }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  // Build search query from handle
  const query = formatQuery(handle);

  // Try Google Places Text Search
  let location = null;
  if (GOOGLE_PLACES_API_KEY) {
    location = await searchGooglePlaces(query, userLat, userLng);

    // Broader search without type restriction
    if (!location) {
      location = await searchGooglePlacesBroad(query, userLat, userLng);
    }
  }

  // Fallback to Nominatim
  if (!location) {
    location = await searchNominatim(query, userLat, userLng);
  }

  // Cache the result (even null results to avoid re-querying)
  if (location) {
    await supabaseAdmin.from("geocoding_cache").upsert({
      username: handle,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      city: location.city,
      state: location.state,
      country: location.country,
      display_name: location.displayName,
      rating: location.rating,
      phone_number: location.phoneNumber,
      website_url: location.websiteURL,
      google_place_id: location.googlePlaceID,
      source: location.source,
      cached_at: new Date().toISOString(),
    }, { onConflict: "username" });
  }

  return new Response(
    JSON.stringify({ location: location || null }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    }
  );
}

// ---- Google Places ----

async function searchGooglePlaces(query, userLat, userLng) {
  return _googleSearch(query, userLat, userLng, "cafe");
}

async function searchGooglePlacesBroad(query, userLat, userLng) {
  return _googleSearch(query, userLat, userLng, null);
}

async function _googleSearch(query, userLat, userLng, includedType) {
  try {
    const body = { textQuery: query, maxResultCount: 5 };
    if (includedType) body.includedType = includedType;
    if (userLat && userLng) {
      body.locationBias = {
        circle: {
          center: { latitude: userLat, longitude: userLng },
          radius: 50000,
        },
      };
    }

    const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.location,places.id,places.nationalPhoneNumber,places.websiteUri,places.rating",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      latitude: place.location.latitude,
      longitude: place.location.longitude,
      address: place.formattedAddress || null,
      city: null,
      state: null,
      country: null,
      source: "google",
      rating: place.rating || null,
      phoneNumber: place.nationalPhoneNumber || null,
      websiteURL: place.websiteUri || null,
      googlePlaceID: place.id || null,
      displayName: place.displayName?.text || null,
    };
  } catch (e) {
    console.error("Google Places error:", e);
    return null;
  }
}

// ---- Nominatim ----

async function searchNominatim(query, userLat, userLng) {
  try {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    if (userLat && userLng) {
      url += `&viewbox=${userLng - 0.5},${userLat + 0.5},${userLng + 0.5},${userLat - 0.5}&bounded=0`;
    }

    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "CoffeeMap/1.0" },
    });
    if (!resp.ok) return null;

    const results = await resp.json();
    const best =
      results.find(
        (r) => r.type === "cafe" || r.type === "restaurant" || r.class === "amenity" || r.class === "shop"
      ) || results[0];

    if (!best) return null;

    const addr = best.address || {};
    return {
      latitude: parseFloat(best.lat),
      longitude: parseFloat(best.lon),
      address: best.display_name,
      city: addr.city || addr.town || addr.village || null,
      state: addr.state || null,
      country: addr.country || null,
      source: "nominatim",
      rating: null,
      phoneNumber: null,
      websiteURL: null,
      googlePlaceID: null,
      displayName: null,
    };
  } catch (e) {
    console.error("Nominatim error:", e);
    return null;
  }
}

// ---- Helpers ----

function formatQuery(username) {
  let query = username.replace(/_/g, " ").replace(/\./g, " ").replace(/-/g, " ");
  query = query.replace(/([a-z])([A-Z])/g, "$1 $2");
  query = query.replace(
    /(coffee|roast|brew|cafe|bakery|kitchen|house|shop|bar|pub|grill|bistro)/gi,
    (match, p1, offset) => (offset > 0 ? " " + p1 : p1)
  );
  return query.replace(/\s+/g, " ").trim();
}

function formatCacheResult(cached) {
  return {
    latitude: cached.latitude,
    longitude: cached.longitude,
    address: cached.address,
    city: cached.city,
    state: cached.state,
    country: cached.country,
    source: cached.source,
    rating: cached.rating,
    phoneNumber: cached.phone_number,
    websiteURL: cached.website_url,
    googlePlaceID: cached.google_place_id,
    displayName: cached.display_name,
  };
}

export const config = { path: "/api/geocode" };
