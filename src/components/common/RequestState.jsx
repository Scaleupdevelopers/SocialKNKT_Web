export function RequestState({ loading, error, retry, empty, children }) {
  if (loading) return <p role="status">Loading…</p>
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
