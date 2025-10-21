import type {
  AnonAuthResponse,
  ConfirmItemsRequest,
  ConfirmItemsResponse,
  GetShelvesResponse,
  ItemsQuery,
  ItemsResponse,
  RecipeConsumeRequest,
  RecipeConsumeResponse,
  RecipeSuggestQuery,
  RecipeSuggestResponse,
  UpsertShelvesRequest,
  UpsertShelvesResponse,
  UpdateItemRequest,
  UpdateItemResponse,
  VisionRecognizeRequest,
  VisionRecognizeResponse
} from '@smart-fridge/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

type FetchOptions = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  authToken?: string;
};

const buildUrl = (path: string, query?: FetchOptions['query']) => {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const asJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const request = async <T>(path: string, options: FetchOptions = {}) => {
  const { method = 'GET', body, query, authToken } = options;
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return asJson<T>(response);
};

export const apiClient = {
  anonLogin: () => request<AnonAuthResponse>('/auth/anon', { method: 'POST' }),
  getShelves: (authToken?: string) => request<GetShelvesResponse>('/fridge/shelves', { authToken }),
  upsertShelves: (payload: UpsertShelvesRequest, authToken?: string) =>
    request<UpsertShelvesResponse>('/fridge/shelves', {
      method: 'POST',
      body: payload,
      authToken
    }),
  getItems: (params: ItemsQuery, authToken?: string) =>
    request<ItemsResponse>('/items', { query: params, authToken }),
  confirmItems: (payload: ConfirmItemsRequest, authToken?: string) =>
    request<ConfirmItemsResponse>('/items/confirm', {
      method: 'POST',
      body: payload,
      authToken
    }),
  updateItem: (itemId: string, body: UpdateItemRequest, authToken?: string) =>
    request<UpdateItemResponse>(`/items/${itemId}`, {
      method: 'PATCH',
      body,
      authToken
    }),
  suggestRecipes: (query: RecipeSuggestQuery, authToken?: string) =>
    request<RecipeSuggestResponse>('/recipes/suggest', {
      query,
      authToken
    }),
  consumeRecipe: (payload: RecipeConsumeRequest, authToken?: string) =>
    request<RecipeConsumeResponse>('/recipes/consume', {
      method: 'POST',
      body: payload,
      authToken
    }),
  recognizeVision: (payload: VisionRecognizeRequest, authToken?: string) =>
    request<VisionRecognizeResponse>('/vision/recognize', {
      method: 'POST',
      body: payload,
      authToken
    })
};
