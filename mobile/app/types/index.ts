export type PlaceCategory =
  | 'coffee'
  | 'brewery'
  | 'distillery'
  | 'winery'
  | 'restaurant'
  | 'unknown';

export interface Place {
  id: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  instagramHandle: string;
  category: PlaceCategory;
  emoji: string;
  placeId: string | null;
  website: string | null;
  phoneNumber: string | null;
  rating: number | null;
  notes: string | null;
  savedAt: string;
  visited: boolean;
  visitedAt: string | null;
}

export type RootStackParamList = {
  Main: undefined;
  AddPlace: { handle?: string };
  PlaceDetail: { placeId: string };
};

export const CATEGORY_META: Record<PlaceCategory, { label: string; emoji: string }> = {
  coffee: { label: 'Coffee', emoji: '☕' },
  brewery: { label: 'Brewery', emoji: '🍺' },
  distillery: { label: 'Distillery', emoji: '🥃' },
  winery: { label: 'Winery', emoji: '🍷' },
  restaurant: { label: 'Restaurant', emoji: '🍽️' },
  unknown: { label: 'Other', emoji: '📍' },
};
