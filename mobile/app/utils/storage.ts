import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Place, PlaceCategory } from '../types';

const STORAGE_KEY = '@coffeemap_places';

/**
 * Returns all saved places.
 */
export async function getAllPlaces(): Promise<Place[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    return JSON.parse(json) as Place[];
  } catch (err) {
    console.warn('[storage] Failed to load places:', err);
    return [];
  }
}

/**
 * Saves or updates a place. If a place with the same id exists, it's replaced.
 */
export async function savePlace(place: Place): Promise<void> {
  try {
    const places = await getAllPlaces();
    const idx = places.findIndex((p) => p.id === place.id);
    if (idx >= 0) {
      places[idx] = place;
    } else {
      places.push(place);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch (err) {
    console.warn('[storage] Failed to save place:', err);
  }
}

/**
 * Deletes a place by id.
 */
export async function deletePlace(id: string): Promise<void> {
  try {
    const places = await getAllPlaces();
    const filtered = places.filter((p) => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[storage] Failed to delete place:', err);
  }
}

/**
 * Toggles the visited status of a place.
 */
export async function markVisited(id: string): Promise<Place | null> {
  try {
    const places = await getAllPlaces();
    const place = places.find((p) => p.id === id);
    if (!place) return null;
    place.visited = !place.visited;
    place.visitedAt = place.visited ? new Date().toISOString() : null;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    return place;
  } catch (err) {
    console.warn('[storage] Failed to mark visited:', err);
    return null;
  }
}

/**
 * Updates a place's notes.
 */
export async function updateNotes(id: string, notes: string): Promise<void> {
  try {
    const places = await getAllPlaces();
    const place = places.find((p) => p.id === id);
    if (place) {
      place.notes = notes;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    }
  } catch (err) {
    console.warn('[storage] Failed to update notes:', err);
  }
}

/**
 * Returns places filtered by category.
 */
export async function getPlacesByCategory(category: PlaceCategory): Promise<Place[]> {
  const places = await getAllPlaces();
  return places.filter((p) => p.category === category);
}

/**
 * Searches places by name, handle, or address.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  const places = await getAllPlaces();
  const q = query.toLowerCase();
  return places.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.instagramHandle.toLowerCase().includes(q) ||
      p.formattedAddress.toLowerCase().includes(q)
  );
}

/**
 * Clears all saved places.
 */
export async function clearAllPlaces(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Exports all places as a JSON string.
 */
export async function exportPlacesJSON(): Promise<string> {
  const places = await getAllPlaces();
  return JSON.stringify(places, null, 2);
}
