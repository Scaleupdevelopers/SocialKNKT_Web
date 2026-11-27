import { mergeResults } from '../../utils/helper'

export const itemId = (item) => String(item?.id || item?._id || '')
export const userName = (user) =>
  `${user?.fname || ''} ${user?.lname || ''}`.trim() || user?.username || 'Member'
export function mergeItems(current, incoming) {
  return mergeResults(current.filter(itemId), incoming.filter(itemId), itemId)
}
export const mergeMessages = (current, incoming) =>
  mergeItems(current, incoming).sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
export function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
