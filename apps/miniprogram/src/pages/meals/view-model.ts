import type { MealLogResponse } from '../../services/api'

const MEAL_EMPTY_STATE = {
  eyebrow: '把每一餐留成线索',
  title: '还没有饮食记录',
  description: '记录吃过什么，之后更容易回看习惯和复盘库存消耗。',
  primaryActionText: '记录一餐',
}

const getMealType = (date: Date) => {
  const hour = date.getHours()
  if (hour >= 5 && hour < 10) return '早餐'
  if (hour >= 10 && hour < 14) return '午餐'
  if (hour >= 14 && hour < 17) return '下午茶'
  if (hour >= 17 && hour < 21) return '晚餐'
  return '夜宵'
}

const formatTime = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

const getStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const formatDayLabel = (date: Date, now: Date) => {
  const diff = Math.round((getStartOfDay(now).getTime() - getStartOfDay(date).getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (diff === 2) return '前天'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const getDateKey = (log: MealLogResponse) => log.eaten_at || log.created_at

const getIngredientNames = (itemsUsed: unknown[] | undefined) => {
  if (!Array.isArray(itemsUsed)) return []
  return itemsUsed
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object' && 'name' in entry && typeof (entry as { name?: unknown }).name === 'string') {
        return (entry as { name: string }).name
      }
      return null
    })
    .filter((name): name is string => Boolean(name))
    .slice(0, 3)
}

export type MealsViewModel = {
  title: string
  mealCountLabel: string
  summary: string
  groups: Array<{
    dayLabel: string
    totalLabel: string
    entries: Array<{
      id: string
      title: string
      mealType: string
      timeLabel: string
      hasPhoto: boolean
      photoUrl?: string | null
      ingredientsPreview: string[]
    }>
  }>
  emptyState: {
    eyebrow: string
    title: string
    description: string
    primaryActionText: string
  }
}

export const buildMealsViewModel = ({ mealLogs, now }: { mealLogs: MealLogResponse[]; now?: string }): MealsViewModel => {
  const currentTime = new Date(now ?? new Date().toISOString())
  const sortedMealLogs = [...mealLogs].sort((left, right) => new Date(getDateKey(right)).getTime() - new Date(getDateKey(left)).getTime())
  const todayCount = sortedMealLogs.filter((log) => formatDayLabel(new Date(getDateKey(log)), currentTime) === '今天').length

  const groups = sortedMealLogs.reduce<MealsViewModel['groups']>((all, log) => {
    const date = new Date(getDateKey(log))
    const dayLabel = formatDayLabel(date, currentTime)
    const currentGroup = all[all.length - 1]

    const entry = {
      id: log.id,
      title: log.title,
      mealType: getMealType(date),
      timeLabel: formatTime(date),
      hasPhoto: Boolean(log.photo_url),
      photoUrl: log.photo_url,
      ingredientsPreview: getIngredientNames(log.items_used),
    }

    if (!currentGroup || currentGroup.dayLabel !== dayLabel) {
      all.push({
        dayLabel,
        totalLabel: '1 餐',
        entries: [entry],
      })
      return all
    }

    currentGroup.entries.push(entry)
    currentGroup.totalLabel = `${currentGroup.entries.length} 餐`
    return all
  }, [])

  return {
    title: '饮食时间轴',
    mealCountLabel: `最近 ${mealLogs.length} 餐`,
    summary: todayCount === 0 ? '今天还没有记录，先记下第一餐。' : `今天已经记录 ${todayCount} 餐，继续保持轻量记录。`,
    groups,
    emptyState: MEAL_EMPTY_STATE,
  }
}
