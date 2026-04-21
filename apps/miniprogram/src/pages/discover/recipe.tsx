import { useEffect, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { RecipeSuggestion } from '../../services/api'
import './recipe.scss'

export default function RecipeDetailPage() {
  const router = useRouter()
  const { recipes, consumeRecipe, fetchRecipes, items } = useFridgeStore()
  const [recipe, setRecipe] = useState<RecipeSuggestion | null>(null)
  const [cooking, setCooking] = useState(false)

  useEffect(() => {
    const id = router.params.id
    if (!id) return

    let found = recipes.find((r) => r.id === id) || null
    if (!found) {
      fetchRecipes({ max_results: 10 }).then(() => {
        const store = useFridgeStore.getState()
        const r = store.recipes.find((x) => x.id === id) || null
        setRecipe(r)
      })
    } else {
      setRecipe(found)
    }
  }, [router.params.id])

  if (!recipe) {
    return (
      <View className='recipe-detail-page'>
        <View className='recipe-topbar'>
          <Text className='recipe-back' onClick={() => Taro.navigateBack()}>‹ 返回</Text>
        </View>
        <View className='recipe-loading'>
          <Text className='recipe-loading-text'>加载中...</Text>
        </View>
      </View>
    )
  }

  const handleConsume = async () => {
    const res = await Taro.showModal({
      title: '确认烹饪',
      content: `即将消耗「${recipe.title}」所需的食材，确定开始吗？`,
      confirmText: '开始烹饪',
      cancelText: '取消',
      confirmColor: '#7c8cff',
    })

    if (!res.confirm) return

    setCooking(true)
    try {
      await consumeRecipe(recipe.id, recipe.usage)
      await Taro.showToast({ title: '烹饪愉快！', icon: 'success', duration: 2000 })
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/fridge/index' })
      }, 1500)
    } catch {
      Taro.showToast({ title: '操作失败，请重试', icon: 'error' })
    } finally {
      setCooking(false)
    }
  }

  const isAvailable = (name: string): boolean => {
    return items.some(
      (i) => i.name.includes(name) || name.includes(i.name)
    )
  }

  const tagClass = (tag: string) => {
    switch (tag) {
      case '临期优先': return 'tag-expiring'
      case '快速上桌': return 'tag-quick'
      case '冷冻解压': return 'tag-frozen'
      default: return 'tag-custom'
    }
  }

  return (
    <View className='recipe-detail-page'>
      <View className='recipe-topbar'>
        <Text className='recipe-back' onClick={() => Taro.navigateBack()}>‹ 返回</Text>
        <Text className='recipe-topbar-title'>{recipe.title}</Text>
        <View className='recipe-topbar-spacer' />
      </View>

      <ScrollView scrollY className='recipe-scroll'>
        <View className='recipe-content with-bottom-action-bar'>
          <View className='recipe-tags'>
            {recipe.minutes != null && (
              <View className={`recipe-tag tag-time`}>
                <Text className='recipe-tag-text'>{recipe.minutes} 分钟</Text>
              </View>
            )}
            <View className={`recipe-tag ${tagClass(recipe.tag)}`}>
              <Text className='recipe-tag-text'>{recipe.tag}</Text>
            </View>
          </View>

          {recipe.summary && (
            <View className='recipe-section glass-card'>
              <Text className='recipe-section-title'>简介</Text>
              <Text className='recipe-summary-text'>{recipe.summary}</Text>
            </View>
          )}

          <View className='recipe-section glass-card'>
            <Text className='recipe-section-title'>食材用量</Text>
            {recipe.usage.map((u, idx) => {
              const avail = isAvailable(u.name)
              return (
                <View key={idx} className='ingredient-row'>
                  <View className={`ingredient-status ${avail ? 'is-ok' : 'is-miss'}`}>
                    <View className={`status-dot ${avail ? 'dot-ok' : 'dot-miss'}`} />
                  </View>
                  <Text className={`ingredient-name ${avail ? '' : 'name-miss'}`}>{u.name}</Text>
                  <Text className='ingredient-qty'>{u.qty}{u.unit}</Text>
                </View>
              )
            })}
            {recipe.condiments.length > 0 && (
              <View className='condiments-row'>
                <Text className='condiments-label'>调料：</Text>
                <Text className='condiments-list'>{recipe.condiments.join('、')}</Text>
              </View>
            )}
          </View>

          <View className='recipe-section glass-card'>
            <Text className='recipe-section-title'>烹饪步骤</Text>
            {recipe.steps.map((step, idx) => (
              <View key={idx} className='step-row'>
                <View className='step-number'>
                  <Text className='step-num'>{idx + 1}</Text>
                </View>
                <Text className='step-text'>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className='cook-bar'>
        <View
          className={`cook-btn ${cooking ? 'is-disabled' : ''}`}
          onClick={cooking ? undefined : handleConsume}
        >
          <Text className='cook-btn-text'>{cooking ? '处理中...' : '开始烹饪'}</Text>
        </View>
      </View>
    </View>
  )
}
