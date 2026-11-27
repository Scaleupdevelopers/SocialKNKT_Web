import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { getProfileConnections, sendConnection } from '../../action/action'

import { connectionsChanged } from '../../utils/helper'
import { useProfile } from '../../context/ProfileContext'
import { usePagedList } from '../../utils/usePagedList'
import { ConnectionManager } from '../../components/modals/ConnectionManager'
import { AutoLoadMore, LoadingSkeleton } from '../../components/common/RequestState'
import './Connections.css'

const filters = [
  { value: null, label: 'All' },
  { value: 2, label: 'Personal' },
  { value: 1, label: 'Professional' },
]

function ConnectionRow({ connection, ownList, onManage }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const { userId, personalConnection, professionalConnection } = connection
  const name =
    [connection.fname, connection.lname].filter(Boolean).join(' ') || connection.username
  const addType = personalConnection ? 'professional' : 'personal'
  const hasBoth = personalConnection && professionalConnection

  async function add() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      await sendConnection(userId, addType)
      setSent(true)
      connectionsChanged()
    } catch {
      setError('Unable to send request. Please try again.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <article className="connection-row">
      <button
        className="connection-profile-trigger"
        type="button"
        onClick={() => navigate('/profile?userId=' + encodeURIComponent(userId))}
      >
        <img
          className="connection-avatar"
          src={connection.image || '/assets/logo_icons/profile_alt.avif'}
          alt=""
        />
        <div className="connection-info">
          <div className="connection-name-line">
            <strong>{name}</strong>
            <span>@{connection.username}</span>
          </div>
          <p>
            {connection.jobTitle || 'SocialKNKT member'} ·{' '}
            {connection.totalNoOfConnections ?? 0} Connections
          </p>
          {connection.cityName && (
            <small className="connection-location">
              <img src="/assets/logo_icons/location.svg" alt="" />
              {connection.cityName}
            </small>
          )}
        </div>
      </button>
      {ownList && (
        <div className="connection-row-actions">
          {!hasBoth && (
            <button
              className="connection-add"
              type="button"
              disabled={pending || sent}
              onClick={add}
            >
              {sent
                ? 'Request sent'
                : pending
                  ? 'Sending…'
                  : 'Add ' + addType[0].toUpperCase() + addType.slice(1)}
            </button>
          )}
          <button
            className="connection-remove"
            type="button"
            aria-label={'Manage connection with ' + name}
            onClick={onManage}
          >
            ×
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </article>
  )
}

function ConnectionList({ userId, ownList, query, filter }) {
  const [selected, setSelected] = useState(null)
  const loadPage = useCallback(
    (page) => getProfileConnections(page, filter, query, 10, userId),
    [userId, filter, query],
  )
  const list = usePagedList(loadPage)
  return (
    <>
      <section className="connections-list">
        {list.items.map((connection) => (
          <ConnectionRow
            key={connection.userId}
            connection={connection}
            ownList={ownList}
            onManage={() => setSelected(connection)}
          />
        ))}
        {list.loading && <LoadingSkeleton label="Loading connections…" />}
        {list.error && (
          <div role="alert">
            <p>{list.error}</p>
            <button type="button" onClick={list.loadMore}>
              Try again
            </button>
          </div>
        )}
        {!list.loading && !list.error && !list.items.length && (
          <div className="connections-empty">
            <strong>No Connection</strong>
            <span>No connections match this search.</span>
          </div>
        )}
        <AutoLoadMore
          hasMore={list.hasMore}
          loading={list.loading}
          error={list.error}
          onLoadMore={list.loadMore}
          label="Connections pagination"
        />
      </section>
      {selected && (
        <ConnectionManager
          userId={selected.userId}
          onClose={() => setSelected(null)}
          onChanged={list.reload}
        />
      )}
    </>
  )
}

export function Connections() {
  const { profile } = useProfile()
  const [params] = useSearchParams()
  const currentId = profile?.id || profile?._id
  const userId = params.get('userId') || currentId
  const ownList = !!currentId && String(userId) === String(currentId)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filter, setFilter] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="connections-page">
      <Header />
      <main className="connections-content">
        <div className="connections-search">
          <img src="/assets/logo_icons/search.svg" alt="" />
          <input
            aria-label="Search connections"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
          />
        </div>
        <div className="connections-heading">
          <h1>Connections</h1>
          <div className="connections-filter-wrap">
            <button
              className="connections-filter-button"
              type="button"
              aria-label="Filter connections"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <img src="/assets/logo_icons/solar_sort-linear.svg" alt="" />
            </button>
            {filterOpen && (
              <div className="connections-filter-menu">
                {filters.map((option) => (
                  <button
                    key={option.label}
                    className={filter === option.value ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setFilter(option.value)
                      setFilterOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {userId ? (
          <ConnectionList
            key={userId + ':' + debounced + ':' + filter}
            userId={userId}
            ownList={ownList}
            query={debounced}
            filter={filter}
          />
        ) : (
          <LoadingSkeleton label="Loading profile…" />
        )}
      </main>
    </div>
  )
}
