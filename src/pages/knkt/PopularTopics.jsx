import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { getRequest } from '../../utils/helper'
import './PopularTopics.css'

export function PopularTopics() {
  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
      getRequest('user/topics')
        .then((response) => setTopics(response.data))
        .finally(() => setTopicsLoading(false))
  }, [])

  return (
    <div className="popular-topics-page">
      <Header />
      <main className="popular-topics-content">
        <button className="popular-topics-back" type="button" onClick={() => navigate('/knkt')}>← <span>Popular Topics</span></button>
        <div className="popular-topics-grid">
          {topicsLoading
            ? Array.from({ length: 15 }, (_, index) => <div className="popular-topic popular-topic-skeleton" key={index}><span className="popular-topic-skeleton-image" /><span className="popular-topic-skeleton-label" /></div>)
            : topics.map((topic) => (
            <div className="popular-topic" key={topic._id}>
              <img src={topic.image} alt={topic.topic || topic.title} />
                <span>{topic.topic || topic.title}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
