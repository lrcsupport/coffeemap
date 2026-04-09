import { cleanHandle } from './cleanHandle';
import type { PlaceCategory } from '../types';

export type ParsedProfile = {
  handle: string;
  displayName: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  followerCount: string | null;
  category: PlaceCategory;
  emoji: string;
  rawBio: string | null;
};

// ── Category detection ──────────────────────────────────────

type CategoryRule = {
  category: PlaceCategory;
  emoji: string;
  keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'coffee',
    emoji: '☕',
    keywords: [
      'roast', 'espresso', 'café', 'cafe', 'coffee', 'brew', 'barista',
      'latte', 'pour over', 'pourover', 'specialty', 'cappuccino', 'mocha',
      'drip', 'bean', 'beans', 'coffeehouse', 'coffeeshop', 'third wave',
      'thirdwave', 'roaster', 'roastery', 'roasting', 'micro roast',
      'small batch roast',
    ],
  },
  {
    category: 'brewery',
    emoji: '🍺',
    keywords: [
      'brewery', 'brewing', 'brewpub', 'taproom', 'craft beer', 'ales',
      'lager', 'hops', 'ipa', 'stout', 'pilsner', 'beer',
    ],
  },
  {
    category: 'distillery',
    emoji: '🥃',
    keywords: [
      'distillery', 'distilling', 'whiskey', 'whisky', 'bourbon', 'gin',
      'spirits', 'rum', 'vodka', 'moonshine', 'distilled',
    ],
  },
  {
    category: 'winery',
    emoji: '🍷',
    keywords: [
      'winery', 'wine', 'vineyard', 'vines', 'sommelier', 'cellar',
      'vintage', 'viticulture', 'pinot', 'cabernet', 'merlot',
    ],
  },
  {
    category: 'restaurant',
    emoji: '🍽️',
    keywords: [
      'restaurant', 'kitchen', 'eatery', 'bistro', 'dining', 'chef',
      'food', 'eats', 'grill', 'diner', 'brasserie', 'trattoria',
    ],
  },
];

const DEFAULT_CATEGORY: PlaceCategory = 'unknown';
const DEFAULT_EMOJI = '📍';

/**
 * Detects category from bio text and handle keywords.
 * Returns the best-matching category and its emoji.
 */
export function detectCategory(
  bio: string,
  handle: string
): { category: PlaceCategory; emoji: string } {
  const text = `${handle} ${bio}`.toLowerCase();

  let bestMatch: CategoryRule | null = null;
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.reduce(
      (sum, kw) => sum + (text.includes(kw) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }

  if (bestMatch && bestScore > 0) {
    return { category: bestMatch.category, emoji: bestMatch.emoji };
  }

  return { category: DEFAULT_CATEGORY, emoji: DEFAULT_EMOJI };
}

// ── Bio location extractor ──────────────────────────────────

const US_STATES =
  /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;

const ZIP_CODE = /\b\d{5}(-\d{4})?\b/;

const MAJOR_CITIES = [
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
  'san francisco', 'seattle', 'denver', 'nashville', 'portland', 'oakland',
  'atlanta', 'miami', 'boston', 'minneapolis', 'detroit', 'brooklyn',
  'queens', 'manhattan', 'la', 'sf', 'nyc', 'philly', 'dc',
  'london', 'paris', 'tokyo', 'sydney', 'melbourne', 'toronto', 'vancouver',
  'berlin', 'amsterdam', 'barcelona', 'copenhagen', 'stockholm', 'oslo',
  'dublin', 'lisbon', 'singapore', 'hong kong', 'seoul', 'taipei',
];

/**
 * Scans bio text for location clues: pin emoji, city names, addresses,
 * zip codes, state abbreviations. Returns the best location string or null.
 */
export function extractLocationFromBio(bio: string): string | null {
  if (!bio) return null;

  // 1. Check for 📍 followed by text
  const pinMatch = bio.match(/📍\s*([^\n|•·—–-]+)/);
  if (pinMatch) {
    return pinMatch[1].trim();
  }

  // 2. Check for "Based in <location>" or "Located in <location>"
  const basedIn = bio.match(/(?:based|located|roasted|brewed)\s+in\s+([^\n|•·—–,.]+)/i);
  if (basedIn) {
    return basedIn[1].trim();
  }

  // 3. Check for "City, ST" pattern (e.g., "Portland, OR")
  const cityState = bio.match(/([A-Z][a-zA-Z\s]+),\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/);
  if (cityState) {
    return cityState[0].trim();
  }

  // 4. Check for known city names
  const bioLower = bio.toLowerCase();
  for (const city of MAJOR_CITIES) {
    if (bioLower.includes(city)) {
      // Try to get surrounding context (e.g., "Brooklyn, NY")
      const idx = bioLower.indexOf(city);
      const surrounding = bio.substring(
        Math.max(0, idx - 5),
        Math.min(bio.length, idx + city.length + 10)
      ).trim();
      // Clean up leading/trailing punctuation
      return surrounding.replace(/^[|•·—–\-,\s]+|[|•·—–\-\s]+$/g, '');
    }
  }

  // 5. Check for zip code (weak signal, but still useful)
  const zipMatch = bio.match(ZIP_CODE);
  if (zipMatch) {
    // Try to grab the line containing the zip
    const lines = bio.split(/[\n|•·]/);
    const zipLine = lines.find((l) => l.includes(zipMatch[0]));
    if (zipLine) {
      return zipLine.trim();
    }
  }

  return null;
}

// ── Profile parser ──────────────────────────────────────────

/**
 * Parses an Instagram profile by handle or URL.
 * Attempts to fetch the profile page and extract metadata.
 * Falls back gracefully to handle-based detection if Instagram blocks the request.
 */
export async function parseInstagramProfile(
  input: string
): Promise<ParsedProfile> {
  const handle = cleanHandle(input);

  // Start with handle-based detection as baseline
  const { category, emoji } = detectCategory('', handle);
  const fallback: ParsedProfile = {
    handle,
    displayName: formatHandleAsName(handle),
    bio: null,
    website: null,
    location: null,
    followerCount: null,
    category,
    emoji,
    rawBio: null,
  };

  try {
    const html = await fetchProfilePage(handle);
    if (!html) {
      console.warn(`[instagramParser] Could not fetch profile for @${handle}, using handle-based detection`);
      return fallback;
    }

    const profile = extractFromHtml(html, handle);
    return profile;
  } catch (err) {
    console.warn(`[instagramParser] Error parsing @${handle}, falling back to handle detection:`, err);
    return fallback;
  }
}

async function fetchProfilePage(handle: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      console.warn(`[instagramParser] HTTP ${response.status} for @${handle}`);
      return null;
    }

    return await response.text();
  } catch (err) {
    console.warn(`[instagramParser] Fetch failed for @${handle}:`, err);
    return null;
  }
}

function extractFromHtml(html: string, handle: string): ParsedProfile {
  // Instagram embeds profile data in meta tags and JSON-LD
  const displayName = extractMeta(html, 'og:title')
    ?.replace(/\s*\(@[^)]+\).*$/, '')  // Remove "(@handle) • Instagram..."
    ?.replace(/\s*•\s*Instagram.*$/i, '')
    ?.trim() || null;

  const description = extractMeta(html, 'og:description') ||
    extractMeta(html, 'description') || null;

  // Parse follower count and bio from description
  // Format: "123K Followers, 456 Following, 789 Posts - See Instagram photos and videos from Name (@handle)"
  let followerCount: string | null = null;
  let bio: string | null = null;

  if (description) {
    const followerMatch = description.match(/([\d,.]+[KMB]?)\s*Followers/i);
    if (followerMatch) {
      followerCount = followerMatch[1];
    }

    // Bio is often after the dash
    const dashIdx = description.indexOf(' - ');
    if (dashIdx !== -1) {
      const afterDash = description.substring(dashIdx + 3);
      // Remove "See Instagram photos and videos from..."
      const cleaned = afterDash.replace(
        /See Instagram photos and videos from .+$/i,
        ''
      ).trim();
      if (cleaned.length > 0) {
        bio = cleaned;
      }
    }
  }

  // Try to get bio from JSON in page
  const jsonBio = extractJsonField(html, 'biography');
  if (jsonBio) {
    bio = jsonBio;
  }

  const rawBio = bio;
  const website = extractJsonField(html, 'external_url') ||
    extractMeta(html, 'og:see_also') || null;

  // Detect category from bio + handle
  const { category, emoji } = detectCategory(bio || '', handle);

  // Extract location from bio
  const location = bio ? extractLocationFromBio(bio) : null;

  return {
    handle,
    displayName: displayName || formatHandleAsName(handle),
    bio,
    website,
    location,
    followerCount,
    category,
    emoji,
    rawBio,
  };
}

// ── Helpers ─────────────────────────────────────────────────

function extractMeta(html: string, property: string): string | null {
  // Match both property= and name= attributes
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return null;
}

function extractJsonField(html: string, field: string): string | null {
  const pattern = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i');
  const match = html.match(pattern);
  if (match) {
    // Unescape JSON string
    return match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
      );
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function formatHandleAsName(handle: string): string {
  return handle
    .replace(/[_.]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
