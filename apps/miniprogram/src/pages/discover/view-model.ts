import type { CondimentResponse, ItemResponse, RecipeSuggestion } from '../../services/api'

const DECISION_ACTIONS = ['最快做什么', '先消耗临期', '十分钟搞定']
const DAY_IN_MS = 24 * 60 * 60 * 1000

type FeaturedRecipeReasonCode = 'near-expiry' | 'quick' | 'available' | 'fallback'

export type DiscoverViewModel = {
  decisionActions: string[]
  stockSummary: string
  canMakeNow: Array<{
    id: string
    title: string
    minutes?: number | null
  }>
  almostReady: Array<{
    id: string
    title: string
    minutes?: number | null
    missingLabel: string
  }>
  hasEmptyChatState: boolean
}

export type BuildDiscoverViewModelInput = {
  items: ItemResponse[]
  condiments: CondimentResponse[]
  recipes: RecipeSuggestion[]
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string; recipes?: RecipeSuggestion[] }>
  now?: string
}

const getDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const isNearExpiry = (item: ItemResponse, now: Date) => {
  if (!item.exp_date) return false
  const expiryAt = new Date(`${item.exp_date}T23:59:59`)
  const diff = getDayStart(expiryAt).getTime() - getDayStart(now).getTime()
  return diff >= 0 && diff <= DAY_IN_MS * 2
}

export const buildDiscoverViewModel = (input: BuildDiscoverViewModelInput): DiscoverViewModel => {
  const now = new Date(input.now ?? new Date().toISOString())
  const nearExpiryItems = input.items.filter((item) => isNearExpiry(item, now))
  const latestSuggestedRecipes = [...input.chatMessages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.recipes && message.recipes.length > 0)
    ?.recipes

  const sourceRecipes = latestSuggestedRecipes && latestSuggestedRecipes.length > 0 ? latestSuggestedRecipes : input.recipes

  const sorted = [...sourceRecipes]
    .map((recipe) => {
      const haystack = `${recipe.title} ${recipe.summary ?? ''}`
      const nearExpiryNames = nearExpiryItems.map((item) => item.name)
      let priority: number
      if (recipe.usage.some((u) => nearExpiryNames.includes(u.name)) || nearExpiryNames.some((n) => haystack.includes(n))) {
        priority = 0
      } else if (recipe.minutes != null && recipe.minutes <= 10) {
        priority = 1
      } else if (recipe.all_available) {
        priority = 2
      } else {
        priority = 3
      }
      return { recipe, priority }
    })
    .sort((a, b) => a.priority - b.priority)

  const canMakeNow = sorted
    .filter((s) => s.recipe.all_available)
    .slice(0, 10)
    .map((s) => ({
      id: s.recipe.id,
      title: s.recipe.title,
      minutes: s.recipe.minutes,
    }))

  const almostReady = sorted
    .filter((s) => !s.recipe.all_available && s.recipe.missing_ingredients.length <= 3)
    .slice(0, 6)
    .map((s) => ({
      id: s.recipe.id,
      title: s.recipe.title,
      minutes: s.recipe.minutes,
      missingLabel: s.recipe.missing_ingredients.map((m) => m.name).join('、'),
    }))

  const stockSummary = `${input.items.length} 食材 · ${input.condiments.length} 调料${nearExpiryItems.length > 0 ? ` · ${nearExpiryItems.length} 临期` : ''}`

  return {
    decisionActions: DECISION_ACTIONS,
    stockSummary,
    canMakeNow,
    almostReady,
    hasEmptyChatState: input.chatMessages.length === 0,
  }
}
