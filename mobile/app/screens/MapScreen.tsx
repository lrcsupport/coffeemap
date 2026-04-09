import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import type { Place, PlaceCategory, RootStackParamList } from '../types';
import { CATEGORY_META } from '../types';
import { getAllPlaces, markVisited } from '../utils/storage';

// Conditionally import MapView
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch {}
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_W } = Dimensions.get('window');

export default function MapScreen() {
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<any>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeFilter, setActiveFilter] = useState<PlaceCategory | 'all'>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
      setLoading(false);
    })();
  }, []);

  // Reload places every time the screen focuses
  useFocusEffect(
    useCallback(() => {
      loadPlaces();
    }, [])
  );

  useEffect(() => {
    applyFilter(activeFilter, places);
  }, [activeFilter, places]);

  const loadPlaces = async () => {
    const all = await getAllPlaces();
    setPlaces(all);
  };

  const applyFilter = (filter: PlaceCategory | 'all', allPlaces: Place[]) => {
    if (filter === 'all') {
      setFilteredPlaces(allPlaces);
    } else {
      setFilteredPlaces(allPlaces.filter((p) => p.category === filter));
    }
  };

  // Get unique categories that have places
  const activeCategories = Array.from(new Set(places.map((p) => p.category)));

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place);
  };

  const handleMarkVisited = async () => {
    if (!selectedPlace) return;
    const updated = await markVisited(selectedPlace.id);
    if (updated) {
      setSelectedPlace(updated);
      await loadPlaces();
    }
  };

  const handleViewDetails = () => {
    if (!selectedPlace) return;
    navigation.navigate('PlaceDetail', { placeId: selectedPlace.id });
    setSelectedPlace(null);
  };

  const openInstagram = (handle: string) => {
    Linking.openURL(`https://instagram.com/${handle}`);
  };

  // Fit map to show all markers
  const fitToMarkers = useCallback(() => {
    if (!mapRef.current || filteredPlaces.length === 0) return;
    const coords = filteredPlaces.map((p) => ({
      latitude: p.lat,
      longitude: p.lng,
    }));
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 200, left: 40 },
      animated: true,
    });
  }, [filteredPlaces]);

  useEffect(() => {
    if (filteredPlaces.length > 0) {
      setTimeout(fitToMarkers, 300);
    }
  }, [filteredPlaces, fitToMarkers]);

  // Web fallback
  if (!MapView) {
    return (
      <View style={styles.container}>
        <Text style={styles.webFallback}>Map requires a native device (iOS/Android).</Text>
        <Text style={styles.webFallbackSub}>
          {places.length} places saved. Use the List tab to browse.
        </Text>
      </View>
    );
  }

  const initialRegion = userLocation
    ? { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 39.8283, longitude: -98.5795, latitudeDelta: 40, longitudeDelta: 40 };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      ) : null}

      {/* Category filter bar */}
      {activeCategories.length > 0 ? (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter === 'all' && styles.filterBtnActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
              All ({places.length})
            </Text>
          </TouchableOpacity>
          {activeCategories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const count = places.filter((p) => p.category === cat).length;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterBtn, activeFilter === cat && styles.filterBtnActive]}
                onPress={() => setActiveFilter(cat)}
              >
                <Text style={[styles.filterText, activeFilter === cat && styles.filterTextActive]}>
                  {meta.emoji} {meta.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSelectedPlace(null)}
      >
        {filteredPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            onPress={() => handleMarkerPress(place)}
          >
            <View style={[styles.marker, place.visited && styles.markerVisited]}>
              <Text style={styles.markerEmoji}>{place.emoji}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPlace', {})}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Bottom sheet */}
      {selectedPlace ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle}><View style={styles.handleBar} /></View>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetEmoji}>{selectedPlace.emoji}</Text>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetName} numberOfLines={1}>{selectedPlace.name}</Text>
              <TouchableOpacity onPress={() => openInstagram(selectedPlace.instagramHandle)}>
                <Text style={styles.sheetHandle2}>@{selectedPlace.instagramHandle} ↗</Text>
              </TouchableOpacity>
            </View>
            {selectedPlace.visited ? (
              <View style={styles.visitedBadge}>
                <Text style={styles.visitedCheck}>✓</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sheetAddress} numberOfLines={2}>{selectedPlace.formattedAddress}</Text>

          {selectedPlace.rating ? (
            <Text style={styles.sheetRating}>
              {'★'.repeat(Math.round(selectedPlace.rating))}
              {'☆'.repeat(5 - Math.round(selectedPlace.rating))}
              {' '}{selectedPlace.rating.toFixed(1)}
            </Text>
          ) : null}

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetBtn, selectedPlace.visited ? styles.sheetBtnVisited : styles.sheetBtnPrimary]}
              onPress={handleMarkVisited}
            >
              <Text style={styles.sheetBtnText}>
                {selectedPlace.visited ? '✓ Visited' : 'Mark Visited'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetBtnSecondary} onPress={handleViewDetails}>
              <Text style={styles.sheetBtnSecondaryText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Empty state */}
      {!loading && places.length === 0 ? (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyEmoji}>☕</Text>
          <Text style={styles.emptyTitle}>No places yet</Text>
          <Text style={styles.emptyText}>Tap + to add a coffee shop you follow on Instagram</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  map: { flex: 1 },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Web fallback
  webFallback: { color: '#F5A623', fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 100 },
  webFallbackSub: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8 },

  // Filter bar
  filterBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    flexDirection: 'row',
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: 'rgba(26,26,26,0.9)',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    borderWidth: 1, borderColor: '#333',
  },
  filterBtnActive: { backgroundColor: '#3a2a10', borderColor: '#F5A623' },
  filterText: { fontSize: 12, color: '#888' },
  filterTextActive: { color: '#F5A623', fontWeight: '600' },

  // Markers
  marker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  markerVisited: { backgroundColor: '#888' },
  markerEmoji: { fontSize: 18 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 16,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F5A623',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
    zIndex: 5,
  },
  fabText: { fontSize: 28, fontWeight: '400', color: '#1a1a1a', marginTop: -2 },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
    zIndex: 10,
  },
  sheetHandle: { alignItems: 'center', paddingBottom: 8 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#444' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  sheetEmoji: { fontSize: 32 },
  sheetInfo: { flex: 1 },
  sheetName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  sheetHandle2: { fontSize: 13, color: '#F5A623', marginTop: 2 },
  visitedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center',
  },
  visitedCheck: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sheetAddress: { fontSize: 13, color: '#aaa', marginBottom: 6, lineHeight: 18 },
  sheetRating: { fontSize: 13, color: '#F5A623', marginBottom: 12 },
  sheetActions: { flexDirection: 'row', gap: 8 },
  sheetBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  sheetBtnPrimary: { backgroundColor: '#F5A623' },
  sheetBtnVisited: { backgroundColor: '#4ade80' },
  sheetBtnText: { fontWeight: '700', color: '#1a1a1a', fontSize: 14 },
  sheetBtnSecondary: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  sheetBtnSecondaryText: { fontWeight: '600', color: '#aaa', fontSize: 14 },

  // Empty
  emptyOverlay: {
    position: 'absolute', top: '30%', left: 0, right: 0,
    alignItems: 'center', zIndex: 5,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', paddingHorizontal: 40 },
});
