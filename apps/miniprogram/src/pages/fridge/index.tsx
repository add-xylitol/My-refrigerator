import { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import './index.scss'

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function expiryLabel(days: number | null): string {
  if (days === null) return ''
  if (days < 0) return `过期${Math.abs(days)}天`
  if (days === 0) return '今天到期'
  if (days === 1) return '明天到期'
  return `${days}天后`
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
      .sort((a, b) => (daysUntil(a.exp_date) ?? 999) - (daysUntil(b.exp_date) ?? 999)),
    [items]
  )

  const shelfStats = useMemo(() => {
    return shelves.map((shelf) => {
      const shelfItems = items.filter((item) => item.shelf_id === shelf.id)
      const nearExpiryCount = shelfItems.filter((item) => {
        const d = daysUntil(item.exp_date)
        return d !== null && d >= 0 && d <= 2
      }).length
      return {
        ...shelf,
        itemCount: shelfItems.length,
        nearExpiryCount,
        preview: shelfItems.slice(0, 3).map((i) => i.name),
      }
    })
  }, [shelves, items])

  const alerts = useMemo(() => {
    return nearExpiryItems.slice(0, 3).map((item) => {
      const recipe = recipes.find((r) => r.usage.some((u) => u.name.includes(item.name)))
      return { item, recipe: recipe || null }
    })
  }, [nearExpiryItems, recipes])

  const handleShelfClick = (shelfId: string) => {
    Taro.navigateTo({ url: `/pages/fridge/detail?shelfId=${shelfId}` })
  }

  const handleAddClick = async () => {
    try {
      const res = await Taro.showActionSheet({
        itemList: ['拍照识别', '从相册选择', '手动添加'],
      })
      if (res.tapIndex === 0) handlePickImage('camera')
      else if (res.tapIndex === 1) handlePickImage('album')
      else Taro.navigateTo({ url: '/pages/fridge/add' })
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
      Taro.navigateTo({
        url: `/pages/camera/index?photoPath=${encodeURIComponent(res.tempFiles[0].tempFilePath)}`,
      })
    } catch (err: any) {
      if (err.errMsg?.includes('cancel')) return
      Taro.showToast({ title: source === 'camera' ? '拍照失败' : '选择失败', icon: 'error' })
    }
  }

  return (
    <View className='fridge-page'>
      <ScrollView scrollY className='fridge-scroll'>
        <View className='fridge-content with-bottom-action-bar'>

          {/* Status bar */}
          <View className='status-bar'>
            <View className='stat-item'>
              <Text className='stat-value'>{totalItems}</Text>
              <Text className='stat-label'>库存</Text>
            </View>
            <View className='stat-item stat-warn'>
              <Text className='stat-value'>{nearExpiryItems.length}</Text>
              <Text className='stat-label'>临期</Text>
            </View>
            <View className='stat-item'>
              <Text className='stat-value'>{shelves.length}</Text>
              <Text className='stat-label'>分区</Text>
            </View>
          </View>

          {/* Alerts */}
          {alerts.length > 0 && (
            <View className='alert-section'>
              <Text className='section-title'>临期提醒</Text>
              {alerts.map(({ item, recipe }) => (
                <View key={item.id} className='alert-item glass-card'>
                  <View className='alert-info'>
                    <Text className='alert-name'>{item.name}</Text>
                    <Text className='alert-expiry'>{expiryLabel(daysUntil(item.exp_date))}</Text>
                  </View>
                  {recipe && (
                    <View className='alert-recipe' onClick={() => Taro.navigateTo({ url: `/pages/discover/recipe?id=${recipe.id}` })}>
                      <Text className='alert-recipe-text'>{recipe.title}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Shelves */}
          <View className='shelf-section'>
            <Text className='section-title'>冰箱分区</Text>
            {!loading && shelfStats.length === 0 ? (
              <View className='empty-panel glass-card'>
                <Text className='empty-text'>还没有分区，拍照入库后自动生成</Text>
              </View>
            ) : (
              shelfStats.map((shelf) => (
                <View
                  key={shelf.id}
                  className='shelf-card glass-card'
                  onClick={() => handleShelfClick(shelf.id)}
                >
                  <View className='shelf-main'>
                    <Text className='shelf-name'>{shelf.name}</Text>
                    <Text className='shelf-count'>{shelf.itemCount}样</Text>
                    {shelf.nearExpiryCount > 0 && (
                      <Text className='shelf-badge'>{shelf.nearExpiryCount}临期</Text>
                    )}
                  </View>
                  {shelf.preview.length > 0 && (
                    <View className='shelf-tags'>
                      {shelf.preview.map((name) => (
                        <Text key={name} className='shelf-tag'>{name}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ))
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
