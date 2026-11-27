import { useRef, useState } from 'react'
import { answerConnection, getConnectionRequests } from '../action/action'
import { connectionsChanged } from '../utils/helper'
import { usePagedList } from '../utils/usePagedList'
import { useProfile } from '../context/ProfileContext'
import { AutoLoadMore, LoadingSkeleton, RequestState } from '../components/common/RequestState'

function RequestRow({ request, onAnswered }) {
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  async function answer(status) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      await answerConnection(request._id || request.id, status)
      onAnswered()
      connectionsChanged()
    } catch {
      setError('Unable to update request. Please try again.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  const name = [request.fname, request.lname].filter(Boolean).join(' ') || request.username
  return (
    <div className="connection-request">
      <img src={request.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
      <div className="connection-request-content">
        <p>{name} sent a connection request</p>
        <div className="connection-request-actions">
          <button
            className="accept-button"
            disabled={pending}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            Accept
            <img src="/assets/logo_icons/dropdownHeader.svg" alt="" />
          </button>
          <button className="decline-button" disabled={pending} onClick={() => answer(4)}>
            Decline
          </button>
        </div>
        {expanded && (
          <div className="connection-type-menu">
            {[
              ['Personal', 2],
              ['Professional', 1],
              ['Both', 3],
            ].map(([label, status]) => (
              <button
                key={status}
                type="button"
                disabled={pending}
                onClick={() => answer(status)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {pending && <p role="status">Updating…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  )
}

export function ConnectionRequestsPanel({ onClose }) {
  const list = usePagedList(getConnectionRequests)
  const { refreshProfile } = useProfile()
  function answered() {
    list.reload()
    refreshProfile()
  }
  return (
    <aside className="header-panel connections-panel" aria-label="Connection requests">
      <div className="panel-heading">
        <h2>Connection Requests</h2>
        <button type="button" aria-label="Close connection requests" onClick={onClose}>
          ×
        </button>
      </div>
      <RequestState
        loading={list.loading && !list.items.length}
        error={list.error}
        retry={list.loadMore}
        empty={!list.items.length && 'No pending requests.'}
      >
        {list.items.map((item) => (
          <RequestRow
            key={item._id || item.id}
            request={item}
            onAnswered={() => answered(item._id || item.id)}
          />
        ))}
      </RequestState>
      {list.loading && list.items.length > 0 && (
        <LoadingSkeleton label="Loading requests…" count={2} />
      )}
      <AutoLoadMore
        hasMore={list.hasMore}
        loading={list.loading}
        error={list.error}
        onLoadMore={list.loadMore}
        label="Connection requests pagination"
      />
    </aside>
  )
}
