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
