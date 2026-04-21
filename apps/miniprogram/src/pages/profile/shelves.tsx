import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { ShelfType } from '../../services/api'
import './shelves.scss'

const SHELF_TYPES: { value: ShelfType; label: string; shortLabel: string }[] = [
  { value: 'chill', label: '冷藏', shortLabel: '冷' },
  { value: 'freeze', label: '冷冻', shortLabel: '冻' },
  { value: 'produce', label: '蔬果', shortLabel: '蔬' },
]

function getShelfShortLabel(type?: string): string {
  switch (type) {
    case 'freeze': return '冻'
    case 'produce': return '蔬'
    default: return '冷'
  }
}

export default function ShelvesPage() {
  const {
    shelves,
    items,
    fetchShelves,
    upsertShelves,
    deleteShelf,
  } = useFridgeStore()

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<ShelfType>('chill')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    fetchShelves()
  }, [])

  const getShelfItemCount = (shelfId: string) =>
    items.filter((i) => i.shelf_id === shelfId).length

  const handleAdd = async () => {
    if (!newName.trim()) {
      Taro.showToast({ title: '请输入层架名称', icon: 'none' })
      return
    }
    const maxSort = shelves.reduce((max, s) => Math.max(max, s.sort || 0), 0)
    await upsertShelves([{
      name: newName.trim(),
      type: newType,
      sort: maxSort + 1,
    }])
    setNewName('')
    setShowAdd(false)
    Taro.showToast({ title: '已添加', icon: 'success' })
  }

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return
    const sorted = [...shelves].sort((a, b) => (a.sort || 0) - (b.sort || 0))
    const updated = [...sorted]
    const temp = updated[idx]
    updated[idx] = updated[idx - 1]
    updated[idx - 1] = temp
    await upsertShelves(updated.map((s, i) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      sort: i,
    })))
  }

  const handleMoveDown = async (idx: number) => {
    const sorted = [...shelves].sort((a, b) => (a.sort || 0) - (b.sort || 0))
    if (idx >= sorted.length - 1) return
    const updated = [...sorted]
    const temp = updated[idx]
    updated[idx] = updated[idx + 1]
    updated[idx + 1] = temp
    await upsertShelves(updated.map((s, i) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      sort: i,
    })))
  }

  const handleEdit = (shelf: typeof shelves[0]) => {
    setEditingId(shelf.id)
    setEditName(shelf.name)
  }

  const handleSaveEdit = async (shelf: typeof shelves[0]) => {
    if (!editName.trim()) return
    await upsertShelves([{
      id: shelf.id,
      name: editName.trim(),
      type: shelf.type,
      sort: shelf.sort,
    }])
    setEditingId(null)
    setEditName('')
    Taro.showToast({ title: '已保存', icon: 'success' })
  }

  const handleDelete = async (shelfId: string, shelfName: string) => {
    const count = getShelfItemCount(shelfId)
    const msg = count > 0
      ? `「${shelfName}」还有 ${count} 件食材，确定删除吗？`
      : `确定删除「${shelfName}」吗？`
    const res = await Taro.showModal({
      title: '删除层架',
      content: msg,
      confirmColor: '#ff6b6b',
    })
    if (res.confirm) {
      await deleteShelf(shelfId)
    }
  }

  const sortedShelves = [...shelves].sort((a, b) => (a.sort || 0) - (b.sort || 0))

  return (
    <View className='shelves-page'>
      <View className='shelves-topbar'>
        <Text className='shelves-back' onClick={() => Taro.navigateBack()}>‹ 返回</Text>
        <Text className='shelves-topbar-title'>层架管理</Text>
        <Text className='shelves-topbar-add' onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '取消' : '+ 添加'}
        </Text>
      </View>

      {showAdd && (
        <View className='shelves-add-form glass-card'>
          <View className='shelves-add-row'>
            <Input
              className='shelves-add-input'
              placeholder='层架名称（如：上层冷藏）'
              placeholderStyle='color: rgba(148, 163, 184, 0.62)'
              value={newName}
              onInput={(e) => setNewName(e.detail.value)}
            />
          </View>
          <View className='type-selector'>
            {SHELF_TYPES.map((t) => (
              <View
                key={t.value}
                className={`type-option ${newType === t.value ? 'type-active' : ''}`}
                onClick={() => setNewType(t.value)}
              >
                <Text className='type-label'>{t.label}</Text>
              </View>
            ))}
          </View>
          <View className='shelves-add-actions'>
            <View className='shelves-add-confirm' onClick={handleAdd}>
              <Text className='shelves-add-confirm-text'>确认添加</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView scrollY className='shelves-scroll'>
        {sortedShelves.length === 0 ? (
          <View className='shelves-empty glass-card'>
            <Text className='shelves-empty-title'>暂无层架</Text>
            <Text className='shelves-empty-hint'>点击右上角添加</Text>
          </View>
        ) : (
          sortedShelves.map((shelf, idx) => {
            const count = getShelfItemCount(shelf.id)
            const isEditing = editingId === shelf.id

            return (
              <View key={shelf.id} className='shelf-item glass-card'>
                <View className='move-controls'>
                  <Text
                    className={`move-btn ${idx === 0 ? 'move-disabled' : ''}`}
                    onClick={idx === 0 ? undefined : () => handleMoveUp(idx)}
                  >
                    ▲
                  </Text>
                  <Text
                    className={`move-btn ${idx === sortedShelves.length - 1 ? 'move-disabled' : ''}`}
                    onClick={idx === sortedShelves.length - 1 ? undefined : () => handleMoveDown(idx)}
                  >
                    ▼
                  </Text>
                </View>

                <View className='shelf-item-content'>
                  <View className='shelf-item-icon'>
                    <Text className='shelf-type-label'>{getShelfShortLabel(shelf.type)}</Text>
                  </View>

                  {isEditing ? (
                    <View className='shelf-edit-row'>
                      <Input
                        className='shelf-edit-input'
                        value={editName}
                        onInput={(e) => setEditName(e.detail.value)}
                        focus
                      />
                      <Text
                        className='shelf-edit-save'
                        onClick={() => handleSaveEdit(shelf)}
                      >
                        保存
                      </Text>
                    </View>
                  ) : (
                    <View className='shelf-item-info'>
                      <Text className='shelf-item-name'>{shelf.name}</Text>
                      <Text className='shelf-item-count'>{count} 件食材</Text>
                    </View>
                  )}

                  {!isEditing && (
                    <View className='shelf-item-actions'>
                      <Text
                        className='action-btn action-edit'
                        onClick={() => handleEdit(shelf)}
                      >
                        编辑
                      </Text>
                      <Text
                        className='action-btn action-delete'
                        onClick={() => handleDelete(shelf.id, shelf.name)}
                      >
                        删除
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })
        )}

        <View style={{ height: '40px' }} />
      </ScrollView>
    </View>
  )
}
