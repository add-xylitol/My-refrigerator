import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useFridgeStore } from '../../stores/fridgeStore'
import type { RecipeSuggestion } from '../../services/api'
import { shouldAutoScrollDiscover } from './scroll'
import { buildDiscoverViewModel } from './view-model'
import './index.scss'

export default function DiscoverPage() {
  const { items, condiments, recipes, chatMessages, chatLoading, sendChatMessage } = useFridgeStore()
  const [inputValue, setInputValue] = useState('')
  const [scrollInto, setScrollInto] = useState('')
  const hasHydratedRef = useRef(false)

  const suggestedRecipes = useMemo(
    () =>
      chatMessages.reduce<RecipeSuggestion[]>((all, message) => {
        if (!message.recipes || message.recipes.length === 0) return all
        return all.concat(message.recipes)
      }, []),
    [chatMessages],
  )

  const recipeLookup = useMemo(() => {
    const map = new Map<string, RecipeSuggestion>()
    recipes.forEach((recipe) => {
      map.set(recipe.id, recipe)
    })
    suggestedRecipes.forEach((recipe) => {
      map.set(recipe.id, recipe)
    })
    return map
  }, [recipes, suggestedRecipes])

  const viewModel = useMemo(
    () =>
      buildDiscoverViewModel({
        items,
        condiments,
        recipes,
        chatMessages,
      }),
    [items, condiments, recipes, chatMessages],
  )

  useEffect(() => {
    const shouldScroll = shouldAutoScrollDiscover({
      hasHydrated: hasHydratedRef.current,
      chatMessagesLength: chatMessages.length,
      chatLoading,
    })

    hasHydratedRef.current = true
    if (!shouldScroll) return

    setScrollInto('')
    const frame = requestAnimationFrame(() => {
      setScrollInto('discover-bottom-anchor')
    })

    return () => cancelAnimationFrame(frame)
  }, [chatMessages.length, chatLoading])

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || chatLoading) return
    setInputValue('')
    await sendChatMessage(text)
  }

  const handleDecisionAction = async (prompt: string) => {
    if (chatLoading) return
    setInputValue('')
    await sendChatMessage(prompt)
  }

  const handleRecipeTap = (recipeId: string) => {
    const recipe = recipeLookup.get(recipeId)
    if (!recipe) return
    Taro.navigateTo({ url: `/pages/discover/recipe?id=${recipe.id}` })
  }

  const handleConfirm = async (e: any) => {
    const value = typeof e === 'object' && e.detail?.value !== undefined ? e.detail.value : inputValue
    const text = value?.trim()
    if (!text || chatLoading) return
    setInputValue('')
    await sendChatMessage(text)
  }

  return (
    <View className='discover-page'>
      <ScrollView
        scrollY
        className='discover-scroll'
        scrollIntoView={scrollInto}
        scrollWithAnimation
      >
        <View className='discover-content'>
          <View className='discover-hero glass-card'>
            <Text className='discover-eyebrow'>{viewModel.introEyebrow}</Text>
            <Text className='discover-title'>{viewModel.introTitle}</Text>
            <Text className='discover-description'>{viewModel.introDescription}</Text>
          </View>

          <View className='section-block'>
            <View className='section-head'>
              <Text className='section-title'>先做决定</Text>
              <Text className='section-subtitle'>把最常见的选择放到聊天前面</Text>
            </View>
            <View className='decision-row'>
              {viewModel.decisionActions.map((action) => (
                <View
                  key={action}
                  className='decision-chip'
                  onClick={() => {
                    void handleDecisionAction(action)
                  }}
                >
                  <Text className='decision-chip-label'>{action}</Text>
                  <Text className='decision-chip-note'>立即生成建议</Text>
                </View>
              ))}
            </View>
          </View>

          {viewModel.featuredRecipes.length > 0 && (
            <View className='section-block'>
              <View className='section-head'>
                <Text className='section-title'>现在更适合做</Text>
                <Text className='section-subtitle'>优先显示最省脑力的一批选择</Text>
              </View>
              <View className='recipe-stack'>
                {viewModel.featuredRecipes.map((recipe) => (
                  <View
                    key={recipe.id}
                    className='discover-recipe-card glass-card'
                    onClick={() => handleRecipeTap(recipe.id)}
                  >
                    <View className='discover-recipe-top'>
                      <View className='discover-recipe-copy'>
                        <Text className='discover-recipe-reason'>{recipe.reasonToCookNow}</Text>
                        <Text className='discover-recipe-title'>{recipe.title}</Text>
                        {recipe.summary && (
                          <Text className='discover-recipe-summary'>{recipe.summary}</Text>
                        )}
                      </View>
                      <View className='discover-recipe-side'>
                        {recipe.minutes != null && (
                          <Text className='discover-recipe-time'>{recipe.minutes} 分钟</Text>
                        )}
                        <Text
                          className={`discover-recipe-availability ${recipe.availabilityStatus === 'ok' ? 'is-ok' : 'is-miss'}`}
                        >
                          {recipe.availabilityLabel}
                        </Text>
                      </View>
                    </View>
                    <Text className='discover-recipe-cta'>查看做法</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className='section-block'>
            <View className='section-head'>
              <Text className='section-title'>继续细化</Text>
              <Text className='section-subtitle'>把口味、时间和库存约束告诉我</Text>
            </View>

            <View className='chat-stream'>
              {viewModel.hasEmptyChatState && !chatLoading && (
                <View className='discover-empty glass-card'>
                  <Text className='discover-empty-eyebrow'>第一次打开也能直接开始</Text>
                  <Text className='discover-empty-title'>先点一个方向，再进入对话。</Text>
                  <Text className='discover-empty-description'>
                    你不需要先组织完整问题，先选一种决策方式，我会顺着你的库存继续收窄答案。
                  </Text>
                  <View className='discover-empty-actions'>
                    {viewModel.decisionActions.map((action) => (
                      <View
                        key={`empty-${action}`}
                        className='discover-empty-chip'
                        onClick={() => {
                          void handleDecisionAction(action)
                        }}
                      >
                        <Text className='discover-empty-chip-text'>{action}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {chatMessages.map((message, index) => (
                <View
                  key={`${message.role}-${index}`}
                  className={`chat-row ${message.role === 'user' ? 'row-user' : 'row-ai'}`}
                >
                  {message.role === 'assistant' && (
                    <View className='chat-avatar'>
                      <Text className='chat-avatar-text'>AI</Text>
                    </View>
                  )}
                  <View className={`chat-bubble ${message.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                    <Text className='bubble-text'>{message.content}</Text>

                    {message.recipes && message.recipes.length > 0 && (
                      <View className='inline-recipes'>
                        {message.recipes.map((recipe) => (
                          <View
                            key={recipe.id}
                            className='inline-recipe-card'
                            onClick={() => handleRecipeTap(recipe.id)}
                          >
                            <Text className='inline-recipe-title'>{recipe.title}</Text>
                            {recipe.summary && (
                              <Text className='inline-recipe-summary'>{recipe.summary}</Text>
                            )}
                            <View className='inline-recipe-meta'>
                              {recipe.minutes != null && (
                                <Text className='inline-recipe-time'>{recipe.minutes} 分钟</Text>
                              )}
                              <Text
                                className={`inline-recipe-avail ${recipe.all_available ? 'ok' : 'miss'}`}
                              >
                                {recipe.all_available ? '食材齐全' : `缺 ${recipe.missing_ingredients.length} 样`}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}

              {chatLoading && (
                <View className='chat-row row-ai'>
                  <View className='chat-avatar'>
                    <Text className='chat-avatar-text'>AI</Text>
                  </View>
                  <View className='chat-bubble bubble-ai'>
                    <View className='typing-dots'>
                      <View className='typing-dot' />
                      <View className='typing-dot' />
                      <View className='typing-dot' />
                    </View>
                  </View>
                </View>
              )}

              <View id='discover-bottom-anchor' className='discover-anchor' />
            </View>
          </View>
        </View>
      </ScrollView>

      <View className='discover-input-wrap'>
        <View className='discover-input-bar glass-card'>
          <Input
            className='discover-input'
            type='text'
            placeholder='说下你今天想吃得多快、多清淡，或者想先消耗什么'
            placeholderStyle='color: rgba(148, 163, 184, 0.72)'
            value={inputValue}
            onInput={(e) => setInputValue(e.detail.value)}
            confirmType='send'
            onConfirm={handleConfirm}
            disabled={chatLoading}
          />
          <View
            className={`discover-send-btn ${!inputValue.trim() || chatLoading ? 'send-disabled' : ''}`}
            onClick={() => {
              void handleSend()
            }}
          >
            <Text className='discover-send-text'>发送</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
