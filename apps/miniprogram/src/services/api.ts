import Taro from '@tarojs/taro'

// ---------------------------------------------------------------------------
// Types – mirror the server schemas for request/response bodies
// ---------------------------------------------------------------------------

export type ShelfType = 'chill' | 'freeze' | 'produce'
export type QuantityUnit = '个' | '克' | '毫升' | '把' | '袋'
export type CondimentCategory = '酱油/醋' | '香料' | '油/脂' | '其他'
export type StockLevel = '充足' | '缺货' | '临期'
export type RecipeTag = '临期优先' | '快速上桌' | '冷冻解压' | '定制'

export type ShelfPayload = {
  id?: string
  name: string
  sort?: number
  type?: ShelfType
}

export type ShelfResponse = ShelfPayload & {
  id: string
  created_at: string
  updated_at: string
}

export type ItemPayload = {
  id?: string
  shelf_id: string
  name: string
  unit?: QuantityUnit
  qty?: number
  exp_date?: string | null
  barcode?: string | null
  photo_id?: string | null
  note?: string | null
}

export type ItemResponse = ItemPayload & {
  id: string
  created_at: string
  updated_at: string
}

export type CondimentPayload = {
  id?: string
  name: string
  category?: CondimentCategory
  stock_level?: StockLevel
  note?: string | null
}

export type CondimentResponse = CondimentPayload & {
  id: string
  created_at: string
  updated_at: string
}

export type PhotoUploadResponse = {
  id: string
  url: string
  created_at: string
}

export type VisionCandidate = {
  id: string
  name: string
  qty: number
  unit: QuantityUnit
  exp_date?: string | null
  confidence: number
  barcode?: string | null
  shelf_life_days?: number | null
}

export type VisionRecognizeRequest = {
  photo_id?: string | null
  image_base64?: string | null
  image_url?: string | null
  shelf_id?: string
}

export type VisionRecognizeResponse = {
  note?: string | null
  candidates: VisionCandidate[]
  debug?: Record<string, unknown> | null
}

export type RecipeUsage = {
  item_id?: string | null
  name: string
  qty: number
  unit: QuantityUnit
}

export type RecipeSuggestion = {
  id: string
  title: string
  minutes?: number | null
  summary?: string | null
  tag: RecipeTag
  usage: RecipeUsage[]
  condiments: string[]
  steps: string[]
  generated_at: string
  missing_ingredients: string[]
  all_available: boolean
}

export type RecipeSuggestRequest = {
  max_results?: number
  prompt?: string | null
  tag?: RecipeTag | null
}

export type RecipeConsumeRequest = {
  recipe_id: string
  items_used: RecipeUsage[]
}

export type MealLogCreate = {
  title: string
  recipe_id?: string | null
  items_used?: unknown[]
  photo_url?: string | null
  note?: string | null
  eaten_at?: string | null
}

export type MealLogResponse = MealLogCreate & {
  id: string
  profile_id: string
  created_at: string
}

export type ShoppingItemCreate = {
  name: string
  qty?: number
  unit?: QuantityUnit
  source?: string | null
}

export type ShoppingItemUpdate = {
  purchased?: boolean | null
  name?: string | null
  qty?: number | null
}

export type ShoppingItemResponse = ShoppingItemCreate & {
  id: string
  purchased: boolean
  created_at: string
}

export type ShelfLifeResult = {
  name: string
  days: number | null
}

export type ChatResponse = {
  reply: string
  suggested_recipes: RecipeSuggestion[]
}

// ---------------------------------------------------------------------------
// Detect platform
// ---------------------------------------------------------------------------

const isWeapp = typeof wx !== 'undefined' && typeof wx.request === 'function'

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl = process.env.API_BASE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  // ---- Token helpers ----

  setToken(token: string) {
    this.token = token
    if (isWeapp) {
      Taro.setStorageSync('token', token)
    }
  }

  getToken(): string | null {
    if (this.token) return this.token
    if (isWeapp) {
      this.token = Taro.getStorageSync('token') || null
    }
    return this.token
  }

  // ---- Core request helper ----

  private async request<T>(
    path: string,
    options: {
      method?: string
      body?: unknown
      query?: Record<string, string | number | boolean | undefined>
      headers?: Record<string, string>
      formData?: FormData
    } = {},
  ): Promise<T> {
    const { method = 'GET', body, query, headers = {}, formData } = options

    // Build URL with query params
    let url = `${this.baseUrl}${path}`
    if (query) {
      const parts: string[] = []
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        }
      }
      const qs = parts.join('&')
      if (qs) url += `?${qs}`
    }

    // Attach auth header
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Skip tunnel warning pages (dev tunnel)
    headers['ngrok-skip-browser-warning'] = 'true'
    headers['Bypass-Tunnel-Reminder'] = 'true'

    if (isWeapp) {
      // Use Taro.request for WeChat Mini Program
      const wxHeaders: Record<string, string> = { ...headers }

      if (body !== undefined) {
        wxHeaders['Content-Type'] = 'application/json'
      }

      const res = await Taro.request({
        url,
        method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        data: body !== undefined ? body : undefined,
        header: wxHeaders,
      })

      if (res.statusCode >= 400) {
        const errMsg =
          typeof res.data === 'object' && res.data !== null
            ? (res.data as any).detail || JSON.stringify(res.data)
            : String(res.data)
        throw new Error(`API ${res.statusCode}: ${errMsg}`)
      }
      return res.data as T
    }

    // Use fetch for H5
    const fetchOpts: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (formData) {
      // Let the browser set the correct Content-Type with boundary
      delete (fetchOpts.headers as Record<string, string>)['Content-Type']
      fetchOpts.body = formData
    } else if (body !== undefined) {
      fetchOpts.body = JSON.stringify(body)
    }

    const resp = await fetch(url, fetchOpts)

    if (!resp.ok) {
      let errMsg = `API ${resp.status}`
      try {
        const errBody = await resp.json()
        errMsg += `: ${errBody.detail || JSON.stringify(errBody)}`
      } catch {
        errMsg += `: ${resp.statusText}`
      }
      throw new Error(errMsg)
    }

    return resp.json() as Promise<T>
  }

  // =========================================================================
  // Auth
  // =========================================================================

  localLogin(): Promise<{ profile_id: string; access_token: string; expires_at: string }> {
    return this.request('/auth/local', { method: 'POST' })
  }

  anonLogin(deviceFingerprint: string): Promise<{ profile_id: string; access_token: string; expires_at: string }> {
    return this.request('/auth/anon', { method: 'POST', body: { device_fingerprint: deviceFingerprint } })
  }

  wxLogin(code: string): Promise<{ profile_id: string; access_token: string; expires_at: string; is_new_user: boolean }> {
    return this.request('/auth/wx-login', { method: 'POST', body: { code } })
  }

  // =========================================================================
  // Shelves
  // =========================================================================

  getShelves(): Promise<ShelfResponse[]> {
    return this.request('/fridge/shelves')
  }

  upsertShelves(shelves: ShelfPayload[]): Promise<ShelfResponse[]> {
    return this.request('/fridge/shelves', { method: 'POST', body: shelves })
  }

  deleteShelf(shelfId: string): Promise<{ detail: string }> {
    return this.request(`/fridge/shelves/${shelfId}`, { method: 'DELETE' })
  }

  // =========================================================================
  // Items
  // =========================================================================

  getItems(shelfId?: string): Promise<ItemResponse[]> {
    return this.request('/items', { query: { shelf_id: shelfId } })
  }

  createItem(item: ItemPayload): Promise<ItemResponse> {
    return this.request('/items', { method: 'POST', body: item })
  }

  createItemsBatch(items: ItemPayload[]): Promise<ItemResponse[]> {
    return this.request('/items/batch', { method: 'POST', body: items })
  }

  confirmItems(items: ItemPayload[]): Promise<ItemResponse[]> {
    return this.request('/items/confirm', { method: 'POST', body: items })
  }

  updateItem(itemId: string, changes: Partial<ItemPayload>): Promise<ItemResponse> {
    return this.request(`/items/${itemId}`, { method: 'PATCH', body: changes })
  }

  deleteItem(itemId: string): Promise<{ detail: string }> {
    return this.request(`/items/${itemId}`, { method: 'DELETE' })
  }

  // =========================================================================
  // Condiments
  // =========================================================================

  getCondiments(): Promise<CondimentResponse[]> {
    return this.request('/condiments')
  }

  upsertCondiments(condiments: CondimentPayload[]): Promise<CondimentResponse[]> {
    return this.request('/condiments', { method: 'POST', body: condiments })
  }

  deleteCondiment(condimentId: string): Promise<{ detail: string }> {
    return this.request(`/condiments/${condimentId}`, { method: 'DELETE' })
  }

  // =========================================================================
  // Photos
  // =========================================================================

  async uploadPhoto(filePath: string, shelfId?: string): Promise<PhotoUploadResponse> {
    const token = this.getToken()

    if (isWeapp) {
      // Use Taro.uploadFile for WeChat Mini Program
      let url = `${this.baseUrl}/photos`
      if (shelfId) url += `?shelf_id=${encodeURIComponent(shelfId)}`

      const header: Record<string, string> = {}
      if (token) header['Authorization'] = `Bearer ${token}`
      header['ngrok-skip-browser-warning'] = 'true'
      header['Bypass-Tunnel-Reminder'] = 'true'

      const res = await Taro.uploadFile({
        url,
        filePath,
        name: 'file',
        header,
      })

      if (res.statusCode >= 400) {
        let errMsg = `Upload ${res.statusCode}`
        try {
          const parsed = JSON.parse(res.data)
          errMsg += `: ${parsed.detail || JSON.stringify(parsed)}`
        } catch {
          errMsg += `: ${res.data}`
        }
        throw new Error(errMsg)
      }
      return JSON.parse(res.data)
    }

    // H5: read the file and send via FormData
    const resp = await fetch(filePath)
    const blob = await resp.blob()
    const formData = new FormData()
    formData.append('file', blob, 'photo.jpg')

    return this.request<PhotoUploadResponse>('/photos', {
      method: 'POST',
      query: { shelf_id: shelfId },
      formData,
    })
  }

  // =========================================================================
  // Vision
  // =========================================================================

  recognize(payload: VisionRecognizeRequest): Promise<VisionRecognizeResponse> {
    return this.request('/vision/recognize', { method: 'POST', body: payload })
  }

  // =========================================================================
  // Recipes
  // =========================================================================

  suggestRecipes(params: RecipeSuggestRequest = {}): Promise<RecipeSuggestion[]> {
    return this.request('/recipes/suggest', { method: 'POST', body: params })
  }

  consumeRecipe(recipeId: string, itemsUsed: RecipeUsage[]): Promise<{ success: boolean; data: ItemResponse[] }> {
    return this.request('/recipes/consume', {
      method: 'POST',
      body: { recipe_id: recipeId, items_used: itemsUsed },
    })
  }

  // =========================================================================
  // Meals
  // =========================================================================

  getMeals(limit = 30): Promise<MealLogResponse[]> {
    return this.request('/meals', { query: { limit } })
  }

  createMeal(payload: MealLogCreate): Promise<MealLogResponse> {
    return this.request('/meals', { method: 'POST', body: payload })
  }

  // =========================================================================
  // Shopping
  // =========================================================================

  getShopping(): Promise<ShoppingItemResponse[]> {
    return this.request('/shopping')
  }

  createShoppingItem(item: ShoppingItemCreate): Promise<ShoppingItemResponse> {
    return this.request('/shopping', { method: 'POST', body: item })
  }

  updateShoppingItem(itemId: string, changes: ShoppingItemUpdate): Promise<ShoppingItemResponse> {
    return this.request(`/shopping/${itemId}`, { method: 'PATCH', body: changes })
  }

  deleteShoppingItem(itemId: string): Promise<{ detail: string }> {
    return this.request(`/shopping/${itemId}`, { method: 'DELETE' })
  }

  // =========================================================================
  // Shelf-Life
  // =========================================================================

  getShelfLife(name: string): Promise<ShelfLifeResult> {
    return this.request('/shelf-life', { query: { name } })
  }

  // =========================================================================
  // Chat
  // =========================================================================

  chatWithAI(messages: { role: string; content: string }[]): Promise<ChatResponse> {
    return this.request('/chat', { method: 'POST', body: { messages } })
  }
}

export const api = new ApiClient()
export default api
