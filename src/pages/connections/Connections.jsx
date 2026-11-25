import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { getProfileConnections } from '../../action/action'
import { useProfile } from '../../context/ProfileContext'
import './Connections.css'

const PAGE_SIZE = 10
const FALLBACK_IMAGE = '/assets/logo_icons/profile_alt.avif'
const filters = [{ key: 'all', value: null, label: 'All' }, { key: 'personal', value: 2, label: 'Personal' }, { key: 'professional', value: 3, label: 'Professional' }]

function getCtaType(connection) {
  if (connection.personalConnection) return 'Professional'
  if (connection.professionalConnection) return 'Personal'
  return Number(connection.status) === 2 ? 'Professional' : 'Personal'
}

function ConnectionRow({ connection, isAdded, onAdd, onRemove }) {
  const navigate = useNavigate()
  const addType = getCtaType(connection)
  const userId = connection.userId || connection.id || connection._id || connection.connectionId
  const name = `${connection.fname || ''} ${connection.lname || ''}`.trim() || connection.username || 'Unknown user'
  const location = [connection.cityName || connection.city, connection.countryName || connection.country].filter(Boolean).join(', ')
  const openProfile = () => {
    if (userId) navigate(`/profile?userId=${encodeURIComponent(userId)}`)
  }
  return <article className="connection-row">
    <button className="connection-profile-trigger" type="button" onClick={openProfile} disabled={!userId} aria-label={`Open ${name}'s profile`}>
      <img className="connection-avatar" src={connection.image || FALLBACK_IMAGE} alt="" />
      <div className="connection-info"><div className="connection-name-line"><strong>{name}</strong><span>@{connection.username || connection.userName}</span></div><p>{connection.jobTitle || 'SocialKNKT member'} <b>•</b> {connection.totalNoOfConnections ?? connection.totalConnections ?? 0} Connections</p>{location && <small className="connection-location"><img src="/assets/logo_icons/location.svg" alt="" />{location}</small>}</div>
    </button>
    <button className={`connection-add ${isAdded ? 'added' : ''}`} type="button" onClick={onAdd}>{isAdded ? `Added ${addType}` : `Add ${addType}`}</button>
    <button className="connection-remove" type="button" aria-label={`Remove ${name}`} onClick={onRemove}>×</button>
  </article>
}

function ConnectionSkeleton() {
  return <article className="connection-row connection-row-skeleton" aria-label="Loading connection">
    <span className="connection-skeleton-avatar" />
    <div className="connection-skeleton-info"><span /><span /><span /></div>
    <span className="connection-skeleton-button" />
  </article>
}

export function Connections() {
  const { profile } = useProfile()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId') || profile?.id || profile?._id || profile?.userId
  const [connections, setConnections] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(filters[0])
  const [filterOpen, setFilterOpen] = useState(false)
  const [added, setAdded] = useState({})
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const endRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await getProfileConnections(0, filter.value, query.trim(), PAGE_SIZE, userId)
        const next = response.data || []
        if (active) { setConnections(next); setPage(0); setHasMore(next.length >= PAGE_SIZE) }
      } catch { if (active) { setConnections([]); setHasMore(false) } } finally { if (active) setLoading(false) }
    }, query ? 300 : 0)
    return () => { active = false; clearTimeout(timer) }
  }, [filter.value, query, userId])

  useEffect(() => {
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loading || !hasMore) return
      setLoading(true)
      try {
        const nextPage = page + 1
        const response = await getProfileConnections(nextPage, filter.value, query.trim(), PAGE_SIZE, userId)
        const next = response.data || []
        setConnections((current) => [...current, ...next]); setPage(nextPage); setHasMore(next.length >= PAGE_SIZE)
      } finally { setLoading(false) }
    }, { rootMargin: '240px' })
    if (endRef.current) observer.observe(endRef.current)
    return () => observer.disconnect()
  }, [filter.value, hasMore, loading, page, query, userId])

  return <div className="connections-page"><Header /><main className="connections-content">
    <div className="connections-search"><img src="/assets/logo_icons/search.svg" alt="" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" /></div>
    <div className="connections-heading"><h1>{connections.length} Connections</h1><div className="connections-filter-wrap"><button className="connections-filter-button" type="button" aria-label="Filter connections" onClick={() => setFilterOpen((open) => !open)}><img src="/assets/logo_icons/solar_sort-linear.svg" alt="" /></button>{filterOpen && <div className="connections-filter-menu">{filters.map((option) => <button key={option.key} type="button" className={filter.key === option.key ? 'active' : ''} onClick={() => { setFilter(option); setFilterOpen(false) }}>{option.label}</button>)}</div>}</div></div>
    <section className={`connections-list ${!loading && !connections.length ? 'connections-list-empty' : ''}`}>{loading && Array.from({ length: 4 }, (_, index) => <ConnectionSkeleton key={index} />)}{!loading && connections.map((connection) => { const id = connection.connectionId || connection.userId; return <ConnectionRow key={id} connection={connection} isAdded={added[id]} onAdd={() => setAdded((current) => ({ ...current, [id]: !current[id] }))} onRemove={() => setConnections((items) => items.filter((item) => (item.connectionId || item.userId) !== id))} /> })}{!loading && !connections.length && <div className="connections-empty"><strong>No Connection</strong><span>You don't have any connection yet</span></div>}<div ref={endRef} className="feed-end-marker" aria-hidden="true" /></section>
  </main></div>
}
