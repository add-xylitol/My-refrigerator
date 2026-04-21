const MS_PER_DAY = 1000 * 60 * 60 * 24

type StockLevel = '充足' | '偏低' | '缺货'

type Item = {
  id: string
  name: string
  created_at: string
}

type Condiment = {
  id: string
  name: string
  stock_level: StockLevel
}

type Shelf = {
  id: string
  name: string
}

type ShoppingItem = {
  id: string
  name: string
  purchased: boolean
}

type ControlItem = {
  emoji: string
  title: string
  subtitle: string
  path: string
}

export type ProfileViewModel = {
  title: string
  nickname: string
  emoji: string
  usageDays: number
  totalItems: number
  manageLabel: string
  controlItems: ControlItem[]
}

const calculateUsageDays = (items: Item[], now: Date): number => {
  if (items.length === 0) return 1
  const earliest = items.reduce((min, item) => {
    const d = new Date(item.created_at).getTime()
    return d < min ? d : min
  }, now.getTime())
  const diff = Math.ceil((now.getTime() - earliest) / MS_PER_DAY)
  return Math.max(diff, 1)
}

const buildControlItem = (
  emoji: string,
  title: string,
  path: string,
  subtitle: string
): ControlItem => ({ emoji, title, path, subtitle })

export const buildProfileViewModel = ({
  items,
  condiments,
  shelves,
  shoppingItems,
  now,
}: {
  items: Item[]
  condiments: Condiment[]
  shelves: Shelf[]
  shoppingItems: ShoppingItem[]
  now?: string
}): ProfileViewModel => {
  const currentTime = new Date(now ?? new Date().toISOString())
  const usageDays = calculateUsageDays(items, currentTime)
  const totalItems = items.length
  const outOfStockCondiments = condiments.filter((c) => c.stock_level === '缺货').length
  const pendingShoppingCount = shoppingItems.filter((s) => !s.purchased).length

  const manageLabel =
    totalItems === 0
      ? `已使用 ${usageDays} 天，还没有食材`
      : `已使用 ${usageDays} 天，管理着 ${totalItems} 样食材`

  const controlItems: ControlItem[] = [
    buildControlItem(
      '🧂',
      '调料管理',
      '/pages/profile/condiments',
      `当前 ${condiments.length} 样 · 缺货 ${outOfStockCondiments} 样`
    ),
    buildControlItem(
      '🗂',
      '层架管理',
      '/pages/profile/shelves',
      `${shelves.length} 个层架`
    ),
    buildControlItem(
      '🛒',
      '购物清单',
      '/pages/discover/shopping',
      pendingShoppingCount > 0 ? `${pendingShoppingCount} 项待买` : '暂无待买'
    ),
    buildControlItem(
      '⚙️',
      '关于',
      'about',
      '版本信息和更新'
    ),
    buildControlItem(
      '💬',
      '意见反馈',
      'feedback',
      '帮我们做得更好'
    ),
  ]

  return {
    title: '控制中心',
    nickname: '小冰',
    emoji: '🧊',
    usageDays,
    totalItems,
    manageLabel,
    controlItems,
  }
}
