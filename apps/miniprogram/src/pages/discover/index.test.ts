import { describe, expect, it } from 'vitest'
import type { CondimentResponse, ItemResponse, RecipeSuggestion } from '../../services/api'
import { buildDiscoverViewModel } from './view-model'

const now = '2026-04-21T10:00:00.000Z'

const createItem = (overrides: Partial<ItemResponse>): ItemResponse => ({
  id: overrides.id ?? 'item-1',
  name: overrides.name ?? '鸡胸肉',
  shelf_id: overrides.shelf_id ?? 'shelf-1',
  qty: overrides.qty ?? 1,
  unit: overrides.unit ?? 'pcs',
  exp_date: overrides.exp_date ?? null,
  barcode: overrides.barcode ?? null,
  photo_id: overrides.photo_id ?? null,
  note: overrides.note ?? null,
  created_at: overrides.created_at ?? now,
  updated_at: overrides.updated_at ?? now,
})

const createCondiment = (overrides: Partial<CondimentResponse>): CondimentResponse => ({
  id: overrides.id ?? 'condiment-1',
  name: overrides.name ?? '生抽',
  category: overrides.category ?? 'sauce',
  stock_level: overrides.stock_level ?? 'medium',
  note: overrides.note ?? null,
  created_at: overrides.created_at ?? now,
  updated_at: overrides.updated_at ?? now,
})

const createRecipe = (overrides: Partial<RecipeSuggestion>): RecipeSuggestion => ({
  id: overrides.id ?? 'recipe-1',
  title: overrides.title ?? '香煎鸡胸肉',
  minutes: overrides.minutes ?? 12,
  summary: overrides.summary ?? '先把鸡胸肉消耗掉，十几分钟就能吃上。',
  tag: overrides.tag ?? 'quick',
  usage: overrides.usage ?? [],
  condiments: overrides.condiments ?? [],
  steps: overrides.steps ?? [],
  generated_at: overrides.generated_at ?? now,
  missing_ingredients: overrides.missing_ingredients ?? [],
  all_available: overrides.all_available ?? true,
})

describe('buildDiscoverViewModel', () => {
  it('prioritizes near-expiry recipes and shows decision shortcuts', () => {
    const model = buildDiscoverViewModel({
      items: [
        createItem({ id: 'item-near', name: '菠菜', exp_date: '2026-04-22' }),
        createItem({ id: 'item-2', name: '鸡蛋', exp_date: '2026-04-26' }),
      ],
      condiments: [createCondiment({ name: '黑胡椒' })],
      recipes: [
        createRecipe({
          id: 'recipe-near',
          title: '菠菜炒蛋',
          summary: '把明天到期的菠菜优先吃掉。',
          minutes: 8,
          all_available: true,
        }),
        createRecipe({
          id: 'recipe-second',
          title: '黑椒鸡蛋卷',
          summary: '快手补能量。',
          minutes: 10,
          all_available: false,
          missing_ingredients: ['牛奶'],
        }),
      ],
      chatMessages: [],
      now,
    })

    expect(model.decisionActions).toEqual(['最快做什么', '先消耗临期', '十分钟搞定'])
    expect(model.introEyebrow).toBe('今天吃什么 · 决策助手')
    expect(model.introTitle).toBe('先做最合适的，不用先聊天。')
    expect(model.introDescription).toContain('2 样食材')
    expect(model.introDescription).toContain('1 样调料')
    expect(model.introDescription).toContain('1 样临期')
    expect(model.featuredRecipes).toHaveLength(2)
    expect(model.featuredRecipes[0]).toMatchObject({
      title: '菠菜炒蛋',
      availabilityLabel: '食材齐全',
      reasonToCookNow: '优先消耗临期食材',
    })
    expect(model.featuredRecipes[1]).toMatchObject({
      title: '黑椒鸡蛋卷',
      availabilityLabel: '缺 1 样',
      reasonToCookNow: '十分钟内可完成',
    })
    expect(model.hasEmptyChatState).toBe(true)
  })

  it('surfaces the latest chat-suggested recipes above the chat stream', () => {
    const model = buildDiscoverViewModel({
      items: [createItem({ name: '豆腐' })],
      condiments: [createCondiment({ name: '香油' })],
      recipes: [
        createRecipe({ id: 'recipe-store', title: '家常豆腐', minutes: 18, summary: '库存里已有的推荐。' }),
      ],
      chatMessages: [
        { role: 'user', content: '今天吃什么' },
        {
          role: 'assistant',
          content: '这两个更适合今天。',
          recipes: [
            createRecipe({ id: 'recipe-chat-1', title: '香煎豆腐', minutes: 9, summary: '快一点。' }),
            createRecipe({ id: 'recipe-chat-2', title: '豆腐味噌汤', minutes: 12, summary: '更清爽。' }),
          ],
        },
      ],
      now,
    })

    expect(model.hasEmptyChatState).toBe(false)
    expect(model.featuredRecipes.map((recipe) => recipe.id)).toEqual(['recipe-chat-1', 'recipe-chat-2'])
  })

  it('treats items expiring today as near-expiry for same-day decisions', () => {
    const model = buildDiscoverViewModel({
      items: [createItem({ name: '三文鱼', exp_date: '2026-04-21' })],
      condiments: [],
      recipes: [
        createRecipe({
          id: 'recipe-today',
          title: '香煎三文鱼',
          summary: '今天到期的三文鱼最适合先处理。',
          minutes: 15,
          all_available: true,
        }),
      ],
      chatMessages: [],
      now: '2026-04-21T18:00:00+08:00',
    })

    expect(model.introDescription).toContain('1 样临期')
    expect(model.featuredRecipes[0].reasonToCookNow).toBe('优先消耗临期食材')
  })

  it('prioritizes near-expiry recipes from usage even when title and summary do not mention the ingredient', () => {
    const model = buildDiscoverViewModel({
      items: [createItem({ id: 'item-salmon', name: '三文鱼', exp_date: '2026-04-21' })],
      condiments: [],
      recipes: [
        createRecipe({
          id: 'recipe-near-usage',
          title: '香煎主菜',
          summary: '适合今晚做。',
          minutes: 18,
          usage: [{ item_id: 'item-salmon', name: '鱼排', qty: 1, unit: 'pcs' }],
          all_available: true,
        }),
        createRecipe({
          id: 'recipe-quick',
          title: '十分钟鸡蛋卷',
          summary: '更快，但不该排在前面。',
          minutes: 10,
          all_available: true,
        }),
      ],
      chatMessages: [],
      now: '2026-04-21T18:00:00+08:00',
    })

    expect(model.featuredRecipes[0]).toMatchObject({
      id: 'recipe-near-usage',
      reasonToCookNow: '优先消耗临期食材',
    })
  })
})
