import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { ModalShell } from '../ModalShell'
import { AutoLoadMore } from '../../common/RequestState'
import { createThread, getThreadLocations, getTopics } from '../../../action/action'
import { useProfile } from '../../../context/ProfileContext'
import { usePagedList } from '../../../utils/usePagedList'
import './AskShareModal.css'

const topicId = (topic) => topic._id || topic.id
const topicLabel = (topic) => topic.topic || topic.title

function hasQuestionDetails(question, location, topics) {
  return Boolean(question.trim() && location.trim() && topics.length)
}

export function AskShareModal({ onClose, onCreated }) {
  const { profile } = useProfile()
  const [question, setQuestion] = useState('')
  const [location, setLocation] = useState('')
  const [selectedTopics, setSelectedTopics] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (busy.current) return
    if (!hasQuestionDetails(question, location, selectedTopics)) {
      setError('Enter a question, location and at least one category.')
      return
    }
    busy.current = true
    setSubmitting(true)
    setError('')
    try {
      await createThread({
        type: 1,
        question: question.trim(),
        location: location.trim(),
        topic: selectedTopics.map(topicId),
      })
      if (!active.current) return
      toast.success('Question posted successfully.')
      onCreated?.()
      onClose()
    } catch {
      if (active.current) setError('Unable to post your question. Please try again.')
    } finally {
      busy.current = false
      if (active.current) setSubmitting(false)
    }
  }

  const close = () => {
    if (!busy.current) onClose()
  }
  return (
    <ModalShell title="Ask or Share on KNKT(n)" onClose={close} className="ask-share-modal">
      <div className="community-modal-user">
        <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
        <strong>{profile?.fullName || profile?.username || 'You'}</strong>
      </div>
      <form onSubmit={submit} aria-label="Post a question">
        <input
          className="community-modal-input"
          aria-label="Question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={submitting}
          placeholder={'Start your question with “What, Why”, “How”, etc...'}
        />
        <QuestionLocation value={location} onChange={setLocation} disabled={submitting} />
        <QuestionTopics
          selected={selectedTopics}
          onChange={setSelectedTopics}
          disabled={submitting}
        />
        {error && <p role="alert">{error}</p>}
        <button
          className="community-gradient-button"
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </ModalShell>
  )
}

function QuestionLocation({ value, onChange, disabled }) {
  const inputRef = useRef(null)
  const selectedLocation = useRef('')
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(open ? value.trim() : ''), 350)
    return () => clearTimeout(timer)
  }, [value, open])
  const loadPage = useCallback(
    (page) => (query ? getThreadLocations(query, page, 10) : Promise.resolve({ data: [] })),
    [query],
  )
  const list = usePagedList(loadPage)
  const pendingQuery = query !== value.trim()
  const visible = open && Boolean(value.trim()) && !disabled
  const select = (item) => {
    selectedLocation.current = [item.city, item.country].filter(Boolean).join(', ')
    inputRef.current?.focus()
    setOpen(false)
    setQuery('')
    onChange(selectedLocation.current)
  }
  return (
    <div
      className="ask-location-wrap"
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          inputRef.current?.focus()
          setOpen(false)
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <label className="ask-location">
        <img src="/assets/logo_icons/location.svg" alt="" />
        <input
          ref={inputRef}
          aria-label="Location"
          aria-controls={visible ? 'question-locations' : undefined}
          aria-expanded={visible}
          aria-autocomplete="list"
          role="combobox"
          value={value}
          onChange={(event) => {
            selectedLocation.current = ''
            setOpen(true)
            onChange(event.target.value)
          }}
          onFocus={() => setOpen(value.trim() !== selectedLocation.current)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              event.currentTarget
                .closest('.ask-location-wrap')
                .querySelector('[role="option"]')
                ?.focus()
            }
          }}
          disabled={disabled}
          placeholder="Location"
        />
      </label>
      {visible && (
        <LocationSuggestions list={list} pendingQuery={pendingQuery} onSelect={select} />
      )}
    </div>
  )
}

function LocationSuggestions({ list, pendingQuery, onSelect }) {
  if (pendingQuery)
    return (
      <div id="question-locations" role="listbox" aria-label="Locations">
        <span
          className="loading-skeleton-label"
          role="status"
          aria-label="Loading locations…"
        />
      </div>
    )
  return (
    <div
      className="ask-location-suggestions"
      id="question-locations"
      role="listbox"
      aria-label="Locations"
    >
      {list.items.map((item) => (
        <button
          type="button"
          role="option"
          aria-selected="false"
          aria-label={[item.city, item.country].filter(Boolean).join(', ')}
          key={item._id || item.id || `${item.city}-${item.country}`}
          onClick={() => onSelect(item)}
        >
          <strong>{item.city}</strong>
          <small>{item.country}</small>
        </button>
      ))}
      <LocationFeedback list={list} />
      <AutoLoadMore
        hasMore={list.hasMore}
        loading={list.loading}
        error={list.error}
        onLoadMore={list.loadMore}
        label="Question locations"
      />
    </div>
  )
}

function LocationFeedback({ list }) {
  if (list.loading)
    return (
      <span className="loading-skeleton-label" role="status" aria-label="Loading locations…" />
    )
  if (list.error)
    return (
      <p role="alert">
        Unable to load locations.{' '}
        <button type="button" onClick={list.loadMore}>
          Retry locations
        </button>
      </p>
    )
  if (!list.items.length) return <p role="status">No locations found.</p>
  return null
}

function QuestionTopics({ selected, onChange, disabled }) {
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => (active ? getTopics() : null))
      .then((response) => {
        if (active) setTopics((response.data || []).filter(topicId))
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])
  function toggle(topic) {
    const exists = selected.some((item) => topicId(item) === topicId(topic))
    if (exists) onChange(selected.filter((item) => topicId(item) !== topicId(topic)))
    else if (selected.length < 5) onChange([...selected, topic])
  }
  return (
    <div
      className={`ask-category-dropdown${open ? ' is-open' : ''}`}
      onKeyDownCapture={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          setOpen(false)
          triggerRef.current?.focus()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="ask-category-field" data-selected={Boolean(selected.length)}>
        <CategoryChips
          selected={selected}
          disabled={disabled}
          onRemove={(topic) => {
            toggle(topic)
            triggerRef.current?.focus()
          }}
        />
        <button
          ref={triggerRef}
          className="community-modal-input ask-category-trigger"
          type="button"
          aria-label="Categories"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          <span>{selected.length ? 'Categories' : 'Choose up to 5 Categories'}</span>
          <img src="/assets/logo_icons/postadddropdown.svg" alt="" />
        </button>
      </div>
      {open && (
        <div className="ask-category-menu" role="group" aria-label="Choose up to 5 categories">
          {loading && (
            <span
              className="loading-skeleton-label"
              role="status"
              aria-label="Loading categories…"
            />
          )}
          {failed && (
            <p role="alert">
              Unable to load categories.{' '}
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  setFailed(false)
                  setRetry((current) => current + 1)
                }}
              >
                Retry categories
              </button>
            </p>
          )}
          {!loading && !failed && !topics.length && (
            <p role="status">No categories available.</p>
          )}
          {topics.map((topic) => (
            <CategoryOption
              key={topicId(topic)}
              topic={topic}
              selected={selected}
              disabled={disabled}
              onToggle={toggle}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              triggerRef.current?.focus()
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

function CategoryChips({ selected, disabled, onRemove }) {
  if (!selected.length) return null
  return (
    <div className="ask-category-chips">
      {selected.map((topic) => (
        <span className="ask-category-chip" key={topicId(topic)}>
          {topicLabel(topic)}
          <button
            type="button"
            aria-label={`Remove ${topicLabel(topic)}`}
            disabled={disabled}
            onClick={() => onRemove(topic)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

function CategoryOption({ topic, selected, disabled, onToggle }) {
  const checked = selected.some((item) => topicId(item) === topicId(topic))
  return (
    <button
      className={`ask-category-option${checked ? ' selected' : ''}`}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled || (!checked && selected.length >= 5)}
      onClick={() => onToggle(topic)}
    >
      {topicLabel(topic)}
      {checked && <span aria-hidden="true">✓</span>}
    </button>
  )
}
