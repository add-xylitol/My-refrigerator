import { describe, expect, it } from 'vitest'
import { buildProfileViewModel } from './view-model'

describe('buildProfileViewModel', () => {
  it('builds a calm control center with stats summary', () => {
    const model = buildProfileViewModel({
      items: [{ id: '1', name: '番茄', created_at: '2026-04-20T10:00:00+08:00' }],
      condiments: [
        { id: 'c1', name: '盐', stock_level: '充足' },
        { id: 'c2', name: '胡椒', stock_level: '缺货' },
      ],
      shelves: [{ id: 's1', name: '冷藏层' }],
      shoppingItems: [{ id: 'sh1', name: '牛奶', purchased: false }, { id: 'sh2', name: '面包', purchased: true }],
      now: '2026-04-21T20:00:00+08:00',
    })

    expect(model.title).toBe('控制中心')
    expect(model.nickname).toBe('小冰')
    expect(model.emoji).toBe('🧊')
    expect(model.usageDays).toBe(2)
    expect(model.totalItems).toBe(1)
    expect(model.manageLabel).toBe('已使用 2 天，管理着 1 样食材')

    expect(model.controlItems).toHaveLength(5)
    expect(model.controlItems[0]).toMatchObject({
      emoji: '🧂',
      title: '调料管理',
      subtitle: '当前 2 样 · 缺货 1 样',
    })
    expect(model.controlItems[1]).toMatchObject({
      emoji: '🗂',
      title: '层架管理',
      subtitle: '1 个层架',
    })
    expect(model.controlItems[2]).toMatchObject({
      emoji: '🛒',
      title: '购物清单',
      subtitle: '1 项待买',
    })
  })

  it('handles empty state gracefully', () => {
    const model = buildProfileViewModel({
      items: [],
      condiments: [],
      shelves: [],
      shoppingItems: [],
      now: '2026-04-21T20:00:00+08:00',
    })

    expect(model.usageDays).toBe(1)
    expect(model.manageLabel).toBe('已使用 1 天，还没有食材')
    expect(model.controlItems[2]).toMatchObject({
      subtitle: '暂无待买',
    })
  })

  it('calculates usage days from earliest item', () => {
    const model = buildProfileViewModel({
      items: [
        { id: '1', name: '番茄', created_at: '2026-04-15T10:00:00+08:00' },
        { id: '2', name: '鸡蛋', created_at: '2026-04-18T10:00:00+08:00' },
      ],
      condiments: [],
      shelves: [],
      shoppingItems: [],
      now: '2026-04-21T20:00:00+08:00',
    })

    expect(model.usageDays).toBe(7)
  })
})
