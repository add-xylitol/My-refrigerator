import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import './shopping.scss'

export default function ShoppingPage() {
  const {
    shoppingItems,
    fetchShopping,
    updateShoppingItem,
    removeShoppingItem,
    addShoppingItem,
  } = useFridgeStore()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('个')

  useEffect(() => {
    fetchShopping()
  }, [])

  const pending = shoppingItems.filter((s) => !s.purchased)
  const done = shoppingItems.filter((s) => s.purchased)

  const handleCheck = useCallback(async (item: typeof shoppingItems[0]) => {
    await updateShoppingItem(item.id, { purchased: true })
    const res = await Taro.showModal({
      title: '已购买',
      content: `是否将「${item.name}」加入库存？`,
      confirmText: '加入库存',
      cancelText: '不了',
      confirmColor: '#7c8cff',
    })
    if (res.confirm) {
      Taro.navigateTo({
        url: `/pages/fridge/add?name=${encodeURIComponent(item.name)}&qty=${item.qty || 1}&unit=${item.unit || '个'}`,
      })
    }
  }, [updateShoppingItem])

  const handleUncheck = useCallback(async (item: typeof shoppingItems[0]) => {
    await updateShoppingItem(item.id, { purchased: false })
  }, [updateShoppingItem])

  const handleDelete = useCallback(async (itemId: string) => {
    const res = await Taro.showModal({
      title: '删除',
      content: '确定删除这个购物项吗？',
      confirmColor: '#ff6b6b',
    })
    if (res.confirm) {
      await removeShoppingItem(itemId)
    }
  }, [removeShoppingItem])

  const handleClearDone = async () => {
    const res = await Taro.showModal({
      title: '清空已买',
      content: '确定清空所有已购买的条目？',
      confirmColor: '#ff6b6b',
    })
    if (!res.confirm) return
    for (const item of done) {
      await removeShoppingItem(item.id)
    }
  }

  const handleAddManual = async () => {
    if (!newName.trim()) {
      Taro.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    await addShoppingItem({
      name: newName.trim(),
      qty: newQty ? Number(newQty) : undefined,
      unit: newUnit || undefined,
      source: '手动添加',
    })
    setNewName('')
    setNewQty('')
    setShowAdd(false)
    Taro.showToast({ title: '已添加', icon: 'success' })
  }

  return (
    <View className='shopping-page'>
      <View className='shop-topbar'>
        <Text className='shop-back' onClick={() => Taro.navigateBack()}>‹ 返回</Text>
        <Text className='shop-topbar-title'>购物清单</Text>
        {done.length > 0 ? (
          <Text className='shop-clear' onClick={handleClearDone}>清空已买</Text>
        ) : (
          <View className='shop-topbar-spacer' />
        )}
      </View>

      <ScrollView scrollY className='shop-scroll'>
        <View className={`shop-content ${!showAdd ? 'with-bottom-action-bar' : ''}`}>
          {pending.length > 0 && (
            <View className='shop-section'>
              <Text className='shop-section-title'>
                待买 (<Text className='shop-section-count'>{pending.length}</Text>)
              </Text>
              <View className='shop-list'>
                {pending.map((item) => (
                  <View key={item.id} className='shop-card glass-card'>
                    <View
                      className='shop-checkbox'
                      onClick={() => handleCheck(item)}
                    />
                    <View className='shop-card-body'>
                      <Text className='shop-card-name'>{item.name}</Text>
                      <View className='shop-card-meta'>
                        {item.qty != null && (
                          <Text className='shop-card-qty'>
                            {item.qty}{item.unit || ''}
                          </Text>
                        )}
                        {item.source && (
                          <Text className='shop-card-source'>
                            {item.source.replace('来自:', '')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text
                      className='shop-card-delete'
                      onClick={() => handleDelete(item.id)}
                    >
                      ✕
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {done.length > 0 && (
            <View className='shop-section'>
              <Text className='shop-section-title'>
                已买 (<Text className='shop-section-count'>{done.length}</Text>)
              </Text>
              <View className='shop-list'>
                {done.map((item) => (
                  <View key={item.id} className='shop-card glass-card is-done'>
                    <View
                      className='shop-checkbox is-checked'
                      onClick={() => handleUncheck(item)}
                    >
                      <Text className='check-mark'>✓</Text>
                    </View>
                    <View className='shop-card-body'>
                      <Text className='shop-card-name is-struck'>{item.name}</Text>
                      <View className='shop-card-meta'>
                        {item.qty != null && (
                          <Text className='shop-card-qty'>{item.qty}{item.unit || ''}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {shoppingItems.length === 0 && (
            <View className='shop-empty glass-card'>
              <Text className='shop-empty-title'>购物清单是空的</Text>
              <Text className='shop-empty-description'>从菜谱推荐中添加缺少的食材，或手动录入</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {showAdd ? (
        <View className='shop-bottom-bar'>
          <View className='add-form'>
            <View className='add-form-row'>
              <Input
                className='add-input'
                placeholder='食材名称'
                placeholderStyle='color: rgba(148, 163, 184, 0.72)'
                value={newName}
                onInput={(e) => setNewName(e.detail.value)}
              />
              <Input
                className='add-input is-qty'
                type='number'
                placeholder='数量'
                placeholderStyle='color: rgba(148, 163, 184, 0.72)'
                value={newQty}
                onInput={(e) => setNewQty(e.detail.value)}
              />
            </View>
            <View className='add-form-actions'>
              <View className='add-cancel-btn' onClick={() => setShowAdd(false)}>
                <Text className='add-cancel-text'>取消</Text>
              </View>
              <View className='add-confirm-btn' onClick={handleAddManual}>
                <Text className='add-confirm-text'>添加</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View className='shop-bottom-bar'>
          <View className='shop-add-btn' onClick={() => setShowAdd(true)}>
            <Text className='shop-add-text'>添加食材</Text>
          </View>
        </View>
      )}
    </View>
  )
}
