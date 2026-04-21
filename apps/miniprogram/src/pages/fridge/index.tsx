import { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import './index.scss'

function formatDate(): string {
  const d = new Date()
  const month = d.getMonth() + 1
  const day = d.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekDay = weekDays[d.getDay()]
  return `${month}月${day}日 周${weekDay}`
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function expiryLabel(days: number | null): string {
  if (days === null) return '未设置到期时间'
  if (days < 0) return `已过期${Math.abs(days)}天`
  if (days === 0) return '今天到期'
  if (days === 1) return '明天到期'
  return `${days}天后到期`
}

function shelfTypeLabel(type?: string): string {
  switch (type) {
    case 'freeze':
      return '冷冻区'
    case 'produce':
      return '果蔬区'
    case 'chill':
    default:
      return '冷藏区'
  }
}

export default function FridgePage() {
  const { shelves, items, recipes, loading } = useFridgeStore()

  const totalItems = items.length

  const nearExpiryItems = useMemo(
    () => items
      .filter((item) => {
        const d = daysUntil(item.exp_date)
        return d !== null && d >= 0 && d <= 2
      })
      .sort((a, b) => {
        const da = daysUntil(a.exp_date) ?? 999
        const db = daysUntil(b.exp_date) ?? 999
        return da - db
      }),
    [items]
  )

  const missingItems = useMemo(
    () => items.filter((item) => (item.qty ?? 0) <= 0),
    [items]
  )

  const shelfStats = useMemo(() => {
    return shelves.map((shelf) => {
      const shelfItems = items.filter((item) => item.shelf_id === shelf.id)
      const sortedItems = [...shelfItems].sort((a, b) => {
        const da = daysUntil(a.exp_date)
        const db = daysUntil(b.exp_date)
        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return da - db
      })

      const nearExpiryCount = sortedItems.filter((item) => {
        const d = daysUntil(item.exp_date)
        return d !== null && d >= 0 && d <= 2
      }).length

      return {
        ...shelf,
        itemCount: sortedItems.length,
        nearExpiryCount,
        representativeItems: sortedItems.slice(0, 3),
      }
    })
  }, [shelves, items])

  const alerts = useMemo(() => {
    return nearExpiryItems.slice(0, 3).map((item) => {
      const recipe = recipes.find((r) =>
        r.usage.some((u) => u.name.includes(item.name))
      )

      return {
        item,
        label: expiryLabel(daysUntil(item.exp_date)),
        recipe: recipe || null,
      }
    })
  }, [nearExpiryItems, recipes])

  const suggestedAction =
    nearExpiryItems.length > 0
      ? `优先处理 ${nearExpiryItems[0].name}`
      : totalItems === 0
        ? '拍照补充第一批食材'
        : '继续保持库存更新'

  const heroTitle =
    totalItems === 0
      ? '先让冰箱开始运转'
      : nearExpiryItems.length > 0
        ? '有食材需要优先安排'
        : '库存井然，下一步更明确'

  const firstUrgentItem = nearExpiryItems[0]
  const firstUrgentRecipe = firstUrgentItem
    ? recipes.find((recipe) => recipe.usage.some((usage) => usage.name.includes(firstUrgentItem.name))) || null
    : null

  const handleShelfClick = (shelfId: string) => {
    Taro.navigateTo({ url: `/pages/fridge/detail?shelfId=${shelfId}` })
  }

  const handleAddClick = async () => {
    try {
      const res = await Taro.showActionSheet({
        itemList: ['拍照识别', '从相册选择', '手动添加'],
      })
      if (res.tapIndex === 0) {
        handlePickImage('camera')
      } else if (res.tapIndex === 1) {
        handlePickImage('album')
      } else if (res.tapIndex === 2) {
        Taro.navigateTo({ url: '/pages/fridge/add' })
      }
    } catch (err: any) {
      if (err.errMsg?.includes('cancel')) return
      Taro.showToast({ title: '操作失败', icon: 'error' })
    }
  }

  const handlePickImage = async (source: 'camera' | 'album') => {
    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: [source],
        sizeType: ['compressed'],
      })
      const tempFile = res.tempFiles[0]
      Taro.navigateTo({
        url: `/pages/camera/index?photoPath=${encodeURIComponent(tempFile.tempFilePath)}`,
      })
    } catch (err: any) {
      if (err.errMsg?.includes('cancel')) return
      Taro.showToast({ title: source === 'camera' ? '拍照失败' : '选择失败', icon: 'error' })
    }
  }

  const handleViewRecipe = (recipeId: string) => {
    Taro.navigateTo({ url: `/pages/discover/index?recipeId=${recipeId}` })
  }

  const handleSuggestedAction = () => {
    if (firstUrgentItem) {
      if (firstUrgentRecipe) {
        handleViewRecipe(firstUrgentRecipe.id)
        return
      }

      if (firstUrgentItem.shelf_id) {
        handleShelfClick(firstUrgentItem.shelf_id)
        return
      }
    }

    if (totalItems === 0) {
      handleAddClick()
      return
    }

    if (shelfStats[0]) {
      handleShelfClick(shelfStats[0].id)
      return
    }

    handleAddClick()
  }

  const handleOverviewAction = () => {
    if (shelfStats[0]) {
      handleShelfClick(shelfStats[0].id)
      return
    }

    handleAddClick()
  }

  return (
    <View className='fridge-page'>
      <ScrollView scrollY className='fridge-scroll'>
        <View className='fridge-content with-bottom-action-bar'>
          <View className='hero-panel glass-card'>
            <Text className='hero-eyebrow'>今日冰箱状态 · {formatDate()}</Text>
            <Text className='hero-title'>{heroTitle}</Text>
            <Text className='hero-subtitle'>{suggestedAction}</Text>
            <View className='hero-meta'>
              <Text className='hero-meta-item'>共 {shelfStats.length} 个分区</Text>
              <Text className='hero-meta-dot'>·</Text>
              <Text className='hero-meta-item'>
                {loading ? '正在同步库存' : nearExpiryItems.length > 0 ? `${nearExpiryItems.length} 条提醒待处理` : '当前状态稳定'}
              </Text>
            </View>

            <View className='metrics-row'>
              <View className='metric-tile'>
                <Text className='metric-value'>{totalItems}</Text>
                <Text className='metric-label'>当前库存</Text>
                <Text className='metric-note'>已记录食材总数</Text>
              </View>
              <View className='metric-tile'>
                <Text className='metric-value'>{nearExpiryItems.length}</Text>
                <Text className='metric-label'>临期提醒</Text>
                <Text className='metric-note'>未来 48 小时优先处理</Text>
              </View>
              <View className='metric-tile'>
                <Text className='metric-value'>{missingItems.length}</Text>
                <Text className='metric-label'>空缺食材</Text>
                <Text className='metric-note'>数量归零待补充</Text>
              </View>
            </View>
          </View>

          <View className='priority-row section-block'>
            <View className='priority-card glass-card' onClick={handleSuggestedAction}>
              <Text className='priority-label'>建议动作</Text>
              <Text className='priority-title'>
                {firstUrgentItem
                  ? `先安排 ${firstUrgentItem.name}`
                  : totalItems === 0
                    ? '建立第一批库存'
                    : '做一次今日巡检'}
              </Text>
              <Text className='priority-description'>
                {firstUrgentItem
                  ? `${expiryLabel(daysUntil(firstUrgentItem.exp_date))}${firstUrgentRecipe ? ` · 推荐先做 ${firstUrgentRecipe.title}` : ' · 进入所在分区处理'}`
                  : totalItems === 0
                    ? '用拍照入库快速建立冰箱台账'
                    : '查看分区并确认食材数量与状态'}
              </Text>
              <Text className='priority-cta'>
                {firstUrgentItem ? (firstUrgentRecipe ? '看菜谱' : '去处理') : totalItems === 0 ? '立即拍照' : '查看分区'}
              </Text>
            </View>

            <View className='priority-card glass-card priority-card-secondary' onClick={handleOverviewAction}>
              <Text className='priority-label'>层架总览</Text>
              <Text className='priority-title'>
                {missingItems.length > 0 ? `${missingItems.length} 项库存待确认` : `${shelfStats.length} 个分区可查看`}
              </Text>
              <Text className='priority-description'>
                {missingItems.length > 0
                  ? '有空缺食材时，先从分区里确认是否已经用完'
                  : shelfStats.length > 0
                    ? '按分区查看库存结构和临期分布'
                    : '添加食材后，这里会形成清晰的分区视图'}
              </Text>
              <Text className='priority-cta'>{shelfStats.length > 0 ? '查看层架' : '准备入库'}</Text>
            </View>
          </View>

          <View className='chamber-section section-block'>
            <View className='section-head'>
              <Text className='section-title'>冰箱分区</Text>
              <Text className='section-subtitle'>按层架查看库存数量和临期情况</Text>
            </View>

            {!loading && shelfStats.length === 0 ? (
              <View className='empty-panel glass-card'>
                <Text className='empty-title'>冰箱里还没有建立分区视图</Text>
                <Text className='empty-description'>先拍照入库，系统会把识别到的食材整理进可查看的层架。</Text>
              </View>
            ) : (
              <View className='chamber-list'>
                {shelfStats.map((shelf) => (
                  <View
                    key={shelf.id}
                    className='chamber-card glass-card'
                    onClick={() => handleShelfClick(shelf.id)}
                  >
                    <View className='chamber-head'>
                      <View className='chamber-copy'>
                        <Text className='chamber-type'>{shelfTypeLabel(shelf.type)}</Text>
                        <Text className='chamber-name'>{shelf.name}</Text>
                        <Text className='chamber-count'>{shelf.itemCount} 样食材</Text>
                      </View>
                      <View className='chamber-side'>
                        {shelf.nearExpiryCount > 0 && (
                          <View className='chamber-badge'>
                            <Text className='chamber-badge-text'>{shelf.nearExpiryCount} 临期</Text>
                          </View>
                        )}
                        <Text className='chamber-arrow'>查看</Text>
                      </View>
                    </View>

                    <View className='chamber-preview'>
                      {shelf.representativeItems.length > 0 ? (
                        shelf.representativeItems.map((item) => (
                          <View key={item.id} className='ingredient-tag'>
                            <Text className='ingredient-tag-text'>{item.name}</Text>
                          </View>
                        ))
                      ) : (
                        <Text className='chamber-empty-text'>这层目前还没有食材</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className='alerts-section section-block'>
            <View className='section-head'>
              <Text className='section-title'>智能提醒</Text>
              <Text className='section-subtitle'>先处理最容易浪费的食材</Text>
            </View>

            {alerts.length > 0 ? (
              <View className='alert-list'>
                {alerts.map(({ item, label, recipe }) => (
                  <View key={item.id} className='alert-card glass-card'>
                    <View className='alert-top'>
                      <View className='alert-copy'>
                        <Text className='alert-badge'>临期提醒</Text>
                        <Text className='alert-name'>{item.name}</Text>
                        <Text className='alert-description'>
                          {label}
                          {item.qty ? ` · 剩余 ${item.qty}${item.unit || ''}` : ''}
                        </Text>
                      </View>
                      <View
                        className='alert-cta'
                        onClick={() => {
                          if (recipe) {
                            handleViewRecipe(recipe.id)
                            return
                          }
                          if (item.shelf_id) {
                            handleShelfClick(item.shelf_id)
                            return
                          }
                          handleAddClick()
                        }}
                      >
                        <Text className='alert-cta-text'>{recipe ? '看菜谱' : '去处理'}</Text>
                      </View>
                    </View>
                    <Text className='alert-note'>
                      {recipe ? `推荐先做 ${recipe.title}` : '进入所在分区，调整数量或尽快用掉它。'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className='empty-panel glass-card'>
                <Text className='empty-title'>当前没有需要立即处理的食材</Text>
                <Text className='empty-description'>继续保持拍照入库和数量更新，提醒会在真正需要时出现。</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View className='bottom-action-bar fridge-bottom-bar'>
        <View className='bottom-action-button' onClick={handleAddClick}>
          <Text className='bottom-action-text'>拍照入库</Text>
        </View>
      </View>
    </View>
  )
}
