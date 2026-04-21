import { useEffect, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import { buildProfileViewModel } from './view-model'
import './index.scss'

export default function ProfilePage() {
  const { items, condiments, shelves, shoppingItems, fetchAll, removeItem, deleteCondiment, deleteShelf } =
    useFridgeStore()

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  const viewModel = useMemo(
    () =>
      buildProfileViewModel({
        items,
        condiments,
        shelves,
        shoppingItems,
      }),
    [items, condiments, shelves, shoppingItems]
  )

  const handleNavigate = (path: string) => {
    if (path === 'about') {
      Taro.showModal({
        title: '关于小冰',
        content: '我的智能冰箱 v1.0\nAI 驱动的食材管理与菜谱推荐',
        showCancel: false,
        confirmText: '知道了',
      })
      return
    }
    if (path === 'feedback') {
      Taro.showModal({
        title: '反馈',
        content: '如有建议或问题，请联系：feedback@xiaoice.app',
        showCancel: false,
        confirmText: '好的',
      })
      return
    }
    Taro.navigateTo({ url: path })
  }

  const handleReset = async () => {
    const res = await Taro.showModal({
      title: '重置所有数据',
      content: '此操作将清空所有食材、调料、购物清单和饮食记录，无法恢复。确定继续？',
      confirmText: '确定重置',
      confirmColor: '#EF4444',
    })
    if (!res.confirm) return

    try {
      for (const item of items) {
        await removeItem(item.id)
      }
      for (const c of condiments) {
        await deleteCondiment(c.id)
      }
      for (const s of shelves) {
        await deleteShelf(s.id)
      }
      Taro.showToast({ title: '数据已重置', icon: 'success' })
    } catch {
      Taro.showToast({ title: '重置失败', icon: 'error' })
    }
  }

  return (
    <View className='profile-page'>
      <ScrollView scrollY className='profile-scroll'>
        <View className='profile-content'>
          <View className='profile-hero glass-card'>
            <View className='profile-avatar'>
              <Text className='profile-emoji'>{viewModel.emoji}</Text>
            </View>
            <Text className='profile-nickname'>{viewModel.nickname}</Text>
            <Text className='profile-stats'>{viewModel.manageLabel}</Text>
          </View>

          <View className='control-list'>
            {viewModel.controlItems.map((item) => (
              <View
                key={item.title}
                className='control-item glass-card'
                onClick={() => void handleNavigate(item.path)}
              >
                <View className='control-icon'>
                  <Text className='control-emoji'>{item.emoji}</Text>
                </View>
                <View className='control-copy'>
                  <Text className='control-title'>{item.title}</Text>
                  <Text className='control-subtitle'>{item.subtitle}</Text>
                </View>
                <Text className='control-arrow'>›</Text>
              </View>
            ))}
          </View>

          <View className='danger-zone'>
            <View className='reset-btn glass-card' onClick={() => void handleReset()}>
              <Text className='reset-icon'>🧹</Text>
              <Text className='reset-text'>重置所有数据</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
