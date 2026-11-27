import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { getPopularTopics } from '../../action/action'
import { mergeResults } from '../../utils/helper'
import './PopularTopics.css'

export function PopularTopics() {
  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getPopularTopics()
      .then((response) => {
        if (active) setTopics(mergeResults([], response.data || []))
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setTopicsLoading(false)
      })
    return () => {
      active = false
    }
  }, [retry])

  function retryTopics() {
    setError(false)
    setTopicsLoading(true)
    setRetry((current) => current + 1)
  }

  function renderFeedback() {
    if (error) {
      return (
        <p role="alert">
          Unable to load popular topics.{' '}
          <button type="button" onClick={retryTopics}>
            Retry popular topics
          </button>
        </p>
      )
    }
    if (topicsLoading || topics.length) return null
    return <p role="status">No popular topics available.</p>
  }

  return (
    <div className="popular-topics-page">
      <Header />
      <main className="popular-topics-content">
        <button className="popular-topics-back" type="button" onClick={() => navigate('/knkt')}>
          ← <span>Popular Topics</span>
        </button>
        {renderFeedback()}
        <div className="popular-topics-grid">
          {topicsLoading
            ? Array.from({ length: 15 }, (_, index) => (
                <div className="popular-topic popular-topic-skeleton" key={index}>
                  <span className="popular-topic-skeleton-image" />
                  <span className="popular-topic-skeleton-label" />
                </div>
              ))
            : topics.map((topic) => (
                <button
                  className="popular-topic"
                  type="button"
                  key={topic._id || topic.id}
                  onClick={() =>
                    navigate('/knkt?topicId=' + encodeURIComponent(topic._id || topic.id))
                  }
                >
                  <img src={topic.image} alt={topic.topic || topic.title} />
                  <span>{topic.topic || topic.title}</span>
                </button>
              ))}
        </div>
      </main>
    </div>
  )
}
