import { useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'
import { useFridgeStore } from '../../stores/fridgeStore'
import { buildMealsViewModel } from './view-model'
import './index.scss'

export default function MealsPage() {
  const { mealLogs, fetchMeals, createMeal } = useFridgeStore()

  useEffect(() => {
    void fetchMeals(30)
  }, [fetchMeals])

  const viewModel = useMemo(() => buildMealsViewModel({ mealLogs }), [mealLogs])

  const handleAdd = async () => {
    try {
      // Step 1: ask for text (always required)
      const textRes = await Taro.showModal({
        title: '记录一餐',
        editable: true,
        placeholderText: '吃了什么？（如：番茄鸡蛋面）',
        confirmText: '下一步',
        confirmColor: '#7c8cff',
      })
      if (!textRes.confirm || !textRes.content?.trim()) return

      const title = textRes.content.trim()

      // Step 2: optionally add a photo
      let photoUrl: string | null = null
      try {
        const mediaRes = await Taro.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sizeType: ['compressed'],
        })
        const tempPath = mediaRes.tempFiles[0].tempFilePath
        const uploadRes = await api.uploadPhoto(tempPath)
        photoUrl = uploadRes.url
      } catch {
        // User cancelled photo selection — continue without photo
      }

      // Step 3: create meal
      await createMeal({
        title,
        photo_url: photoUrl,
        eaten_at: new Date().toISOString(),
      })
      Taro.showToast({ title: '已记录', icon: 'success' })
    } catch {
      Taro.showToast({ title: '记录失败', icon: 'error' })
    }
  }

  return (
    <View className='meals-page'>
      <ScrollView scrollY className='meals-scroll'>
        <View className='meals-content'>
          <View className='meals-hero glass-card'>
            <Text className='meals-title'>{viewModel.title}</Text>
            <Text className='meals-count'>{viewModel.mealCountLabel}</Text>
            <Text className='meals-summary'>{viewModel.summary}</Text>
          </View>

          {viewModel.groups.length === 0 ? (
            <View className='meals-empty glass-card'>
              <Text className='meals-empty-eyebrow'>{viewModel.emptyState.eyebrow}</Text>
              <Text className='meals-empty-title'>{viewModel.emptyState.title}</Text>
              <Text className='meals-empty-description'>{viewModel.emptyState.description}</Text>
              <View className='meals-empty-action' onClick={() => void handleAdd()}>
                <Text className='meals-empty-action-text'>{viewModel.emptyState.primaryActionText}</Text>
              </View>
            </View>
          ) : (
            <View className='timeline-stack'>
              {viewModel.groups.map((group) => (
                <View key={group.dayLabel} className='timeline-group'>
                  <View className='timeline-group-head'>
                    <Text className='timeline-group-day'>{group.dayLabel}</Text>
                    <Text className='timeline-group-total'>{group.totalLabel}</Text>
                  </View>

                  <View className='timeline-group-list'>
                    {group.entries.map((entry, index) => (
                      <View key={entry.id} className='timeline-entry'>
                        <View className='timeline-rail'>
                          <View className='timeline-dot' />
                          {index !== group.entries.length - 1 && <View className='timeline-line' />}
                        </View>

                        <View className='timeline-card glass-card'>
                          {entry.hasPhoto && entry.photoUrl && (
                            <Image className='timeline-photo' src={entry.photoUrl} mode='aspectFill' />
                          )}

                          <View className='timeline-card-head'>
                            <View className='timeline-card-copy'>
                              <Text className='timeline-card-title'>{entry.title}</Text>
                              <Text className='timeline-card-time'>{entry.timeLabel}</Text>
                            </View>
                            <View className='timeline-badge'>
                              <Text className='timeline-badge-text'>{entry.mealType}</Text>
                            </View>
                          </View>

                          {entry.ingredientsPreview.length > 0 && (
                            <View className='timeline-tags'>
                              {entry.ingredientsPreview.map((ingredient) => (
                                <View key={`${entry.id}-${ingredient}`} className='timeline-tag'>
                                  <Text className='timeline-tag-text'>{ingredient}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View className='bottom-action-bar meals-bottom-bar'>
        <View className='bottom-action-button' onClick={() => void handleAdd()}>
          <Text className='bottom-action-text'>记录一餐</Text>
        </View>
      </View>
    </View>
  )
}
