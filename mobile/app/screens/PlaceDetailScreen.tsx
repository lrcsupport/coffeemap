import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList, Place } from '../types';
import { CATEGORY_META } from '../types';
import { getAllPlaces, savePlace, deletePlace, markVisited } from '../utils/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceDetail'>;

export default function PlaceDetailScreen({ route, navigation }: Props) {
  const { placeId } = route.params;
  const [place, setPlace] = useState<Place | null>(null);
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  useEffect(() => {
    loadPlace();
  }, [placeId]);

  const loadPlace = async () => {
    const all = await getAllPlaces();
    const found = all.find((p) => p.id === placeId) ?? null;
    setPlace(found);
    setNotes(found?.notes ?? '');
  };

  const handleToggleVisited = async () => {
    if (!place) return;
    const updated = await markVisited(place.id);
    if (updated) setPlace(updated);
  };

  const handleSaveNotes = async () => {
    if (!place) return;
    const updated = { ...place, notes };
    await savePlace(updated);
    setPlace(updated);
    setNotesDirty(false);
  };

  const handleDelete = () => {
    if (!place) return;
    Alert.alert('Delete Place', `Remove ${place.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePlace(place.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const openInstagram = () => {
    if (!place) return;
    Linking.openURL(`https://instagram.com/${place.instagramHandle}`);
  };

  const openMaps = () => {
    if (!place) return;
    const { lat, lng, name } = place;
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `maps:?q=${label}&ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/@${lat},${lng},17z`,
    });
    if (url) Linking.openURL(url);
  };

  if (!place) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Place not found</Text>
      </View>
    );
  }

  const meta = CATEGORY_META[place.category];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{place.emoji}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{place.name}</Text>
          <Text style={styles.headerHandle}>@{place.instagramHandle}</Text>
        </View>
      </View>

      {/* Category & visited */}
      <View style={styles.badges}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{meta.emoji} {meta.label}</Text>
        </View>
        {place.visited ? (
          <View style={styles.visitedBadge}>
            <Text style={styles.visitedBadgeText}>✓ Visited</Text>
          </View>
        ) : null}
      </View>

      {/* Info rows */}
      <View style={styles.infoCard}>
        <InfoRow icon="location-outline" label="Address" value={place.formattedAddress} />
        {place.rating ? (
          <InfoRow icon="star" label="Rating" value={`${place.rating.toFixed(1)} ★`} />
        ) : null}
        {place.phoneNumber ? (
          <InfoRow icon="call-outline" label="Phone" value={place.phoneNumber} onPress={() => Linking.openURL(`tel:${place.phoneNumber}`)} />
        ) : null}
        {place.website ? (
          <InfoRow icon="globe-outline" label="Website" value={place.website} onPress={() => Linking.openURL(place.website!)} />
        ) : null}
        <InfoRow icon="calendar-outline" label="Saved" value={new Date(place.savedAt).toLocaleDateString()} />
        {place.visitedAt ? (
          <InfoRow icon="checkmark-circle-outline" label="Visited" value={new Date(place.visitedAt).toLocaleDateString()} />
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={openInstagram}>
          <Ionicons name="logo-instagram" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Instagram</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={openMaps}>
          <Ionicons name="navigate-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, place.visited ? styles.actionBtnVisited : styles.actionBtnAmber]}
          onPress={handleToggleVisited}
        >
          <Ionicons name={place.visited ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={place.visited ? '#fff' : '#1a1a1a'} />
          <Text style={[styles.actionBtnText, !place.visited && { color: '#1a1a1a' }]}>
            {place.visited ? 'Visited' : 'Mark Visited'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={(t) => { setNotes(t); setNotesDirty(true); }}
          placeholder="Add personal notes about this place..."
          placeholderTextColor="#555"
          multiline
          textAlignVertical="top"
        />
        {notesDirty ? (
          <TouchableOpacity style={styles.saveNotesBtn} onPress={handleSaveNotes}>
            <Text style={styles.saveNotesBtnText}>Save Notes</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={18} color="#c0392b" />
        <Text style={styles.deleteBtnText}>Delete Place</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  const content = (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={18} color="#F5A623" style={infoStyles.icon} />
      <View style={infoStyles.textWrap}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, onPress && infoStyles.link]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity> : content;
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  icon: { marginTop: 2 },
  textWrap: { flex: 1 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 14, color: '#ddd', lineHeight: 20 },
  link: { color: '#F5A623' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  content: { padding: 20, paddingBottom: 48 },
  notFound: { color: '#888', fontSize: 16, textAlign: 'center', marginTop: 60 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  headerEmoji: { fontSize: 44 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerHandle: { fontSize: 14, color: '#F5A623', marginTop: 4 },

  badges: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  categoryBadge: { backgroundColor: '#2a2a2a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  categoryBadgeText: { fontSize: 13, color: '#aaa' },
  visitedBadge: { backgroundColor: '#1a3a1a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#4ade80' },
  visitedBadgeText: { fontSize: 13, color: '#4ade80', fontWeight: '600' },

  infoCard: { backgroundColor: '#222', borderRadius: 12, paddingHorizontal: 16, marginBottom: 20 },

  actions: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#333',
  },
  actionBtnAmber: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  actionBtnVisited: { backgroundColor: '#4ade80', borderColor: '#4ade80' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  notesSection: { marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  notesInput: {
    backgroundColor: '#2a2a2a', color: '#fff', fontSize: 15,
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#333',
    minHeight: 100,
  },
  saveNotesBtn: { backgroundColor: '#F5A623', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveNotesBtnText: { fontWeight: '700', color: '#1a1a1a', fontSize: 13 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#c0392b',
  },
  deleteBtnText: { color: '#c0392b', fontSize: 14, fontWeight: '600' },
});
