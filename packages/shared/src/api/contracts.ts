import type { ItemDTO, RecipeDTO, ShelfDTO } from '../types/fridge';
import type { VisionRecognizeRequest, VisionRecognizeResponse } from '../types/vision';

export type AnonAuthResponse = {
  token: string;
  expiresAt: string;
};

export type GetShelvesResponse = {
  data: ShelfDTO[];
};

export type UpsertShelvesRequest = {
  shelves: Array<
    Pick<ShelfDTO, 'id' | 'name' | 'sort' | 'type'> & {
      _tempId?: string;
    }
  >;
};

export type UpsertShelvesResponse = {
  data: ShelfDTO[];
};

export type ItemsQuery = {
  shelfId?: string;
};

export type ItemsResponse = {
  data: ItemDTO[];
};

export type ConfirmItemsRequest = {
  shelfId: string;
  items: Array<
    Pick<ItemDTO, 'name' | 'unit' | 'qty' | 'expDate' | 'barcode' | 'photoId'> & {
      candidateId?: string;
    }
  >;
  visionRequestId?: string;
};

export type ConfirmItemsResponse = {
  data: ItemDTO[];
};

export type UpdateItemRequest = Partial<Pick<ItemDTO, 'qty' | 'expDate'>>;

export type UpdateItemResponse = {
  data: ItemDTO;
};

export type RecipeSuggestQuery = {
  limit?: number;
};

export type RecipeSuggestResponse = {
  data: RecipeDTO[];
  generatedAt: string;
};

export type RecipeConsumeRequest = {
  recipeId: string;
  itemUsages: Array<{
    itemId: string;
    qty: number;
  }>;
};

export type RecipeConsumeResponse = {
  success: boolean;
  data: ItemDTO[];
};

export type VisionApi = {
  recognize: {
    request: VisionRecognizeRequest;
    response: VisionRecognizeResponse;
  };
};
