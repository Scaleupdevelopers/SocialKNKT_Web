import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
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

function ConnectionRow({ connection, ownList, onManage, request = {}, onSend }) {
  const navigate = useNavigate()
  const { userId, personalConnection, professionalConnection } = connection
  const name =
    [connection.fname, connection.lname].filter(Boolean).join(' ') || connection.username
  const addType = missingConnectionType(personalConnection, professionalConnection)
  const pending = request.status === 'pending'
  const sent = request.status === 'sent'

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
            {connection.username && <span>@{connection.username}</span>}
          </div>
          <ConnectionDetails connection={connection} />
        </div>
      </button>
      {ownList && (
        <div className="connection-row-actions">
          {addType && (
            <button
              className="connection-add"
              type="button"
              disabled={pending || sent}
              onClick={() => onSend(userId, addType)}
            >
              {connectionActionLabel(request.status, addType)}
            </button>
          )}
          <button
            className="connection-remove"
            type="button"
            disabled={pending}
            aria-label={'Manage connection with ' + name}
            onClick={onManage}
          >
            ×
          </button>
        </div>
      )}
    </article>
  )
}

function connectionActionLabel(status, type) {
  if (status === 'sent') return 'Request sent'
  if (status === 'pending') return 'Sending…'
  return 'Add ' + type[0].toUpperCase() + type.slice(1)
}

function useConnectionRequests() {
  const [items, setItems] = useState({})
  const locked = useRef(new Set())
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  async function send(userId, type) {
    if (locked.current.has(userId)) return
    locked.current.add(userId)
    setItems((current) => ({ ...current, [userId]: { status: 'pending' } }))
    try {
      await sendConnection(userId, type)
      if (!active.current) return
      setItems((current) => ({ ...current, [userId]: { status: 'sent' } }))
      connectionsChanged()
    } catch (error) {
      if (!active.current) return
      toast.error(error?.message || 'Unable to send request. Please try again.', {
        position: 'bottom-center',
      })
      locked.current.delete(userId)
      setItems((current) => ({
        ...current,
        [userId]: {
          status: 'error',
        },
      }))
    }
  }
  function clear(userId) {
    locked.current.delete(userId)
    setItems((current) => ({ ...current, [userId]: {} }))
  }
  return { items, send, clear }
}

function missingConnectionType(personal, professional) {
  if (personal === false) return 'personal'
  if (professional === false) return 'professional'
  return null
}

function ConnectionDetails({ connection }) {
  const count = connection.totalNoOfConnections
  const details = [
    connection.jobTitle,
    Number.isFinite(count) ? `${count} Connections` : null,
  ].filter(Boolean)
  const location = [connection.cityName, connection.countryName].filter(Boolean).join(', ')
  return (
    <>
      {details.length > 0 && <p>{details.join(' • ')}</p>}
      {location && (
        <small className="connection-location">
          <img src="/assets/logo_icons/location.svg" alt="" />
          {location}
        </small>
      )}
    </>
  )
}

function ConnectionList({ userId, ownList, query, filter, requests, onSend, onChanged }) {
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
            request={requests[connection.userId]}
            onSend={onSend}
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
          onChanged={() => {
            onChanged(selected.userId)
            list.reload()
          }}
        />
      )}
    </>
  )
}

export function Connections() {
  const { profile, authToken } = useProfile()
  return (
    <ConnectionsView
      key={authToken || profile?.id || profile?._id || 'anonymous'}
      profile={profile}
    />
  )
}

function ConnectionsView({ profile }) {
  const [params] = useSearchParams()
  const currentId = profile?.id || profile?._id
  const userId = params.get('userId') || currentId
  const ownList = !!currentId && String(userId) === String(currentId)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filter, setFilter] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const requests = useConnectionRequests()
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(query.trim())
      if (query.trim()) setFilter(null)
    }, 300)
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
            onChange={(event) => {
              setQuery(event.target.value)
              setFilterOpen(false)
            }}
            placeholder="Search users"
          />
        </div>
        <div className="connections-heading">
          <h1>Connections</h1>
          {!query.trim() && (
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
          )}
        </div>
        {userId ? (
          <ConnectionList
            key={userId + ':' + debounced + ':' + filter}
            userId={userId}
            ownList={ownList}
            query={debounced}
            filter={filter}
            requests={requests.items}
            onSend={requests.send}
            onChanged={requests.clear}
          />
        ) : (
          <LoadingSkeleton label="Loading profile…" />
        )}
      </main>
    </div>
  )
}
