import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { VisionCandidate, ShelfResponse } from '../../services/api'
import './index.scss'

type CandidateWithMeta = VisionCandidate & {
  shelf_id: string
  selected: boolean
  shelf_life_days: number | null
}

type RecognizeState = 'loading' | 'success' | 'error'

export default function CameraPage() {
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [recognizeState, setRecognizeState] = useState<RecognizeState>('loading')
  const [candidates, setCandidates] = useState<CandidateWithMeta[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  const shelves = useFridgeStore((s) => s.shelves)
  const fetchShelves = useFridgeStore((s) => s.fetchShelves)
  const addItemsBatch = useFridgeStore((s) => s.addItemsBatch)

  useEffect(() => {
    if (shelves.length === 0) {
      fetchShelves()
    }
  }, [])

  useEffect(() => {
    const instance = Taro.getCurrentInstance()
    const photoPath = instance?.router?.params?.photoPath
    if (photoPath) {
      const decoded = decodeURIComponent(photoPath)
      setPhotoUri(decoded)
      doRecognize(decoded, 'weapp')
    } else {
      setRecognizeState('error')
      setErrorMsg('未收到照片，请返回重试')
    }
  }, [])

  const doRecognize = async (imageData: string, platform: 'h5' | 'weapp') => {
    setRecognizeState('loading')
    setErrorMsg('')
    setCandidates([])

    try {
      let result
      if (platform === 'h5') {
        const base64 = imageData.split(',')[1] || imageData
        result = await api.recognize({ image_base64: base64 })
      } else {
        const fs = Taro.getFileSystemManager()
        const base64Data: string = await new Promise((resolve, reject) => {
          fs.readFile({
            filePath: imageData,
            encoding: 'base64',
            success: (res) => resolve(res.data as string),
            fail: (err) => reject(err),
          })
        })
        result = await api.recognize({ image_base64: base64Data })
      }

      if (!result.candidates || result.candidates.length === 0) {
        setRecognizeState('error')
        setErrorMsg('未识别到食材，请重新拍照或手动录入')
        return
      }

      const defaultShelfId = shelves.length > 0 ? shelves[0].id : ''
      const enriched: CandidateWithMeta[] = await Promise.all(
        result.candidates.map(async (c) => {
          let shelfLifeDays = c.shelf_life_days ?? null
          if (!shelfLifeDays) {
            try {
              const sl = await api.getShelfLife(c.name)
              shelfLifeDays = sl.days
            } catch {
              // Keep null
            }
          }
          return {
            ...c,
            shelf_id: defaultShelfId,
            selected: true,
            shelf_life_days: shelfLifeDays,
          }
        })
      )

      setCandidates(enriched)
      setRecognizeState('success')
    } catch (err: any) {
      setRecognizeState('error')
      setErrorMsg(err.message || '识别失败，请重试')
    }
  }

  const updateCandidate = (idx: number, changes: Partial<CandidateWithMeta>) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...changes } : c))
    )
  }

  const handleConfirm = async () => {
    const selected = candidates.filter((c) => c.selected)
    if (selected.length === 0) return

    const items = selected.map((c) => ({
      shelf_id: c.shelf_id,
      name: c.name,
      qty: c.qty,
      unit: c.unit,
      exp_date: c.exp_date ?? null,
      barcode: c.barcode ?? null,
    }))

    try {
      await addItemsBatch(items)
      Taro.showToast({ title: `已录入 ${selected.length} 样食材`, icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch {
      Taro.showToast({ title: '入库失败', icon: 'error' })
    }
  }

  const handleRetry = () => {
    Taro.navigateBack()
  }

  const handleManualAdd = () => {
    Taro.navigateTo({ url: '/pages/fridge/add' })
  }

  const defaultShelfId = shelves.length > 0 ? shelves[0].id : ''

  return (
    <View className='camera-page'>
      <View className='camera-topbar'>
        <Text className='camera-back' onClick={() => Taro.navigateBack()}>‹ 返回</Text>
        <Text className='camera-topbar-title'>拍照识别</Text>
        <View className='camera-topbar-spacer' />
      </View>

      <ScrollView scrollY className='camera-scroll'>
        <View className={`camera-content ${recognizeState === 'success' ? 'with-bottom-action-bar' : ''}`}>
          {photoUri && (
            <View className='photo-panel glass-card'>
              <Image className='photo-image' src={photoUri} mode='aspectFill' />
            </View>
          )}

          {recognizeState === 'loading' && (
            <View className='recognize-loading glass-card'>
              <View className='loading-dots'>
                <View className='loading-dot' />
                <View className='loading-dot' />
                <View className='loading-dot' />
              </View>
              <Text className='loading-title'>正在识别</Text>
              <Text className='loading-hint'>AI 正在分析照片中的食材</Text>
            </View>
          )}

          {recognizeState === 'error' && (
            <View className='recognize-error glass-card'>
              <Text className='error-badge'>识别失败</Text>
              <Text className='error-title'>{errorMsg}</Text>
              <View className='error-actions'>
                <Text className='error-action-btn btn-retry' onClick={handleRetry}>返回重试</Text>
                <Text className='error-action-btn btn-manual' onClick={handleManualAdd}>手动录入</Text>
              </View>
            </View>
          )}

          {recognizeState === 'success' && candidates.length > 0 && (
            <View className='results-section'>
              <View className='results-head'>
                <Text className='results-title'>识别结果</Text>
                <Text className='results-count'>{candidates.length} 样食材</Text>
              </View>

              <View className='candidate-list'>
                {candidates.map((c, idx) => (
                  <View
                    key={c.id || idx}
                    className={`candidate-card glass-card ${c.selected ? '' : 'is-deselected'}`}
                  >
                    <View className='candidate-header'>
                      <View
                        className={`candidate-toggle ${c.selected ? 'is-on' : ''}`}
                        onClick={() => updateCandidate(idx, { selected: !c.selected })}
                      >
                        {c.selected && <Text className='toggle-check'>✓</Text>}
                      </View>
                      <View className='candidate-body'>
                        <Text className='candidate-name'>{c.name}</Text>
                        <Text className='candidate-confidence'>置信度 {Math.round(c.confidence * 100)}%</Text>
                      </View>
                    </View>

                    {c.selected && (
                      <View className='candidate-details'>
                        <View className='detail-row'>
                          <Text className='detail-label'>数量</Text>
                          <View className='qty-control'>
                            <Text
                              className='qty-btn'
                              onClick={() => updateCandidate(idx, { qty: Math.max(1, c.qty - 1) })}
                            >
                              -
                            </Text>
                            <Text className='qty-value'>{c.qty}</Text>
                            <Text
                              className='qty-btn'
                              onClick={() => updateCandidate(idx, { qty: c.qty + 1 })}
                            >
                              +
                            </Text>
                          </View>
                          <Text className='detail-unit'>{c.unit}</Text>
                        </View>

                        <View className='detail-row'>
                          <Text className='detail-label'>保质期</Text>
                          <Text className='shelf-life-text'>
                            {c.shelf_life_days ? `约 ${c.shelf_life_days} 天` : '未知'}
                          </Text>
                        </View>

                        <View className='detail-row'>
                          <Text className='detail-label'>放入层架</Text>
                          <View className='shelf-selector'>
                            {(shelves.length > 0 ? shelves : [{ id: defaultShelfId, name: '默认' }]).map(
                              (sh: ShelfResponse | { id: string; name: string }) => (
                                <Text
                                  key={sh.id}
                                  className={`shelf-option ${c.shelf_id === sh.id ? 'is-active' : ''}`}
                                  onClick={() => updateCandidate(idx, { shelf_id: sh.id })}
                                >
                                  {sh.name}
                                </Text>
                              )
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {recognizeState === 'success' && candidates.length > 0 && (
        <View className='camera-bottom-bar'>
          <View className='camera-confirm-btn' onClick={handleConfirm}>
            <Text className='camera-confirm-text'>确认入库</Text>
          </View>
          <View className='camera-retry-btn' onClick={handleRetry}>
            <Text className='camera-retry-text'>重拍</Text>
          </View>
        </View>
      )}
    </View>
  )
}
