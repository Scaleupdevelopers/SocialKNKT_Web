import { useMemo, useState } from 'react'

import { Header } from '../../layouts/Header'
import './Connections.css'

const initialConnections = [
  { id: 1, name: 'Steve Jobs', username: 'stevejobs', role: 'UI UX Designer', location: 'San Francisco, California', type: 'professional', avatar: '/assets/logo_icons/profile_avatar.png' },
  { id: 2, name: 'Ryan Rolansky', username: 'ryanrolansky', role: 'Product Designer', location: 'San Francisco, California', type: 'professional', avatar: '/assets/logo_icons/profile_alt.avif' },
  { id: 3, name: 'Dylan Field', username: 'dylanfield', role: 'CEO Apex Industries', location: 'New York, United States', type: 'professional', avatar: '/assets/logo_icons/profile_avatar.png' },
  { id: 4, name: 'Aman Yadav', username: 'amanyadav10', role: 'Full-stack software engineer', location: 'New Delhi, India', type: 'personal', avatar: '/assets/logo_icons/profile_alt.avif' },
]

function ConnectionRow({ connection, isAdded, onAdd, onRemove }) {
  const connectionType = connection.type === 'personal' ? 'Personal' : 'Professional'

  return (
    <article className="connection-row">
      <img className="connection-avatar" src={connection.avatar} alt="" />
      <div className="connection-info">
        <div className="connection-name-line">
          <strong>{connection.name}</strong>
          <span>@{connection.username}</span>
        </div>
        <p>{connection.role} <b>•</b> 495 Connections</p>
        <small className="connection-location">
          <img src="/assets/logo_icons/location.svg" alt="" />
          {connection.location}
        </small>
      </div>
      <button className={`connection-add ${isAdded ? 'added' : ''}`} type="button" onClick={onAdd}>
        {isAdded ? `Added ${connectionType}` : `Add ${connectionType}`}
      </button>
      <button className="connection-remove" type="button" aria-label={`Remove ${connection.name}`} onClick={onRemove}>×</button>
    </article>
  )
}

export function Connections() {
  const [connections, setConnections] = useState(initialConnections)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [added, setAdded] = useState({})

  const filteredConnections = useMemo(() => connections.filter((connection) => {
    const matchesFilter = filter === 'all' || connection.type === filter
    const text = `${connection.name} ${connection.username} ${connection.role} ${connection.location}`.toLowerCase()
    return matchesFilter && text.includes(query.toLowerCase())
  }), [connections, filter, query])

  return (
    <div className="connections-page">
      <Header />
      <main className="connections-content">
        <div className="connections-search">
          <img src="/assets/logo_icons/search.svg" alt="" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
        </div>

        <div className="connections-heading">
          <h1>{filteredConnections.length} Connections</h1>
          <div className="connections-filter-wrap">
            <button className="connections-filter-button" type="button" aria-label="Filter connections" onClick={() => setFilterOpen((open) => !open)}>
              <img src="/assets/logo_icons/filter_line.svg" alt="" />
            </button>
            {filterOpen && (
              <div className="connections-filter-menu">
                {['all', 'personal', 'professional'].map((option) => (
                  <button key={option} type="button" className={filter === option ? 'active' : ''} onClick={() => { setFilter(option); setFilterOpen(false) }}>
                    {option[0].toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <section className="connections-list">
          {filteredConnections.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              isAdded={added[connection.id]}
              onAdd={() => setAdded((current) => ({ ...current, [connection.id]: !current[connection.id] }))}
              onRemove={() => setConnections((items) => items.filter((item) => item.id !== connection.id))}
            />
          ))}
          {!filteredConnections.length && <p className="connections-empty">No connections found.</p>}
        </section>
      </main>
    </div>
  )
}
