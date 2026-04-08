import Constants from 'expo-constants';

/**
 * Central API key access. Reads from Expo extra config (set via app.json or .env).
 * Never hardcode keys — they come from environment or app config.
 */

function getEnvVar(key: string): string | undefined {
  // Try expo-constants extra first (set via app.json "extra")
  const extra = Constants.expirationDate ? undefined : (Constants as any).expoConfig?.extra;
  if (extra?.[key]) return extra[key];

  // Try process.env (available via babel dotenv plugin or EAS secrets)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }

  return undefined;
}

export const GOOGLE_PLACES_API_KEY = getEnvVar('GOOGLE_PLACES_API_KEY') ?? '';

/**
 * Call this at app startup to warn about missing keys in dev mode.
 */
export function checkApiKeys(): void {
  if (__DEV__) {
    if (!GOOGLE_PLACES_API_KEY || GOOGLE_PLACES_API_KEY === 'your_api_key_here') {
      console.warn(
        '[apiKeys] GOOGLE_PLACES_API_KEY is not set.\n' +
        'Copy .env.example to .env and add your key.\n' +
        'Geocoding will not work without it.'
      );
    }
  }
}
