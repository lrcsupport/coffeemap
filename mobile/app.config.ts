import 'dotenv/config';
import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'CoffeeMap',
  slug: 'coffeemap',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  scheme: 'coffeemap',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1a1a',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.coffeemap.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'CoffeeMap uses your location to show nearby coffee shops you follow.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'CoffeeMap uses your location in the background to alert you when you\'re near a coffee shop you follow.',
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1a1a',
    },
    edgeToEdgeEnabled: true,
    package: 'com.coffeemap.app',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['./plugins/withShareExtension'],
  extra: {
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY ?? '',
  },
});
