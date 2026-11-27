import { useEffect, useRef } from 'react'

function scrollContainer(element) {
  let parent = element.parentElement
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const scrolls = /(auto|scroll)/.test(window.getComputedStyle(parent).overflowY)
    if (scrolls && parent.scrollHeight > parent.clientHeight) return parent
    parent = parent.parentElement
  }
  return null
}

export function AutoLoadMore({ hasMore, loading, error, onLoadMore, label = 'list' }) {
  const sentinel = useRef(null)
  useEffect(() => {
    if (!hasMore || loading || error || !sentinel.current) return
    let active = true
    let requested = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!active || requested || !entry.isIntersecting) return
        requested = true
        onLoadMore()
      },
      { root: scrollContainer(sentinel.current), rootMargin: '160px 0px' },
    )
    observer.observe(sentinel.current)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [hasMore, loading, error, onLoadMore])

  if (!hasMore || error) return null
  return (
    <div
      ref={sentinel}
      data-pagination-sentinel={label}
      aria-hidden="true"
      style={{ height: 1, flexShrink: 0 }}
    />
  )
}

export function RequestState({ loading, error, retry, empty, children }) {
  if (loading) return <LoadingSkeleton />
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button type="button" onClick={retry}>
          Try again
        </button>
      </div>
    )
  if (empty) return <p role="status">{empty}</p>
  return children
}

export function LoadingSkeleton({ label = 'Loading…', variant = 'rows', count = 3 }) {
  return (
    <div
      className={`loading-skeleton loading-skeleton-${variant}`}
      role="status"
      aria-label={label}
    >
      <span className="loading-skeleton-label">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div className="loading-skeleton-item" aria-hidden="true" key={index}>
          <span className="loading-skeleton-avatar" />
          <div className="loading-skeleton-lines">
            <span />
            <span />
          </div>
          {variant === 'card' && <span className="loading-skeleton-image" />}
        </div>
      ))}
    </div>
  )
}
