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

  const recipeLookup = useMemo(() => {
    const map = new Map<string, RecipeSuggestion>()
    const allMessages = chatMessages.reduce<RecipeSuggestion[]>((acc, m) =>
      m.recipes ? acc.concat(m.recipes) : acc, [])
    ;[...recipes, ...allMessages].forEach((r) => map.set(r.id, r))
    return map
  }, [recipes, chatMessages])

  const viewModel = useMemo(
    () => buildDiscoverViewModel({ items, condiments, recipes, chatMessages }),
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
    const frame = requestAnimationFrame(() => setScrollInto('discover-bottom-anchor'))
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
    if (!recipeLookup.get(recipeId)) return
    Taro.navigateTo({ url: `/pages/discover/recipe?id=${recipeId}` })
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
      <ScrollView scrollY className='discover-scroll' scrollIntoView={scrollInto} scrollWithAnimation>
        <View className='discover-content'>

          {/* Quick actions */}
          <View className='quick-actions'>
            {viewModel.decisionActions.map((action) => (
              <View
                key={action}
                className='action-chip glass-card'
                onClick={() => void handleDecisionAction(action)}
              >
                <Text className='action-chip-text'>{action}</Text>
              </View>
            ))}
          </View>

          {/* Can make now */}
          {viewModel.canMakeNow.length > 0 && (
            <View className='recipe-section'>
              <View className='recipe-section-head'>
                <Text className='recipe-section-title'>可以直接做</Text>
                <Text className='recipe-section-count'>{viewModel.canMakeNow.length}</Text>
              </View>
              <View className='recipe-grid'>
                {viewModel.canMakeNow.map((recipe) => (
                  <View
                    key={recipe.id}
                    className='recipe-item glass-card'
                    onClick={() => handleRecipeTap(recipe.id)}
                  >
                    <Text className='recipe-item-name'>{recipe.title}</Text>
                    {recipe.minutes != null && (
                      <Text className='recipe-item-time'>{recipe.minutes}min</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Almost ready */}
          {viewModel.almostReady.length > 0 && (
            <View className='recipe-section'>
              <View className='recipe-section-head'>
                <Text className='recipe-section-title'>差一两样就能做</Text>
                <Text className='recipe-section-count'>{viewModel.almostReady.length}</Text>
              </View>
              <View className='recipe-grid'>
                {viewModel.almostReady.map((recipe) => (
                  <View
                    key={recipe.id}
                    className='recipe-item glass-card'
                    onClick={() => handleRecipeTap(recipe.id)}
                  >
                    <Text className='recipe-item-name'>{recipe.title}</Text>
                    <Text className='recipe-item-miss'>缺 {recipe.missingLabel}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Chat */}
          <View className='chat-section'>
            {viewModel.hasEmptyChatState && !chatLoading && viewModel.canMakeNow.length === 0 && (
              <View className='chat-empty glass-card'>
                <Text className='chat-empty-title'>问我想吃什么</Text>
                <Text className='chat-empty-hint'>{viewModel.stockSummary}</Text>
              </View>
            )}

            {chatMessages.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                className={`chat-row ${message.role === 'user' ? 'row-user' : 'row-ai'}`}
              >
                {message.role === 'assistant' && (
                  <View className='chat-avatar'><Text className='chat-avatar-text'>AI</Text></View>
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
                          <View className='inline-recipe-meta'>
                            {recipe.minutes != null && (
                              <Text className='inline-recipe-time'>{recipe.minutes}min</Text>
                            )}
                            <Text className={`inline-recipe-avail ${recipe.all_available ? 'ok' : 'miss'}`}>
                              {recipe.all_available ? '齐全' : `缺${recipe.missing_ingredients.length}样`}
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
                <View className='chat-avatar'><Text className='chat-avatar-text'>AI</Text></View>
                <View className='chat-bubble bubble-ai'>
                  <View className='typing-dots'>
                    <View className='typing-dot' /><View className='typing-dot' /><View className='typing-dot' />
                  </View>
                </View>
              </View>
            )}

            <View id='discover-bottom-anchor' className='discover-anchor' />
          </View>
        </View>
      </ScrollView>

      <View className='discover-input-wrap'>
        <View className='discover-input-bar glass-card'>
          <Input
            className='discover-input'
            type='text'
            placeholder='想吃什么或想消耗什么'
            placeholderStyle='color: rgba(148, 163, 184, 0.72)'
            value={inputValue}
            onInput={(e) => setInputValue(e.detail.value)}
            confirmType='send'
            onConfirm={handleConfirm}
            disabled={chatLoading}
          />
          <View
            className={`discover-send-btn ${!inputValue.trim() || chatLoading ? 'send-disabled' : ''}`}
            onClick={() => void handleSend()}
          >
            <Text className='discover-send-text'>发送</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
