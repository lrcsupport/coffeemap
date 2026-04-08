import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, PlaceCategory } from '../types';
import { parseInstagramProfile, type ParsedProfile } from '../utils/instagramParser';

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

export default function AddPlaceScreen({ route, navigation }: Props) {
  const initialHandle = route.params?.handle ?? '';

  const [handle, setHandle] = useState(initialHandle);
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('coffee_shop');
  const [location, setLocation] = useState('');
  const [emoji, setEmoji] = useState('☕');
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(false);

  const runParser = useCallback(async (h: string) => {
    if (!h) return;
    setLoading(true);
    setParsed(false);
    try {
      const profile = await parseInstagramProfile(h);
      setParsedProfile(profile);
      setHandle(profile.handle);
      setDisplayName(profile.displayName ?? '');
      setCategory(profile.category);
      setEmoji(profile.emoji);
      if (profile.location) setLocation(profile.location);
      setParsed(true);
    } catch {
      // Fallback already handled inside parser
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialHandle) {
      runParser(initialHandle);
    }
  }, [initialHandle, runParser]);

  const handleSave = () => {
    console.log('Save place:', {
      handle,
      displayName,
      category,
      emoji,
      location,
      bio: parsedProfile?.bio,
      website: parsedProfile?.website,
      followerCount: parsedProfile?.followerCount,
    });
    navigation.goBack();
  };

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

      {/* Loading state */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.loadingText}>Parsing Instagram profile...</Text>
        </View>
      ) : null}

      {/* Parsed preview card */}
      {parsed && parsedProfile && !loading ? (
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
            {parsedProfile.location ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{parsedProfile.location}</Text>
              </View>
            ) : null}
            {parsedProfile.website ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaIcon}>🌐</Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {parsedProfile.website}
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
      {!loading && handle ? (
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
        disabled={!handle || loading}
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
    marginBottom: 24,
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
