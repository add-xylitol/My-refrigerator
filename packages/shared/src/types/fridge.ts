export type QuantityUnit = '个' | '克' | '毫升' | '把' | '袋';

export type ShelfDTO = {
  id: string;
  name: string;
  sort: number;
  type: 'chill' | 'freeze' | 'produce';
  createdAt: string;
};

export type PhotoDTO = {
  id: string;
  shelfId: string;
  url: string;
  annotatedUrl?: string | null;
  takenAt: string;
};

export type ItemDTO = {
  id: string;
  shelfId: string;
  name: string;
  unit: QuantityUnit;
  qty: number;
  expDate: string | null;
  barcode?: string | null;
  photoId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredient = {
  name: string;
  qty: number;
  unit: QuantityUnit | string;
};

export type RecipeStep = {
  order: number;
  summary: string;
  durationMinutes?: number;
};

export type RecipeDTO = {
  id: string;
  title: string;
  minutes: number;
  coverUrl: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};
