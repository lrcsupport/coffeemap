import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { Place, PlaceCategory, RootStackParamList } from '../types';
import { CATEGORY_META } from '../types';
import { getAllPlaces, deletePlace, markVisited } from '../utils/storage';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Section = {
  title: string;
  emoji: string;
  data: Place[];
};

export default function ListScreen() {
  const navigation = useNavigation<Nav>();
  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadPlaces();
    }, [])
  );

  const loadPlaces = async () => {
    const all = await getAllPlaces();
    setPlaces(all);
  };

  const filtered = searchQuery
    ? places.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.instagramHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.formattedAddress.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : places;

  // Group by category
  const sections: Section[] = [];
  const categoryOrder: PlaceCategory[] = ['coffee', 'brewery', 'distillery', 'winery', 'restaurant', 'unknown'];
  for (const cat of categoryOrder) {
    const items = filtered.filter((p) => p.category === cat);
    if (items.length > 0) {
      const meta = CATEGORY_META[cat];
      sections.push({ title: meta.label, emoji: meta.emoji, data: items });
    }
  }

  const handleDelete = (place: Place) => {
    Alert.alert(
      'Delete Place',
      `Remove ${place.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlace(place.id);
            await loadPlaces();
          },
        },
      ]
    );
  };

  const handleToggleVisited = async (place: Place) => {
    await markVisited(place.id);
    await loadPlaces();
  };

  const renderItem = ({ item }: { item: Place }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('PlaceDetail', { placeId: item.id })}
      activeOpacity={0.7}
    >
      <Text style={styles.rowEmoji}>{item.emoji}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.rowHandle}>@{item.instagramHandle}</Text>
        <Text style={styles.rowAddress} numberOfLines={1}>{item.formattedAddress}</Text>
      </View>
      <View style={styles.rowActions}>
        {item.visited ? (
          <TouchableOpacity style={styles.visitedBadge} onPress={() => handleToggleVisited(item)}>
            <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.unvisitedBadge} onPress={() => handleToggleVisited(item)}>
            <Ionicons name="ellipse-outline" size={24} color="#555" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#c0392b" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEmoji}>{section.emoji}</Text>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  if (places.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>☕</Text>
          <Text style={styles.emptyTitle}>No places saved yet</Text>
          <Text style={styles.emptyText}>
            Share an Instagram profile to CoffeeMap, or tap + on the Map tab to add a place.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('AddPlace', {})}
          >
            <Text style={styles.emptyBtnText}>+ Add a Place</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No results for "{searchQuery}"</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  listContent: { paddingBottom: 24 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2a2a2a',
    margin: 12, borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#333',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 10 },

  // Sections
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#222',
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#aaa', flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  sectionCount: { fontSize: 12, color: '#666', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  rowEmoji: { fontSize: 24 },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rowHandle: { fontSize: 12, color: '#F5A623' },
  rowAddress: { fontSize: 12, color: '#888' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitedBadge: { padding: 4 },
  unvisitedBadge: { padding: 4 },
  deleteBtn: { padding: 4 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: '#F5A623', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { fontWeight: '700', color: '#1a1a1a', fontSize: 15 },

  noResults: { padding: 40, alignItems: 'center' },
  noResultsText: { color: '#888', fontSize: 14 },
});
