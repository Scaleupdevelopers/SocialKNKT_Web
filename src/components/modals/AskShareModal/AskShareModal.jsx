import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { ModalShell } from '../ModalShell'
import { createThread, getThreadLocations, getTopics } from '../../../action/action'
import { useProfile } from '../../../context/ProfileContext'
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
  const [suggestions, setSuggestions] = useState([])
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    if (!value.trim()) return undefined
    const timer = setTimeout(() => {
      getThreadLocations(value.trim())
        .then((response) => {
          if (active) setSuggestions(response.data || [])
        })
        .catch(() => {
          if (active) setFailed(true)
        })
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [value, retry])
  return (
    <>
      <div className="ask-location">
        <img src="/assets/logo_icons/location.svg" alt="" />
        <input
          className="community-modal-input"
          aria-label="Location"
          list="question-locations"
          value={value}
          onChange={(event) => {
            setSuggestions([])
            setFailed(false)
            onChange(event.target.value)
          }}
          disabled={disabled}
          placeholder="Location"
        />
        <datalist id="question-locations">
          {suggestions.map((item) => (
            <option
              key={item._id || item.id || item.city}
              value={[item.city, item.country].filter(Boolean).join(', ')}
            />
          ))}
        </datalist>
      </div>
      {failed && (
        <p role="status">
          Location suggestions unavailable. Enter a location or{' '}
          <button
            type="button"
            onClick={() => {
              setFailed(false)
              setRetry((current) => current + 1)
            }}
          >
            Retry locations
          </button>
          .
        </p>
      )}
    </>
  )
}

function QuestionTopics({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    getTopics()
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
    <div className="ask-category-dropdown">
      <button
        className="community-modal-input ask-category-trigger"
        type="button"
        aria-label="Categories"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span>
          {selected.length ? selected.map(topicLabel).join(', ') : 'Choose up to 5 Categories'}
        </span>
        <img src="/assets/logo_icons/postadddropdown.svg" alt="" />
      </button>
      {open && (
        <div className="ask-category-menu" role="group" aria-label="Choose up to 5 categories">
          {loading && <p role="status">Loading categories…</p>}
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
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  )
}

function CategoryOption({ topic, selected, disabled, onToggle }) {
  const checked = selected.some((item) => topicId(item) === topicId(topic))
  return (
    <label className="ask-category-option">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || (!checked && selected.length >= 5)}
        onChange={() => onToggle(topic)}
      />
      {topicLabel(topic)}
    </label>
  )
}
