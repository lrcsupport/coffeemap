import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, PlaceCategory } from '../types';

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
  const [category, setCategory] = useState<PlaceCategory>('coffee_shop');

  const handleSave = () => {
    console.log('Save place:', { handle, category });
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Add Place</Text>

      {initialHandle ? (
        <View style={styles.sharedBanner}>
          <Text style={styles.sharedLabel}>Shared from Instagram</Text>
          <Text style={styles.sharedHandle}>@{initialHandle}</Text>
        </View>
      ) : null}

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

      <Text style={styles.label}>Category</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryBtn,
              category === cat.value && styles.categoryBtnActive,
            ]}
            onPress={() => setCategory(cat.value)}
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

      <TouchableOpacity
        style={[styles.btn, styles.btnSave, !handle && styles.btnDisabled]}
        onPress={handleSave}
        disabled={!handle}
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
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
