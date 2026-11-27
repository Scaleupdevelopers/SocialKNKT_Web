import { useNavigate } from 'react-router-dom'
import { getNotifications } from '../action/action'
import { usePagedList } from '../utils/usePagedList'
import { RequestState } from '../components/common/RequestState'
import { readAuth } from '../utils/helper'

export function notificationTarget(item) {
  if (item.connectionExists === false) return null
  if (item.type === 'connection')
    return (
      '/profile?userId=' +
      encodeURIComponent(item.connectionUser?._id || item.connectionUser?.id || '')
    )
  if (item.parentThreadId) return '/knkt?threadId=' + encodeURIComponent(item.parentThreadId)
  if (item.parentPostId) return '/home?postId=' + encodeURIComponent(item.parentPostId)
  if (item.type?.toLowerCase().includes('thread'))
    return '/knkt?threadId=' + encodeURIComponent(item.entityId)
  return item.entityId ? '/home?postId=' + encodeURIComponent(item.entityId) : null
}
function notificationText(item) {
  const person = item.connectionUser || item.user1 || {}
  const name =
    [person.fname, person.lname].filter(Boolean).join(' ') || person.username || 'Someone'
  if (item.type === 'connection') return name + ' sent a connection request.'
  const action = item.type?.toLowerCase().includes('like') ? 'liked' : 'commented on'
  return (
    name +
    (item.more > 0 ? ' and others ' : ' ') +
    action +
    (item.parentThreadId ? ' your thread.' : ' your post.')
  )
}
const loadNotifications = async (page) => {
  const token = readAuth()?.token
  const response = await getNotifications(page)
  if (token === readAuth()?.token)
    window.dispatchEvent(new CustomEvent('notifications-read', { detail: { token } }))
  return response
}
export function NotificationsPanel({ onClose }) {
  const list = usePagedList(loadNotifications)
  const navigate = useNavigate()
  return (
    <aside className="header-panel notifications-panel" aria-label="Notifications">
      <div className="panel-heading">
        <h2>Notifications</h2>
        <button type="button" aria-label="Close notifications" onClick={onClose}>
          ×
        </button>
      </div>
      <RequestState
        loading={list.loading && !list.items.length}
        error={list.error}
        retry={list.loadMore}
        empty={!list.items.length && 'No notifications yet.'}
      >
        <div className="notification-list">
          {list.items.map((item) => {
            const target = notificationTarget(item)
            const person = item.connectionUser || item.user1
            return (
              <button
                className="notification-item notification-link"
                key={item._id || item.id}
                disabled={!target}
                onClick={() => {
                  navigate(target)
                  onClose()
                }}
              >
                <img src={person?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
                <span>
                  {notificationText(item)}
                  {!target && <small>Content is no longer available.</small>}
                </span>
              </button>
            )
          })}
        </div>
      </RequestState>
      {list.hasMore && (
        <button className="panel-more" disabled={list.loading} onClick={list.loadMore}>
          Load more
        </button>
      )}
    </aside>
  )
}
