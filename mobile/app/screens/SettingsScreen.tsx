import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { Place, PlaceCategory } from '../types';
import { CATEGORY_META } from '../types';
import { getAllPlaces, clearAllPlaces, exportPlacesJSON } from '../utils/storage';

export default function SettingsScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [showVisited, setShowVisited] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadPlaces();
    }, [])
  );

  const loadPlaces = async () => {
    const all = await getAllPlaces();
    setPlaces(all);
  };

  // Stats
  const totalPlaces = places.length;
  const visitedCount = places.filter((p) => p.visited).length;
  const unvisitedCount = totalPlaces - visitedCount;

  // Category breakdown
  const categoryOrder: PlaceCategory[] = ['coffee', 'brewery', 'distillery', 'winery', 'restaurant', 'unknown'];
  const categoryCounts = categoryOrder
    .map((cat) => ({
      category: cat,
      meta: CATEGORY_META[cat],
      count: places.filter((p) => p.category === cat).length,
    }))
    .filter((c) => c.count > 0);

  const handleExport = async () => {
    try {
      const json = await exportPlacesJSON();
      await Share.share({
        message: json,
        title: 'CoffeeMap Places Export',
      });
    } catch (err) {
      Alert.alert('Export Failed', 'Could not export places data.');
    }
  };

  const handleClearAll = () => {
    if (totalPlaces === 0) {
      Alert.alert('No Data', 'There are no places to clear.');
      return;
    }
    Alert.alert(
      'Clear All Data',
      `This will permanently delete all ${totalPlaces} saved places. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearAllPlaces();
            setPlaces([]);
            Alert.alert('Done', 'All places have been cleared.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stats card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalPlaces}</Text>
            <Text style={styles.statLabel}>Total Places</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4ade80' }]}>{visitedCount}</Text>
            <Text style={styles.statLabel}>Visited</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F5A623' }]}>{unvisitedCount}</Text>
            <Text style={styles.statLabel}>To Visit</Text>
          </View>
        </View>
      </View>

      {/* Category breakdown */}
      {categoryCounts.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By Category</Text>
          {categoryCounts.map((c) => (
            <View key={c.category} style={styles.categoryRow}>
              <Text style={styles.categoryEmoji}>{c.meta.emoji}</Text>
              <Text style={styles.categoryLabel}>{c.meta.label}</Text>
              <View style={styles.categoryBarWrap}>
                <View
                  style={[
                    styles.categoryBar,
                    { width: `${(c.count / totalPlaces) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.categoryCount}>{c.count}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferences</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="eye-outline" size={20} color="#F5A623" />
            <Text style={styles.settingLabel}>Show visited on map</Text>
          </View>
          <Switch
            value={showVisited}
            onValueChange={setShowVisited}
            trackColor={{ false: '#333', true: '#3a5a3a' }}
            thumbColor={showVisited ? '#4ade80' : '#888'}
          />
        </View>
      </View>

      {/* Data management */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Data</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleExport}>
          <Ionicons name="download-outline" size={20} color="#F5A623" />
          <Text style={styles.actionLabel}>Export Places as JSON</Text>
          <Ionicons name="chevron-forward" size={16} color="#555" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={20} color="#c0392b" />
          <Text style={[styles.actionLabel, { color: '#c0392b' }]}>Clear All Data</Text>
          <Ionicons name="chevron-forward" size={16} color="#555" />
        </TouchableOpacity>
      </View>

      {/* App info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>CoffeeMap v1.0.0</Text>
        <Text style={styles.footerSubText}>Find & map your favorite places from Instagram</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 32, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },

  // Category breakdown
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  categoryEmoji: { fontSize: 16, width: 24, textAlign: 'center' },
  categoryLabel: { fontSize: 13, color: '#aaa', width: 80 },
  categoryBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    backgroundColor: '#F5A623',
    borderRadius: 4,
  },
  categoryCount: { fontSize: 13, color: '#888', width: 24, textAlign: 'right' },

  // Settings
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingLabel: { fontSize: 15, color: '#ddd' },

  // Actions
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  actionLabel: { flex: 1, fontSize: 15, color: '#ddd' },

  // Footer
  footer: { alignItems: 'center', marginTop: 16, paddingVertical: 24 },
  footerText: { fontSize: 14, color: '#555', fontWeight: '600' },
  footerSubText: { fontSize: 12, color: '#444', marginTop: 4 },
});
