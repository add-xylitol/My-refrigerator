import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import './detail.scss'

export default function MealDetailPage() {
  const id = Taro.getCurrentInstance().router?.params?.id || ''
  const { mealLogs } = useFridgeStore()
  const meal = mealLogs.find((m) => m.id === id)

  if (!meal) {
    return (
      <View className='detail-page'>
        <View className='detail-empty glass-card'>
          <Text className='detail-empty-text'>记录不存在</Text>
        </View>
      </View>
    )
  }

  const date = new Date(meal.eaten_at || meal.created_at)
  const hour = date.getHours()
  let mealType = '夜宵'
  if (hour >= 5 && hour < 10) mealType = '早餐'
  else if (hour >= 10 && hour < 14) mealType = '午餐'
  else if (hour >= 14 && hour < 17) mealType = '下午茶'
  else if (hour >= 17 && hour < 21) mealType = '晚餐'

  const timeLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  const ingredients = Array.isArray(meal.items_used)
    ? (meal.items_used as unknown[])
        .map((e) => {
          if (typeof e === 'string') return e
          if (e && typeof e === 'object' && 'name' in e) return (e as { name: string }).name
          return null
        })
        .filter((n): n is string => Boolean(n))
    : []

  return (
    <View className='detail-page'>
      <View className='detail-scroll'>
        {meal.photo_url && (
          <Image className='detail-photo' src={meal.photo_url} mode='widthFix' />
        )}

        <View className='detail-card glass-card'>
          <View className='detail-head'>
            <View className='detail-copy'>
              <Text className='detail-title'>{meal.title}</Text>
              <Text className='detail-time'>{timeLabel}</Text>
            </View>
            <View className='detail-badge'>
              <Text className='detail-badge-text'>{mealType}</Text>
            </View>
          </View>

          {ingredients.length > 0 && (
            <View className='detail-section'>
              <Text className='detail-section-title'>食材</Text>
              <View className='detail-tags'>
                {ingredients.map((name) => (
                  <View key={name} className='detail-tag'>
                    <Text className='detail-tag-text'>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {meal.note && (
            <View className='detail-section'>
              <Text className='detail-section-title'>备注</Text>
              <Text className='detail-note'>{meal.note}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}
