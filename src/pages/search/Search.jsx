import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { PostCard } from '../home/components/PostCard'
import { ConnectionManager } from '../../components/modals/ConnectionManager'
import { searchContent, SEARCH_PAGE_SIZE } from '../../action/action'
import { entityId, mergeResults } from '../../utils/helper'
import { LoadingSkeleton } from '../../components/common/RequestState'
import '../home/Home.css'
import './Search.css'

const categories = {
  all: 'All',
  people: 'People',
  posts: 'Posts',
  media: 'Media',
  threads: 'Threads',
}

export function Search() {
  const [params, setParams] = useSearchParams()
  const query = (params.get('q') || '').trim()
  const category = Object.hasOwn(categories, params.get('type')) ? params.get('type') : 'all'
  const select = (type) => setParams({ q: query, type })
  return (
    <main className="search-page">
      <Header />
      <div className={`search-layout ${category === 'all' ? 'search-layout-all' : ''}`}>
        {category === 'all' && (
          <aside className="search-sidebar">
            <h2>Search results for {query}</h2>
            {Object.entries(categories)
              .filter(([key]) => key !== 'all')
              .map(([key, label]) => (
                <button key={key} onClick={() => select(key)}>
                  {label}
                </button>
              ))}
          </aside>
        )}
        <section className="search-main" aria-label="Search results">
          <SearchQueryForm
            key={query}
            query={query}
            onSubmit={(q) => setParams({ q, type: category })}
          />
          <nav className="search-tabs" aria-label="Result categories">
            {Object.entries(categories).map(([key, label]) => (
              <button key={key} aria-pressed={category === key} onClick={() => select(key)}>
                {label}
              </button>
            ))}
          </nav>
          {!query ? (
            <p role="status">Enter a search term to find people, posts and threads.</p>
          ) : (
            (category === 'all' ? ['people', 'posts', 'threads'] : [category]).map((kind) => (
              <SearchResults
                key={`${query}:${kind}`}
                kind={kind}
                query={query}
                preview={category === 'all'}
                onSeeAll={() => select(kind)}
                onMedia={() => select('media')}
              />
            ))
          )}
        </section>
      </div>
    </main>
  )
}

function SearchQueryForm({ query, onSubmit }) {
  const [value, setValue] = useState(query)
  return (
    <form
      className="search-query"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value.trim())
      }}
    >
      <label className="search-query-label" htmlFor="discovery-query">
        Search people, posts and threads
      </label>
      <div>
        <input
          id="discovery-query"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search Social KNKT"
          maxLength={200}
        />
        <button type="submit">Search</button>
      </div>
    </form>
  )
}

function SearchResults({ kind, query, preview, onSeeAll, onMedia }) {
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const active = useRef(false)
  const busy = useRef(false)
  const load = useCallback(
    async (nextPage) => {
      if (busy.current) return
      busy.current = true
      setLoading(true)
      setError(false)
      try {
        const response = await searchContent(kind, query, nextPage)
        if (!active.current) return
        const next = response.data || []
        setItems((current) => mergeResults(nextPage ? current : [], next))
        setPage(nextPage + 1)
        setHasMore(next.length >= SEARCH_PAGE_SIZE)
      } catch {
        if (active.current) setError(true)
      } finally {
        busy.current = false
        if (active.current) setLoading(false)
      }
    },
    [kind, query],
  )
  useEffect(() => {
    active.current = true
    load(0)
    return () => {
      active.current = false
    }
  }, [load])
  const visible = preview ? items.slice(0, 3) : items
  return (
    <section className="search-results" aria-label={categories[kind]}>
      <div className="search-heading">
        <h2>{categories[kind]}</h2>
        {preview && <button onClick={onSeeAll}>See All</button>}
      </div>
      {kind === 'posts' && (
        <p className="search-note">Searchable posts include photos and videos.</p>
      )}
      <div className={kind === 'media' ? 'search-media' : 'search-items'}>
        {visible.map((item) => (
          <SearchResult
            key={entityId(item)}
            kind={kind}
            item={item}
            onDeleted={(id) =>
              setItems((current) => current.filter((entry) => entityId(entry) !== id))
            }
          />
        ))}
      </div>
      <SearchMediaPreview preview={preview} kind={kind} items={items} onMedia={onMedia} />
      <SearchFeedback
        loading={loading}
        error={error}
        kind={kind}
        count={items.length}
        onRetry={() => load(page)}
      />
      {!preview && hasMore && !error && (
        <button disabled={loading} onClick={() => load(page)}>
          Load more
        </button>
      )}
    </section>
  )
}

function SearchMediaPreview({ preview, kind, items, onMedia }) {
  return (
    <>
      {preview && kind === 'posts' && items.length > 0 && (
        <section className="search-results">
          <div className="search-heading">
            <h2>Media</h2>
            <button onClick={onMedia}>See All</button>
          </div>
          <div className="search-media">
            {items.map((item) => (
              <SearchResult key={entityId(item)} kind="media" item={item} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function SearchFeedback({ loading, error, kind, count, onRetry }) {
  return (
    <>
      {loading && (
        <LoadingSkeleton
          label="Loading results…"
          variant={kind === 'media' ? 'media' : 'rows'}
        />
      )}
      {error && (
        <div role="alert">
          Unable to load results. <button onClick={onRetry}>Retry</button>
        </div>
      )}
      {!loading && !error && !count && (
        <p role="status">No {categories[kind].toLowerCase()} found.</p>
      )}
    </>
  )
}

function SearchResult({ kind, item, onDeleted }) {
  const [connecting, setConnecting] = useState(false)
  const id = entityId(item)
  const name = [item.fname, item.lname].filter(Boolean).join(' ') || item.username || 'User'
  if (kind === 'people')
    return (
      <>
        <article className="search-person">
          <img src={item.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
          <div>
            <Link to={`/profile?userId=${encodeURIComponent(id)}`}>{name}</Link>
            <p>@{item.username}</p>
          </div>
          <button className="search-profile" onClick={() => setConnecting(true)}>
            Connect
          </button>
        </article>
        {connecting && <ConnectionManager userId={id} onClose={() => setConnecting(false)} />}
      </>
    )
  if (kind === 'media')
    return (
      <Link to={`/home?postId=${encodeURIComponent(id)}`} aria-label={`View post by ${name}`}>
        {item.mediaType === 'video' && !item.thumbnail ? (
          <video src={item.media} muted preload="metadata" />
        ) : (
          <img src={item.thumbnail || item.media} alt={item.description || `Post by ${name}`} />
        )}
      </Link>
    )
  if (kind === 'threads')
    return (
      <article className="feed-post">
        <h3>
          <Link to={`/knkt?threadId=${encodeURIComponent(id)}`}>
            {item.title || item.question || 'View thread'}
          </Link>
        </h3>
        <p>{item.body}</p>
        <small>{name}</small>
      </article>
    )
  return <PostCard post={item} onDeleted={onDeleted} />
}
