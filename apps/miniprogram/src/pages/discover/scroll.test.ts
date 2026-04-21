import { describe, expect, it } from 'vitest'
import { shouldAutoScrollDiscover } from './scroll'

describe('shouldAutoScrollDiscover', () => {
  it('does not auto-scroll on the first paint of the decision page', () => {
    expect(
      shouldAutoScrollDiscover({
        hasHydrated: false,
        chatMessagesLength: 0,
        chatLoading: false,
      }),
    ).toBe(false)
  })

  it('auto-scrolls after chat activity changes', () => {
    expect(
      shouldAutoScrollDiscover({
        hasHydrated: true,
        chatMessagesLength: 1,
        chatLoading: false,
      }),
    ).toBe(true)
  })
})
