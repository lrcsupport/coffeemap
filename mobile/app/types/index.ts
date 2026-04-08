export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  instagramHandle: string;
  category: PlaceCategory;
  emoji: string;
}

export type PlaceCategory =
  | 'coffee_shop'
  | 'roastery'
  | 'cafe'
  | 'brewery'
  | 'distillery'
  | 'winery'
  | 'restaurant'
  | 'other';

export type RootStackParamList = {
  Main: undefined;
  AddPlace: { handle?: string };
};
