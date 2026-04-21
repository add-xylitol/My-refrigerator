import { useEffect, useMemo, useState, useCallback } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { ItemResponse } from '../../services/api'
import './detail.scss'

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function expiryColorClass(days: number | null): string {
  if (days === null) return 'exp-green'
  if (days <= 0) return 'exp-red'
  if (days <= 2) return 'exp-orange'
  if (days <= 5) return 'exp-yellow'
  return 'exp-green'
}

function expiryLabel(days: number | null): string {
  if (days === null) return '无日期'
  if (days < 0) return `已过期${Math.abs(days)}天`
  if (days === 0) return '今天到期'
  if (days === 1) return '明天到期'
  return `${days}天后到期`
}

function formatDateCN(dateStr: string | null | undefined): string {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ShelfDetailPage() {
  const router = useRouter()
  const shelfId = (router.params.shelfId as string) || ''
  const { shelves, items, loading, fetchItems, fetchShelves, updateItem, removeItem } =
    useFridgeStore()

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (shelfId) {
      fetchItems(shelfId)
    }
    if (shelves.length === 0) {
      fetchShelves()
    }
  }, [shelfId])

  const shelf = useMemo(
    () => shelves.find((s) => s.id === shelfId),
    [shelves, shelfId]
  )

  const sortedItems = useMemo(() => {
    let filtered = items.filter((i) => i.shelf_id === shelfId)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q))
    }
    return filtered.sort((a, b) => {
      const da = daysUntil(a.exp_date)
      const db = daysUntil(b.exp_date)
      if (da === null && db === null) return 0
      if (da === null) return 1
      if (db === null) return -1
      return da - db
    })
  }, [items, shelfId, searchQuery])

  const handleDecrease = useCallback(
    async (item: ItemResponse) => {
      const newQty = Math.max(0, (item.qty ?? 1) - 1)
      if (newQty === 0) {
        await removeItem(item.id)
      } else {
        await updateItem(item.id, { qty: newQty })
      }
    },
    [updateItem, removeItem]
  )

  const handleUseUp = useCallback(
    async (item: ItemResponse) => {
      await removeItem(item.id)
      Taro.showToast({ title: '已用完', icon: 'success' })
    },
    [removeItem]
  )

  const handleEdit = useCallback((item: ItemResponse) => {
    Taro.navigateTo({
      url: `/pages/fridge/add?editId=${item.id}&shelfId=${shelfId}`,
    })
  }, [shelfId])

  const handleTakePhoto = () => {
    Taro.navigateTo({ url: '/pages/camera/index' })
  }

  const handleGoBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className='detail-page'>
      <View className='detail-header'>
        <Text className='back-btn' onClick={handleGoBack}>←</Text>
        <Text className='detail-title'>{shelf?.name || '层架详情'}</Text>
        <Text className='edit-shelf-btn'>编辑层架</Text>
      </View>

      <View className='search-bar'>
        <Input
          className='search-input'
          placeholder='搜索食材...'
          placeholderClass='search-placeholder'
          value={searchQuery}
          onInput={(e) => setSearchQuery(e.detail.value)}
        />
        {searchQuery && (
          <Text className='search-clear' onClick={() => setSearchQuery('')}>✕</Text>
        )}
      </View>

      <ScrollView scrollY className='detail-scroll'>
        {sortedItems.length === 0 && !loading && (
          <View className='empty-state glass-card'>
            <Text className='empty-title'>这层还是空的</Text>
            <View className='empty-btn' onClick={handleTakePhoto}>
              <Text className='empty-btn-text'>去拍照</Text>
            </View>
          </View>
        )}

        {sortedItems.map((item) => {
          const d = daysUntil(item.exp_date)
          const colorCls = expiryColorClass(d)
          return (
            <View key={item.id} className={`item-card glass-card ${colorCls}`}>
              <View className='item-main'>
                <View className='item-info'>
                  <Text className='item-name'>{item.name}</Text>
                  <Text className='item-qty'>
                    {item.qty ?? 0} {item.unit || '个'}
                  </Text>
                </View>
                <View className='item-expiry-wrap'>
                  <Text className={`item-expiry ${colorCls}`}>
                    {formatDateCN(item.exp_date)}
                  </Text>
                  <Text className={`expiry-label ${colorCls}`}>
                    {expiryLabel(d)}
                  </Text>
                </View>
              </View>

              <View className='item-actions'>
                <Text
                  className='action-btn action-decrease'
                  onClick={() => handleDecrease(item)}
                >
                  减一
                </Text>
                <Text
                  className='action-btn action-useup'
                  onClick={() => handleUseUp(item)}
                >
                  用完
                </Text>
                <Text
                  className='action-btn action-edit'
                  onClick={() => handleEdit(item)}
                >
                  编辑
                </Text>
              </View>
            </View>
          )
        })}

        <View style={{ height: '40px' }} />
      </ScrollView>
    </View>
  )
}
