import type { CondimentResponse, ItemResponse, RecipeSuggestion } from '../../services/api'

const DECISION_ACTIONS = ['最快做什么', '先消耗临期', '十分钟搞定']
const DAY_IN_MS = 24 * 60 * 60 * 1000

type FeaturedRecipeReasonCode = 'near-expiry' | 'quick' | 'available' | 'fallback'

export type DiscoverViewModel = {
  decisionActions: string[]
  introEyebrow: string
  introTitle: string
  introDescription: string
  featuredRecipes: Array<{
    id: string
    title: string
    minutes?: number | null
    summary?: string | null
    availabilityStatus: 'ok' | 'missing'
    availabilityLabel: string
    reasonCode: FeaturedRecipeReasonCode
    reasonToCookNow: string
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

const getReason = (recipe: RecipeSuggestion, nearExpiryItems: ItemResponse[]) => {
  const haystack = `${recipe.title} ${recipe.summary ?? ''}`
  const nearExpiryItemIds = new Set(nearExpiryItems.map((item) => item.id))
  const nearExpiryNames = nearExpiryItems.map((item) => item.name)
  const usesNearExpiryItem = recipe.usage.some((usage) => {
    if (usage.item_id && nearExpiryItemIds.has(usage.item_id)) return true
    return nearExpiryNames.includes(usage.name)
  })

  if (usesNearExpiryItem || nearExpiryNames.some((name) => haystack.includes(name))) {
    return { code: 'near-expiry' as const, text: '优先消耗临期食材' }
  }
  if (recipe.minutes != null && recipe.minutes <= 10) {
    return { code: 'quick' as const, text: '十分钟内可完成' }
  }
  if (recipe.all_available) {
    return { code: 'available' as const, text: '食材已经基本齐了' }
  }
  return { code: 'fallback' as const, text: '先看思路再决定' }
}

const getAvailability = (recipe: RecipeSuggestion) => {
  if (recipe.all_available) {
    return { status: 'ok' as const, label: '食材齐全' }
  }
  return { status: 'missing' as const, label: `缺 ${recipe.missing_ingredients.length} 样` }
}

export const buildDiscoverViewModel = (input: BuildDiscoverViewModelInput): DiscoverViewModel => {
  const now = new Date(input.now ?? new Date().toISOString())
  const nearExpiryItems = input.items.filter((item) => isNearExpiry(item, now))
  const latestSuggestedRecipes = [...input.chatMessages]
    .reverse()
    .find((message) => message.role === 'assistant' && message.recipes && message.recipes.length > 0)
    ?.recipes

  const sourceRecipes = latestSuggestedRecipes && latestSuggestedRecipes.length > 0 ? latestSuggestedRecipes : input.recipes

  const featuredRecipes = sourceRecipes
    .map((recipe) => {
      const reason = getReason(recipe, nearExpiryItems)
      const availability = getAvailability(recipe)
      return {
        id: recipe.id,
        title: recipe.title,
        minutes: recipe.minutes,
        summary: recipe.summary,
        availabilityStatus: availability.status,
        availabilityLabel: availability.label,
        reasonCode: reason.code,
        reasonToCookNow: reason.text,
      }
    })
    .sort((left, right) => {
      const priority: Record<FeaturedRecipeReasonCode, number> = {
        'near-expiry': 0,
        quick: 1,
        available: 2,
        fallback: 3,
      }
      return priority[left.reasonCode] - priority[right.reasonCode]
    })
    .slice(0, 3)

  return {
    decisionActions: DECISION_ACTIONS,
    introEyebrow: '今天吃什么 · 决策助手',
    introTitle: '先做最合适的，不用先聊天。',
    introDescription: `${input.items.length} 样食材，${input.condiments.length} 样调料，${nearExpiryItems.length} 样临期，先看推荐再决定。`,
    featuredRecipes,
    hasEmptyChatState: input.chatMessages.length === 0,
  }
}
