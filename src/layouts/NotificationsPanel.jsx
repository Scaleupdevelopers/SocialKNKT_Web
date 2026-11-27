import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getNotifications, getPostComment } from '../action/action'
import { usePagedList } from '../utils/usePagedList'
import { LoadingSkeleton, RequestState } from '../components/common/RequestState'
import { readAuth } from '../utils/helper'

export function notificationTarget(item) {
  if (item.connectionExists === false) return null
  if (item.type === 'connection')
    return (
      '/profile?userId=' +
      encodeURIComponent(item.connectionUser?._id || item.connectionUser?.id || '')
    )
  return contentTarget(item)
}

function contentTarget(item) {
  if (item.parentThreadId) return '/knkt?threadId=' + encodeURIComponent(item.parentThreadId)
  if (item.parentPostId) return '/home?postId=' + encodeURIComponent(item.parentPostId)
  if (item.type === 'comment-like') return null
  if (item.type?.toLowerCase().includes('thread'))
    return '/knkt?threadId=' + encodeURIComponent(item.entityId)
  return item.entityId ? '/home?postId=' + encodeURIComponent(item.entityId) : null
}
function notificationSubject(item) {
  if (item.type === 'comment-like') return ' your comment.'
  if (item.parentThreadId || item.type?.toLowerCase().includes('thread')) return ' your thread.'
  return ' your post.'
}
function notificationText(item) {
  const person = item.connectionUser || item.user1 || {}
  const name =
    [person.fname, person.lname].filter(Boolean).join(' ') || person.username || 'Someone'
  if (item.type === 'connection') return name + ' sent a connection request.'
  const action = item.type?.toLowerCase().includes('like') ? 'liked' : 'commented on'
  return name + (item.more > 0 ? ' and others ' : ' ') + action + notificationSubject(item)
}

function needsCommentLookup(item) {
  return item.type === 'comment-like' && !item.parentPostId && Boolean(item.entityId)
}

function commentTarget(comment) {
  if (!comment || comment.deletedAt || comment.isBlocked) return null
  if (typeof comment.postId !== 'string' || !/^[a-f\d]{24}$/i.test(comment.postId)) return null
  return '/home?postId=' + encodeURIComponent(comment.postId)
}

function NotificationRow({ item, onClose }) {
  const navigate = useNavigate()
  const [state, setState] = useState('idle')
  const busy = useRef(false)
  const active = useRef(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const target = notificationTarget(item)
  const lookup = needsCommentLookup(item)
  const unavailable =
    item.connectionExists === false || state === 'unavailable' || (!target && !lookup)
  const person = item.connectionUser || item.user1

  async function open() {
    if (busy.current) return
    if (target) {
      navigate(target)
      onClose()
      return
    }
    busy.current = true
    setState('loading')
    const token = readAuth()?.token
    const isCurrent = () => active.current && token === readAuth()?.token
    try {
      const response = await getPostComment(item.entityId)
      if (!isCurrent()) return
      const resolved = commentTarget(response.data)
      if (!resolved) {
        setState('unavailable')
        return
      }
      navigate(resolved)
      onClose()
    } catch {
      if (isCurrent()) setState('error')
    } finally {
      busy.current = false
    }
  }

  return (
    <>
      <button
        className="notification-item notification-link"
        disabled={unavailable || state === 'loading'}
        onClick={open}
      >
        <img src={person?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
        <span>
          {notificationText(item)}
          <NotificationFeedback state={state} unavailable={unavailable} />
        </span>
      </button>
      {state === 'loading' && <LoadingSkeleton label="Opening notification…" count={1} />}
    </>
  )
}

function NotificationFeedback({ state, unavailable }) {
  if (unavailable) return <small>Content is no longer available.</small>
  if (state === 'error')
    return <small role="alert">Unable to open notification. Select it to retry.</small>
  return null
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
          {list.items.map((item) => (
            <NotificationRow key={item._id || item.id} item={item} onClose={onClose} />
          ))}
        </div>
      </RequestState>
      {list.loading && list.items.length > 0 && (
        <LoadingSkeleton label="Loading more notifications…" count={2} />
      )}
      {list.hasMore && (
        <button className="panel-more" disabled={list.loading} onClick={list.loadMore}>
          Load more
        </button>
      )}
    </aside>
  )
}
