import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, PlaceCategory } from '../types';
import { parseInstagramProfile, type ParsedProfile } from '../utils/instagramParser';
import {
  geocodePlace,
  reverseGeocodeFromAddress,
  formatPriceLevel,
  formatRating,
  type GeocodedPlace,
} from '../utils/geocoder';

// Conditionally import MapView — not available on web
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch {
    // Maps not available (web or missing native module)
  }
}

type Props = NativeStackScreenProps<RootStackParamList, 'AddPlace'>;

const CATEGORIES: { label: string; value: PlaceCategory; emoji: string }[] = [
  { label: 'Coffee Shop', value: 'coffee_shop', emoji: '☕' },
  { label: 'Roastery', value: 'roastery', emoji: '🫘' },
  { label: 'Cafe', value: 'cafe', emoji: '🍵' },
  { label: 'Brewery', value: 'brewery', emoji: '🍺' },
  { label: 'Distillery', value: 'distillery', emoji: '🥃' },
  { label: 'Winery', value: 'winery', emoji: '🍷' },
  { label: 'Restaurant', value: 'restaurant', emoji: '🍽️' },
];

type LoadingPhase = 'idle' | 'parsing' | 'geocoding' | 'done';

export default function AddPlaceScreen({ route, navigation }: Props) {
  const initialHandle = route.params?.handle ?? '';

  // Form state
  const [handle, setHandle] = useState(initialHandle);
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('coffee_shop');
  const [location, setLocation] = useState('');
  const [emoji, setEmoji] = useState('☕');
  const [manualAddress, setManualAddress] = useState('');

  // Parsed/geocoded data
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null);
  const [geocodedPlace, setGeocodedPlace] = useState<GeocodedPlace | null>(null);

  // UI state
  const [phase, setPhase] = useState<LoadingPhase>('idle');
  const [parsed, setParsed] = useState(false);
  const [geocoded, setGeocoded] = useState(false);
  const [addressSearching, setAddressSearching] = useState(false);

  const runParser = useCallback(async (h: string) => {
    if (!h) return;
    setPhase('parsing');
    setParsed(false);
    setGeocoded(false);
    setGeocodedPlace(null);

    try {
      const profile = await parseInstagramProfile(h);
      setParsedProfile(profile);
      setHandle(profile.handle);
      setDisplayName(profile.displayName ?? '');
      setCategory(profile.category);
      setEmoji(profile.emoji);
      if (profile.location) setLocation(profile.location);
      setParsed(true);

      // Automatically geocode after parsing
      setPhase('geocoding');
      const name = profile.displayName ?? profile.handle;
      const loc = profile.location ?? null;
      const geo = await geocodePlace(name, loc, profile.handle);
      if (geo) {
        setGeocodedPlace(geo);
        setLocation(geo.formattedAddress);
        setGeocoded(true);
      }
    } catch {
      // Fallback already handled inside parser
    } finally {
      setPhase('done');
    }
  }, []);

  useEffect(() => {
    if (initialHandle) {
      runParser(initialHandle);
    }
  }, [initialHandle, runParser]);

  const handleAddressSearch = async () => {
    if (!manualAddress.trim()) return;
    setAddressSearching(true);
    const result = await reverseGeocodeFromAddress(manualAddress);
    if (result) {
      setGeocodedPlace({
        name: displayName || handle,
        formattedAddress: result.formattedAddress,
        lat: result.lat,
        lng: result.lng,
        placeId: '',
        phoneNumber: null,
        website: null,
        openingHours: null,
        priceLevel: null,
        rating: null,
        googleMapsUrl: `https://www.google.com/maps/@${result.lat},${result.lng},17z`,
      });
      setLocation(result.formattedAddress);
      setGeocoded(true);
    }
    setAddressSearching(false);
  };

  const handleSave = () => {
    console.log('Save place:', {
      handle,
      displayName,
      category,
      emoji,
      location,
      lat: geocodedPlace?.lat,
      lng: geocodedPlace?.lng,
      placeId: geocodedPlace?.placeId,
      phoneNumber: geocodedPlace?.phoneNumber,
      website: geocodedPlace?.website ?? parsedProfile?.website,
      rating: geocodedPlace?.rating,
      priceLevel: geocodedPlace?.priceLevel,
      openingHours: geocodedPlace?.openingHours,
      bio: parsedProfile?.bio,
      followerCount: parsedProfile?.followerCount,
    });
    navigation.goBack();
  };

  const isLoading = phase === 'parsing' || phase === 'geocoding';
  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Add Place</Text>

      {/* Shared banner */}
      {initialHandle ? (
        <View style={styles.sharedBanner}>
          <Text style={styles.sharedLabel}>Shared from Instagram</Text>
          <Text style={styles.sharedHandle}>@{initialHandle}</Text>
        </View>
      ) : null}

      {/* Loading states */}
      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.loadingText}>
            {phase === 'parsing' ? 'Parsing Instagram profile...' : 'Finding location...'}
          </Text>
        </View>
      ) : null}

      {/* Parsed preview card */}
      {parsed && parsedProfile && !isLoading ? (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewEmoji}>{emoji}</Text>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>
                {displayName || parsedProfile.handle}
              </Text>
              <Text style={styles.previewHandle}>@{parsedProfile.handle}</Text>
            </View>
            {parsedProfile.followerCount ? (
              <View style={styles.followerBadge}>
                <Text style={styles.followerCount}>
                  {parsedProfile.followerCount}
                </Text>
                <Text style={styles.followerLabel}>followers</Text>
              </View>
            ) : null}
          </View>

          {parsedProfile.bio ? (
            <Text style={styles.previewBio} numberOfLines={3}>
              {parsedProfile.bio}
            </Text>
          ) : null}

          <View style={styles.previewMeta}>
            {location ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{location}</Text>
              </View>
            ) : null}
            {(geocodedPlace?.website ?? parsedProfile?.website) ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>🌐</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {geocodedPlace?.website ?? parsedProfile?.website}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaIcon}>{selectedCategory?.emoji}</Text>
              <Text style={styles.metaText}>
                {selectedCategory?.label ?? 'Unknown'}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Geocoded place card */}
      {geocoded && geocodedPlace && !isLoading ? (
        <View style={styles.geoCard}>
          <Text style={styles.geoCardTitle}>Location Found</Text>

          {/* Map preview (native only) */}
          {MapView && geocodedPlace.lat !== 0 ? (
            <View style={styles.mapPreview}>
              <MapView
                style={styles.mapView}
                initialRegion={{
                  latitude: geocodedPlace.lat,
                  longitude: geocodedPlace.lng,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {Marker ? (
                  <Marker
                    coordinate={{
                      latitude: geocodedPlace.lat,
                      longitude: geocodedPlace.lng,
                    }}
                    title={geocodedPlace.name}
                  />
                ) : null}
              </MapView>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>
                📍 {geocodedPlace.lat.toFixed(4)}, {geocodedPlace.lng.toFixed(4)}
              </Text>
            </View>
          )}

          <Text style={styles.geoAddress}>{geocodedPlace.formattedAddress}</Text>

          <View style={styles.geoMeta}>
            {geocodedPlace.rating ? (
              <View style={styles.geoMetaItem}>
                <Text style={styles.geoMetaValue}>
                  {formatRating(geocodedPlace.rating)}
                </Text>
                <Text style={styles.geoMetaLabel}>Google Rating</Text>
              </View>
            ) : null}
            {geocodedPlace.priceLevel !== null ? (
              <View style={styles.geoMetaItem}>
                <Text style={styles.geoMetaValue}>
                  {formatPriceLevel(geocodedPlace.priceLevel)}
                </Text>
                <Text style={styles.geoMetaLabel}>Price</Text>
              </View>
            ) : null}
            {geocodedPlace.phoneNumber ? (
              <View style={styles.geoMetaItem}>
                <Text style={styles.geoMetaValue}>{geocodedPlace.phoneNumber}</Text>
                <Text style={styles.geoMetaLabel}>Phone</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Manual address entry (when geocoding fails) */}
      {parsed && !geocoded && !isLoading ? (
        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Location not found automatically</Text>
          <Text style={styles.manualHint}>Enter the address to search:</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={[styles.input, styles.manualInput]}
              value={manualAddress}
              onChangeText={setManualAddress}
              placeholder="123 Main St, City, State"
              placeholderTextColor="#555"
              returnKeyType="search"
              onSubmitEditing={handleAddressSearch}
            />
            <TouchableOpacity
              style={[styles.searchBtn, addressSearching && styles.btnDisabled]}
              onPress={handleAddressSearch}
              disabled={addressSearching}
            >
              {addressSearching ? (
                <ActivityIndicator size="small" color="#1a1a1a" />
              ) : (
                <Text style={styles.searchBtnText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Form fields */}
      <Text style={styles.label}>Instagram Handle</Text>
      <TextInput
        style={styles.input}
        value={handle}
        onChangeText={setHandle}
        placeholder="username"
        placeholderTextColor="#555"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Business name"
        placeholderTextColor="#555"
      />

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="City, State or address"
        placeholderTextColor="#555"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryBtn,
              category === cat.value && styles.categoryBtnActive,
            ]}
            onPress={() => {
              setCategory(cat.value);
              setEmoji(cat.emoji);
            }}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.categoryLabel,
                category === cat.value && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Re-parse button */}
      {!isLoading && handle ? (
        <TouchableOpacity
          style={styles.reparseBtn}
          onPress={() => runParser(handle)}
        >
          <Text style={styles.reparseBtnText}>Re-parse Profile</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[styles.btn, styles.btnSave, !handle && styles.btnDisabled]}
        onPress={handleSave}
        disabled={!handle || isLoading}
      >
        <Text style={styles.btnText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, styles.btnCancel]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.btnCancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5A623',
    marginBottom: 24,
  },
  sharedBanner: {
    backgroundColor: '#2a2a2a',
    borderLeftWidth: 3,
    borderLeftColor: '#F5A623',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  sharedLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  sharedHandle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Loading
  loadingCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },

  // Preview card
  previewCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewEmoji: {
    fontSize: 32,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  previewHandle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  followerBadge: {
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  followerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5A623',
  },
  followerLabel: {
    fontSize: 10,
    color: '#888',
  },
  previewBio: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
    marginBottom: 12,
  },
  previewMeta: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#aaa',
    flex: 1,
  },

  // Geocoded place card
  geoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2d4a2d',
  },
  geoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ade80',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mapPreview: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mapView: {
    flex: 1,
  },
  mapPlaceholder: {
    height: 80,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mapPlaceholderText: {
    color: '#aaa',
    fontSize: 14,
  },
  geoAddress: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
    lineHeight: 20,
  },
  geoMeta: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  geoMetaItem: {
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  geoMetaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5A623',
  },
  geoMetaLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },

  // Manual address entry
  manualCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4a3a2a',
  },
  manualTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5A623',
    marginBottom: 4,
  },
  manualHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontWeight: '700',
    color: '#1a1a1a',
    fontSize: 14,
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryBtnActive: {
    borderColor: '#F5A623',
    backgroundColor: '#3a2a10',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#888',
  },
  categoryLabelActive: {
    color: '#F5A623',
    fontWeight: '600',
  },
  reparseBtn: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 24,
  },
  reparseBtnText: {
    color: '#F5A623',
    fontSize: 14,
    fontWeight: '500',
  },
  btn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnSave: {
    backgroundColor: '#F5A623',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
});
