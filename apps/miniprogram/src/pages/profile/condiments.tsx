import { useEffect, useState, useMemo } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { CondimentResponse, CondimentCategory, StockLevel } from '../../services/api'
import './condiments.scss'

const CATEGORIES: CondimentCategory[] = ['酱油/醋', '香料', '油/脂', '其他']
const FILTERS: { label: string; value: 'all' | StockLevel }[] = [
  { label: '全部', value: 'all' },
  { label: '充足', value: '充足' },
  { label: '缺货', value: '缺货' },
]

export default function CondimentsPage() {
  const {
    condiments,
    fetchCondiments,
    upsertCondiments,
    deleteCondiment,
    addShoppingItem,
  } = useFridgeStore()

  const [activeFilter, setActiveFilter] = useState<'all' | StockLevel>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<CondimentCategory>('其他')

  useEffect(() => {
    fetchCondiments()
  }, [])

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return condiments
    return condiments.filter((c) => c.stock_level === activeFilter)
  }, [condiments, activeFilter])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<CondimentCategory, CondimentResponse[]>()
    for (const c of filtered) {
      const cat = c.category || '其他'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(c)
    }
    return Array.from(map.entries())
  }, [filtered])

  const stockDotClass = (level?: StockLevel) => {
    switch (level) {
      case '充足': return 'dot-green'
      case '缺货': return 'dot-red'
      case '临期': return 'dot-yellow'
      default: return 'dot-green'
    }
  }

  const handleRestock = async (c: CondimentResponse) => {
    await addShoppingItem({ name: c.name, source: '补货' })
    Taro.showToast({ title: '已加入购物清单', icon: 'success' })
  }

  const handleDelete = async (c: CondimentResponse) => {
    const res = await Taro.showModal({
      title: '删除调料',
      content: `确定删除「${c.name}」吗？`,
      confirmColor: '#EF4444',
    })
    if (res.confirm) {
      await deleteCondiment(c.id)
    }
  }

  const handleLongPress = (c: CondimentResponse) => {
    Taro.showActionSheet({
      itemList: ['删除'],
      itemColor: '#EF4444',
    }).then(async (res) => {
      if (res.tapIndex === 0) {
        await handleDelete(c)
      }
    }).catch(() => {})
  }

  const handleAdd = async () => {
    if (!newName.trim()) {
      Taro.showToast({ title: '请输入调料名称', icon: 'none' })
      return
    }
    await upsertCondiments([{
      name: newName.trim(),
      category: newCategory,
      stock_level: '充足',
    }])
    setNewName('')
    setShowAdd(false)
    Taro.showToast({ title: '已添加', icon: 'success' })
  }

  const handleToggleStock = async (c: CondimentResponse) => {
    const newLevel: StockLevel = c.stock_level === '充足' ? '缺货' : '充足'
    await upsertCondiments([{
      id: c.id,
      name: c.name,
      category: c.category,
      stock_level: newLevel,
    }])
  }

  return (
    <View className='condiments-page'>
      {/* Top bar */}
      <View className='cond-topbar'>
        <Text className='back-btn' onClick={() => Taro.navigateBack()}>‹ 返回</Text>
        <Text className='topbar-title'>调料管理</Text>
        <Text className='topbar-add' onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '+ 添加'}
        </Text>
      </View>

      {/* Add form */}
      {showAdd && (
        <View className='add-form'>
          <View className='add-form-row'>
            <Input
              className='add-input'
              placeholder='调料名称'
              value={newName}
              onInput={(e) => setNewName(e.detail.value)}
            />
          </View>
          <View className='category-selector'>
            {CATEGORIES.map((cat) => (
              <View
                key={cat}
                className={`cat-option ${newCategory === cat ? 'cat-active' : ''}`}
                onClick={() => setNewCategory(cat)}
              >
                <Text className='cat-text'>{cat}</Text>
              </View>
            ))}
          </View>
          <View className='add-form-actions'>
            <View className='add-confirm' onClick={handleAdd}>
              <Text className='add-confirm-text'>确认添加</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filters */}
      <ScrollView scrollX className='filter-scroll' enhanced showScrollbar={false}>
        <View className='filter-row'>
          {FILTERS.map((f) => (
            <View
              key={f.value}
              className={`filter-chip ${activeFilter === f.value ? 'chip-active' : ''}`}
              onClick={() => setActiveFilter(f.value)}
            >
              <Text className='filter-chip-text'>{f.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <ScrollView scrollY className='cond-scroll'>
        {grouped.length === 0 ? (
          <View className='cond-empty'>
            <Text className='cond-empty-icon'>🧂</Text>
            <Text className='cond-empty-text'>暂无调料</Text>
            <Text className='cond-empty-hint'>点击右上角添加</Text>
          </View>
        ) : (
          grouped.map(([category, items]) => (
            <View key={category} className='cond-group'>
              <Text className='cond-group-label'>{category}</Text>
              {items.map((c) => (
                <View
                  key={c.id}
                  className='cond-card'
                  onLongPress={() => handleLongPress(c)}
                >
                  <View
                    className='cond-dot-wrap'
                    onClick={() => handleToggleStock(c)}
                  >
                    <View className={`cond-dot ${stockDotClass(c.stock_level)}`} />
                  </View>
                  <Text className='cond-name'>{c.name}</Text>
                  {c.stock_level === '缺货' ? (
                    <View
                      className='cond-restock'
                      onClick={() => handleRestock(c)}
                    >
                      <Text className='restock-text'>补货→购物清单</Text>
                    </View>
                  ) : (
                    <Text className='cond-level'>{c.stock_level}</Text>
                  )}
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: '40px' }} />
      </ScrollView>
    </View>
  )
}
