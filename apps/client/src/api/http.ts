const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

let _token: string | null = null;

export function setToken(token: string) { _token = token; }
export function getToken() { return _token; }

async function request<T>(path: string, options: RequestInit & { query?: Record<string, string> } = {}): Promise<T> {
  const { query, ...init } = options;
  const url = new URL(path, API_BASE_URL);
  if (query) Object.entries(query).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(url.toString(), { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as T;
}

// -- Auth --
export const authApi = {
  localLogin: () => request<{ profileId: string; accessToken: string; expiresAt: string }>('/auth/local', { method: 'POST' }),
};

// -- Shelves --
export const shelvesApi = {
  list: () => request<any[]>('/fridge/shelves'),
  upsert: (shelves: any[]) => request<any[]>('/fridge/shelves', { method: 'POST', body: JSON.stringify(shelves) }),
  delete: (id: string) => request<void>(`/fridge/shelves/${id}`, { method: 'DELETE' }),
};

// -- Items --
export const itemsApi = {
  list: (shelfId?: string) => request<any[]>('/items', { query: shelfId ? { shelf_id: shelfId } : {} }),
  create: (item: any) => request<any>('/items', { method: 'POST', body: JSON.stringify(item) }),
  createBatch: (items: any[], shelfId: string) => request<any[]>('/items/batch', { method: 'POST', body: JSON.stringify({ shelfId, items }) }),
  update: (id: string, changes: any) => request<any>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  delete: (id: string) => request<void>(`/items/${id}`, { method: 'DELETE' }),
};

// -- Condiments --
export const condimentsApi = {
  list: () => request<any[]>('/condiments'),
  upsert: (items: any[]) => request<any[]>('/condiments', { method: 'POST', body: JSON.stringify(items) }),
  delete: (id: string) => request<void>(`/condiments/${id}`, { method: 'DELETE' }),
};

// -- Vision --
export const visionApi = {
  recognize: (imageBase64: string, shelfId: string = 'auto') =>
    request<any>('/vision/recognize', { method: 'POST', body: JSON.stringify({ imageBase64, shelfId }) }),
};

// -- Recipes --
export const recipesApi = {
  suggest: (maxResults = 5, prompt?: string) =>
    request<any[]>('/recipes/suggest', { method: 'POST', body: JSON.stringify({ maxResults, prompt }) }),
  consume: (recipeId: string, itemsUsed: any[]) =>
    request<any>('/recipes/consume', { method: 'POST', body: JSON.stringify({ recipeId, itemsUsed }) }),
};

// -- Meals --
export const mealsApi = {
  list: () => request<any[]>('/meals'),
  create: (meal: { type: string; description: string; items: Array<{ name: string; qty: number; unit: string }>; photoUrl?: string | null; notes?: string; eatenAt: string }) =>
    request<any>('/meals', { method: 'POST', body: JSON.stringify(meal) }),
};

// -- Shopping --
export const shoppingApi = {
  list: () => request<any[]>('/shopping'),
  create: (item: any) => request<any>('/shopping', { method: 'POST', body: JSON.stringify(item) }),
  update: (id: string, changes: any) => request<any>(`/shopping/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  delete: (id: string) => request<void>(`/shopping/${id}`, { method: 'DELETE' }),
};

// -- Shelf Life --
export const shelfLifeApi = {
  get: (name: string) => request<any>(`/shelf-life?name=${encodeURIComponent(name)}`),
};
