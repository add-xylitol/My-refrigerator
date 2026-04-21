import { describe, expect, it } from 'vitest'
import type { MealLogResponse } from '../../services/api'
import { buildMealsViewModel } from './view-model'

const createMealLog = (overrides: Partial<MealLogResponse>): MealLogResponse => ({
  id: overrides.id ?? 'meal-1',
  profile_id: overrides.profile_id ?? 'profile-1',
  title: overrides.title ?? '番茄鸡蛋面',
  recipe_id: overrides.recipe_id ?? null,
  items_used: overrides.items_used ?? [{ name: '番茄' }, { name: '鸡蛋' }],
  photo_url: overrides.photo_url ?? null,
  note: overrides.note ?? null,
  eaten_at: overrides.eaten_at ?? '2026-04-21T08:30:00+08:00',
  created_at: overrides.created_at ?? '2026-04-21T08:30:00+08:00',
})

describe('buildMealsViewModel', () => {
  it('builds a calmer timeline summary with grouped entries', () => {
    const model = buildMealsViewModel({
      mealLogs: [
        createMealLog({
          id: 'meal-today-1',
          title: '番茄鸡蛋面',
          eaten_at: '2026-04-21T08:30:00+08:00',
          created_at: '2026-04-21T08:30:00+08:00',
          items_used: [{ name: '番茄' }, { name: '鸡蛋' }],
        }),
        createMealLog({
          id: 'meal-today-2',
          title: '香煎三文鱼',
          eaten_at: '2026-04-21T19:10:00+08:00',
          created_at: '2026-04-21T19:10:00+08:00',
          photo_url: 'https://example.com/salmon.jpg',
          items_used: [{ name: '三文鱼' }],
        }),
        createMealLog({
          id: 'meal-yesterday',
          title: '鸡肉沙拉',
          eaten_at: '2026-04-20T12:15:00+08:00',
          created_at: '2026-04-20T12:15:00+08:00',
          items_used: [{ name: '鸡胸肉' }, { name: '生菜' }],
        }),
      ],
      now: '2026-04-21T20:00:00+08:00',
    })

    expect(model.title).toBe('饮食时间轴')
    expect(model.mealCountLabel).toBe('最近 3 餐')
    expect(model.summary).toBe('今天已经记录 2 餐，继续保持轻量记录。')
    expect(model.groups).toHaveLength(2)
    expect(model.groups[0]).toMatchObject({
      dayLabel: '今天',
      totalLabel: '2 餐',
    })
    expect(model.groups[0].entries[0]).toMatchObject({
      title: '香煎三文鱼',
      mealType: '晚餐',
      timeLabel: '19:10',
      hasPhoto: true,
      ingredientsPreview: ['三文鱼'],
    })
    expect(model.groups[0].entries[1]).toMatchObject({
      title: '番茄鸡蛋面',
      mealType: '早餐',
      timeLabel: '08:30',
      hasPhoto: false,
      ingredientsPreview: ['番茄', '鸡蛋'],
    })
    expect(model.groups[1]).toMatchObject({
      dayLabel: '昨天',
      totalLabel: '1 餐',
    })
    expect(model.emptyState).toMatchObject({
      eyebrow: '把每一餐留成线索',
      title: '还没有饮食记录',
      description: '记录吃过什么，之后更容易回看习惯和复盘库存消耗。',
      primaryActionText: '记录一餐',
    })
  })

  it('surfaces a visible primary action in the empty state model', () => {
    const model = buildMealsViewModel({
      mealLogs: [],
      now: '2026-04-21T20:00:00+08:00',
    })

    expect(model.summary).toBe('今天还没有记录，先记下第一餐。')
    expect(model.groups).toEqual([])
    expect(model.emptyState.primaryActionText).toBe('记录一餐')
  })

  it('sorts unsorted logs before grouping so the timeline stays stable', () => {
    const model = buildMealsViewModel({
      mealLogs: [
        createMealLog({
          id: 'meal-older',
          title: '鸡肉沙拉',
          eaten_at: '2026-04-20T12:15:00+08:00',
          created_at: '2026-04-20T12:15:00+08:00',
        }),
        createMealLog({
          id: 'meal-latest',
          title: '香煎三文鱼',
          eaten_at: '2026-04-21T19:10:00+08:00',
          created_at: '2026-04-21T19:10:00+08:00',
        }),
        createMealLog({
          id: 'meal-earlier-today',
          title: '番茄鸡蛋面',
          eaten_at: '2026-04-21T08:30:00+08:00',
          created_at: '2026-04-21T08:30:00+08:00',
        }),
      ],
      now: '2026-04-21T20:00:00+08:00',
    })

    expect(model.groups).toHaveLength(2)
    expect(model.groups[0].dayLabel).toBe('今天')
    expect(model.groups[0].entries.map((entry) => entry.id)).toEqual(['meal-latest', 'meal-earlier-today'])
    expect(model.groups[1].dayLabel).toBe('昨天')
    expect(model.groups[1].entries.map((entry) => entry.id)).toEqual(['meal-older'])
  })
})
