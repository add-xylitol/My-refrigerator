import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, Input, Picker } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api } from '../../services/api'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { QuantityUnit, ShelfResponse } from '../../services/api'
import './add.scss'

const UNITS: QuantityUnit[] = ['个', '克', '毫升', '把', '袋']

function addDays(dateStr: string | null, days: number | null): string | null {
  if (!days) return dateStr || null
  const base = dateStr ? new Date(dateStr) : new Date()
  base.setDate(base.getDate() + days)
  return base.toISOString().split('T')[0]
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export default function AddItemPage() {
  const router = useRouter()
  const editId = (router.params.editId as string) || ''
  const presetShelfId = (router.params.shelfId as string) || ''

  const shelves = useFridgeStore((s) => s.shelves)
  const fetchShelves = useFridgeStore((s) => s.fetchShelves)
  const items = useFridgeStore((s) => s.items)
  const addItem = useFridgeStore((s) => s.addItem)
  const updateItem = useFridgeStore((s) => s.updateItem)
  const loading = useFridgeStore((s) => s.loading)

  // Form state
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [unitIdx, setUnitIdx] = useState(0)
  const [shelfIdx, setShelfIdx] = useState(0)
  const [expDate, setExpDate] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestedDays, setSuggestedDays] = useState<number | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (shelves.length === 0) fetchShelves()
  }, [])

  // Set default shelf from URL param
  useEffect(() => {
    if (presetShelfId && shelves.length > 0) {
      const idx = shelves.findIndex((s) => s.id === presetShelfId)
      if (idx >= 0) setShelfIdx(idx)
    }
  }, [presetShelfId, shelves])

  // Populate form if editing
  useEffect(() => {
    if (editId && items.length > 0) {
      const item = items.find((i) => i.id === editId)
      if (item) {
        setName(item.name)
        setQty(String(item.qty ?? 1))
        const uIdx = UNITS.indexOf(item.unit || '个')
        if (uIdx >= 0) setUnitIdx(uIdx)
        const sIdx = shelves.findIndex((s) => s.id === item.shelf_id)
        if (sIdx >= 0) setShelfIdx(sIdx)
        if (item.exp_date) setExpDate(item.exp_date)
      }
    }
  }, [editId, items])

  // Auto-suggest shelf life when name changes
  const handleNameInput = useCallback((val: string) => {
    setName(val)

    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!val.trim()) {
      setSuggestedDays(null)
      return
    }

    // Debounced auto-suggest
    debounceRef.current = setTimeout(async () => {
      setSuggesting(true)
      try {
        const result = await api.getShelfLife(val.trim())
        if (result.days !== null) {
          setSuggestedDays(result.days)
          // Auto-fill expiry date from today + suggested days
          if (!editId) {
            const newDate = addDays(todayStr(), result.days)
            setExpDate(newDate || '')
          }
        }
      } catch {
        setSuggestedDays(null)
      } finally {
        setSuggesting(false)
      }
    }, 600)
  }, [editId])

  const handleSubmit = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入食材名称', icon: 'none' })
      return
    }

    const targetShelf = shelves[shelfIdx]
    if (!targetShelf) {
      Taro.showToast({ title: '请选择层架', icon: 'none' })
      return
    }

    const payload = {
      shelf_id: targetShelf.id,
      name: name.trim(),
      qty: Number(qty) || 1,
      unit: UNITS[unitIdx],
      exp_date: expDate || null,
    }

    try {
      if (editId) {
        await updateItem(editId, payload)
        Taro.showToast({ title: '已更新', icon: 'success' })
      } else {
        await addItem(payload)
        Taro.showToast({ title: '已添加', icon: 'success' })
      }
      setTimeout(() => {
        Taro.navigateBack()
      }, 800)
    } catch (err: any) {
      Taro.showToast({ title: '操作失败', icon: 'error' })
    }
  }

  const handleGoBack = () => {
    Taro.navigateBack()
  }

  const selectedShelf = shelves[shelfIdx]
  const shelfNames = shelves.map((s) => s.name)

  return (
    <View className='add-page'>
      {/* Header */}
      <View className='add-header'>
        <Text className='back-btn' onClick={handleGoBack}>
          ←
        </Text>
        <Text className='add-title'>{editId ? '编辑食材' : '手动添加'}</Text>
        <View style={{ width: '64px' }} />
      </View>

      <View className='add-form'>
        {/* Name Input */}
        <View className='form-group'>
          <Text className='form-label'>食材名称</Text>
          <View className='input-wrap'>
            <Input
              className='form-input'
              placeholder='如：牛奶、鸡蛋...'
              placeholderClass='input-placeholder'
              value={name}
              onInput={(e) => handleNameInput(e.detail.value)}
            />
            {suggesting && (
              <View className='suggest-indicator'>
                <View className='suggest-dot' />
                <Text className='suggest-text'>查询中</Text>
              </View>
            )}
          </View>
          {suggestedDays !== null && name.trim() && (
            <Text className='shelf-life-hint'>
              建议保质期: {suggestedDays} 天
            </Text>
          )}
        </View>

        {/* Quantity + Unit */}
        <View className='form-row'>
          <View className='form-group form-group-sm'>
            <Text className='form-label'>数量</Text>
            <Input
              className='form-input'
              type='digit'
              placeholder='1'
              value={qty}
              onInput={(e) => setQty(e.detail.value)}
            />
          </View>

          <View className='form-group form-group-sm'>
            <Text className='form-label'>单位</Text>
            <Picker
              mode='selector'
              range={UNITS}
              value={unitIdx}
              onChange={(e) => setUnitIdx(Number(e.detail.value))}
            >
              <View className='picker-value'>
                <Text>{UNITS[unitIdx]}</Text>
                <Text className='picker-arrow'>▼</Text>
              </View>
            </Picker>
          </View>
        </View>

        {/* Shelf Selector */}
        <View className='form-group'>
          <Text className='form-label'>放入层架</Text>
          {shelves.length > 0 ? (
            <Picker
              mode='selector'
              range={shelfNames}
              value={shelfIdx}
              onChange={(e) => setShelfIdx(Number(e.detail.value))}
            >
              <View className='picker-value picker-shelf'>
                <Text className='shelf-type-icon'>
                  {selectedShelf?.type === 'freeze'
                    ? '❄️'
                    : selectedShelf?.type === 'produce'
                    ? '🥬'
                    : '🧊'}
                </Text>
                <Text>{shelfNames[shelfIdx] || '选择层架'}</Text>
                <Text className='picker-arrow'>▼</Text>
              </View>
            </Picker>
          ) : (
            <Text className='no-shelves-hint'>暂无层架，请先创建</Text>
          )}
        </View>

        {/* Expiry Date */}
        <View className='form-group'>
          <Text className='form-label'>到期日期</Text>
          <Picker
            mode='date'
            value={expDate || todayStr()}
            onChange={(e) => setExpDate(e.detail.value)}
          >
            <View className='picker-value'>
              <Text className={expDate ? '' : 'no-date'}>
                {expDate || '选择日期'}
              </Text>
              <Text className='picker-arrow'>▼</Text>
            </View>
          </Picker>
          {expDate && (
            <Text className='date-hint'>
              {getDateDiffText(expDate)}
            </Text>
          )}
        </View>

        {/* Submit Button */}
        <View
          className={`submit-btn ${loading ? 'submit-loading' : ''}`}
          onClick={loading ? undefined : handleSubmit}
        >
          <Text className='submit-text'>
            {loading ? '处理中...' : editId ? '保存修改' : '添加'}
          </Text>
        </View>
      </View>
    </View>
  )
}

function getDateDiffText(dateStr: string): string {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `已过期 ${Math.abs(diff)} 天`
  if (diff === 0) return '今天到期'
  if (diff === 1) return '明天到期'
  return `${diff} 天后到期`
}
