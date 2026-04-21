import { create } from 'zustand'
import {
  api,
  type ShelfResponse,
  type ShelfPayload,
  type ItemResponse,
  type ItemPayload,
  type CondimentResponse,
  type CondimentPayload,
  type ShoppingItemResponse,
  type ShoppingItemCreate,
  type ShoppingItemUpdate,
  type MealLogResponse,
  type MealLogCreate,
  type RecipeSuggestion,
  type RecipeSuggestRequest,
  type RecipeUsage,
  type VisionRecognizeRequest,
  type VisionRecognizeResponse,
  type ChatResponse,
} from '../services/api'

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type FridgeState = {
  shelves: ShelfResponse[]
  items: ItemResponse[]
  condiments: CondimentResponse[]
  shoppingItems: ShoppingItemResponse[]
  mealLogs: MealLogResponse[]
  recipes: RecipeSuggestion[]
  loading: boolean

  // Chat state
  chatMessages: { role: 'user' | 'assistant'; content: string; recipes?: RecipeSuggestion[] }[]
  chatLoading: boolean

  // Actions – shelves
  fetchShelves: () => Promise<void>
  upsertShelves: (shelves: ShelfPayload[]) => Promise<void>
  deleteShelf: (shelfId: string) => Promise<void>

  // Actions – items
  fetchItems: (shelfId?: string) => Promise<void>
  addItem: (item: ItemPayload) => Promise<void>
  addItemsBatch: (items: ItemPayload[]) => Promise<void>
  confirmItems: (items: ItemPayload[]) => Promise<void>
  updateItem: (itemId: string, changes: Partial<ItemPayload>) => Promise<void>
  removeItem: (itemId: string) => Promise<void>

  // Actions – condiments
  fetchCondiments: () => Promise<void>
  upsertCondiments: (condiments: CondimentPayload[]) => Promise<void>
  deleteCondiment: (condimentId: string) => Promise<void>

  // Actions – shopping
  fetchShopping: () => Promise<void>
  addShoppingItem: (item: ShoppingItemCreate) => Promise<void>
  updateShoppingItem: (itemId: string, changes: ShoppingItemUpdate) => Promise<void>
  removeShoppingItem: (itemId: string) => Promise<void>

  // Actions – meals
  fetchMeals: (limit?: number) => Promise<void>
  createMeal: (payload: MealLogCreate) => Promise<void>

  // Actions – recipes
  fetchRecipes: (params?: RecipeSuggestRequest) => Promise<void>
  consumeRecipe: (recipeId: string, itemsUsed: RecipeUsage[]) => Promise<void>

  // Actions – vision
  recognizeItems: (payload: VisionRecognizeRequest) => Promise<VisionRecognizeResponse>

  // Convenience – fetch everything
  fetchAll: () => Promise<void>

  // Actions – chat
  sendChatMessage: (content: string) => Promise<void>
  clearChat: () => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useFridgeStore = create<FridgeState>((set, get) => ({
  shelves: [],
  items: [],
  condiments: [],
  shoppingItems: [],
  mealLogs: [],
  recipes: [],
  loading: false,
  chatMessages: [],
  chatLoading: false,

  // ---- Shelves ----

  fetchShelves: async () => {
    set({ loading: true })
    try {
      const shelves = await api.getShelves()
      set({ shelves })
    } finally {
      set({ loading: false })
    }
  },

  upsertShelves: async (shelves) => {
    set({ loading: true })
    try {
      const updated = await api.upsertShelves(shelves)
      set({ shelves: updated })
    } finally {
      set({ loading: false })
    }
  },

  deleteShelf: async (shelfId) => {
    set({ loading: true })
    try {
      await api.deleteShelf(shelfId)
      set((s) => ({
        shelves: s.shelves.filter((sh) => sh.id !== shelfId),
        items: s.items.filter((i) => i.shelf_id !== shelfId),
      }))
    } finally {
      set({ loading: false })
    }
  },

  // ---- Items ----

  fetchItems: async (shelfId) => {
    set({ loading: true })
    try {
      const items = await api.getItems(shelfId)
      set({ items })
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (item) => {
    set({ loading: true })
    try {
      const created = await api.createItem(item)
      set((s) => ({ items: [...s.items, created] }))
    } finally {
      set({ loading: false })
    }
  },

  addItemsBatch: async (items) => {
    set({ loading: true })
    try {
      const created = await api.createItemsBatch(items)
      set((s) => ({ items: [...s.items, ...created] }))
    } finally {
      set({ loading: false })
    }
  },

  confirmItems: async (items) => {
    set({ loading: true })
    try {
      const created = await api.confirmItems(items)
      set((s) => ({ items: [...s.items, ...created] }))
    } finally {
      set({ loading: false })
    }
  },

  updateItem: async (itemId, changes) => {
    set({ loading: true })
    try {
      const updated = await api.updateItem(itemId, changes)
      set((s) => ({
        items: s.items.map((i) => (i.id === itemId ? updated : i)),
      }))
    } finally {
      set({ loading: false })
    }
  },

  removeItem: async (itemId) => {
    set({ loading: true })
    try {
      await api.deleteItem(itemId)
      set((s) => ({ items: s.items.filter((i) => i.id !== itemId) }))
    } finally {
      set({ loading: false })
    }
  },

  // ---- Condiments ----

  fetchCondiments: async () => {
    set({ loading: true })
    try {
      const condiments = await api.getCondiments()
      set({ condiments })
    } finally {
      set({ loading: false })
    }
  },

  upsertCondiments: async (condiments) => {
    set({ loading: true })
    try {
      const updated = await api.upsertCondiments(condiments)
      set({ condiments: updated })
    } finally {
      set({ loading: false })
    }
  },

  deleteCondiment: async (condimentId) => {
    set({ loading: true })
    try {
      await api.deleteCondiment(condimentId)
      set((s) => ({
        condiments: s.condiments.filter((c) => c.id !== condimentId),
      }))
    } finally {
      set({ loading: false })
    }
  },

  // ---- Shopping ----

  fetchShopping: async () => {
    set({ loading: true })
    try {
      const shoppingItems = await api.getShopping()
      set({ shoppingItems })
    } finally {
      set({ loading: false })
    }
  },

  addShoppingItem: async (item) => {
    set({ loading: true })
    try {
      const created = await api.createShoppingItem(item)
      set((s) => ({ shoppingItems: [...s.shoppingItems, created] }))
    } finally {
      set({ loading: false })
    }
  },

  updateShoppingItem: async (itemId, changes) => {
    set({ loading: true })
    try {
      const updated = await api.updateShoppingItem(itemId, changes)
      set((s) => ({
        shoppingItems: s.shoppingItems.map((si) => (si.id === itemId ? updated : si)),
      }))
    } finally {
      set({ loading: false })
    }
  },

  removeShoppingItem: async (itemId) => {
    set({ loading: true })
    try {
      await api.deleteShoppingItem(itemId)
      set((s) => ({
        shoppingItems: s.shoppingItems.filter((si) => si.id !== itemId),
      }))
    } finally {
      set({ loading: false })
    }
  },

  // ---- Meals ----

  fetchMeals: async (limit = 30) => {
    set({ loading: true })
    try {
      const mealLogs = await api.getMeals(limit)
      set({ mealLogs })
    } finally {
      set({ loading: false })
    }
  },

  createMeal: async (payload) => {
    set({ loading: true })
    try {
      const created = await api.createMeal(payload)
      set((s) => ({ mealLogs: [created, ...s.mealLogs] }))
    } finally {
      set({ loading: false })
    }
  },

  // ---- Recipes ----

  fetchRecipes: async (params) => {
    set({ loading: true })
    try {
      const recipes = await api.suggestRecipes(params)
      set({ recipes })
    } finally {
      set({ loading: false })
    }
  },

  consumeRecipe: async (recipeId, itemsUsed) => {
    set({ loading: true })
    try {
      const result = await api.consumeRecipe(recipeId, itemsUsed)
      // Refresh items after consumption
      await get().fetchItems()
      return result
    } finally {
      set({ loading: false })
    }
  },

  // ---- Vision ----

  recognizeItems: async (payload) => {
    set({ loading: true })
    try {
      const result = await api.recognize(payload)
      return result
    } finally {
      set({ loading: false })
    }
  },

  // ---- Chat ----

  sendChatMessage: async (content: string) => {
    const state = get()
    const userMsg = { role: 'user' as const, content }
    const newMessages = [...state.chatMessages, userMsg]
    set({ chatMessages: newMessages, chatLoading: true })

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }))
      const res: ChatResponse = await api.chatWithAI(apiMessages)

      // Store any suggested recipes for the recipe detail page
      if (res.suggested_recipes.length > 0) {
        set((s) => ({
          recipes: [...res.suggested_recipes, ...s.recipes],
        }))
      }

      const assistantMsg = {
        role: 'assistant' as const,
        content: res.reply,
        recipes: res.suggested_recipes.length > 0 ? res.suggested_recipes : undefined,
      }
      set((s) => ({
        chatMessages: [...s.chatMessages, assistantMsg],
        chatLoading: false,
      }))
    } catch {
      const errorMsg = {
        role: 'assistant' as const,
        content: '抱歉，回复失败了，请重试。',
      }
      set((s) => ({
        chatMessages: [...s.chatMessages, errorMsg],
        chatLoading: false,
      }))
    }
  },

  clearChat: () => {
    set({ chatMessages: [] })
  },

  // ---- Fetch all ----

  fetchAll: async () => {
    set({ loading: true })
    try {
      const [shelves, items, condiments, shoppingItems, mealLogs] = await Promise.all([
        api.getShelves().catch(() => []),
        api.getItems().catch(() => []),
        api.getCondiments().catch(() => []),
        api.getShopping().catch(() => []),
        api.getMeals().catch(() => []),
      ])
      set({
        shelves: Array.isArray(shelves) ? shelves : [],
        items: Array.isArray(items) ? items : [],
        condiments: Array.isArray(condiments) ? condiments : [],
        shoppingItems: Array.isArray(shoppingItems) ? shoppingItems : [],
        mealLogs: Array.isArray(mealLogs) ? mealLogs : [],
      })
    } catch {
      // All individual errors already caught above — state stays as empty arrays
    } finally {
      set({ loading: false })
    }
  },
}))

export default useFridgeStore
