export const shouldAutoScrollDiscover = ({
  hasHydrated,
  chatMessagesLength,
  chatLoading,
}: {
  hasHydrated: boolean
  chatMessagesLength: number
  chatLoading: boolean
}) => {
  if (!hasHydrated) return false
  return chatMessagesLength > 0 || chatLoading
}
