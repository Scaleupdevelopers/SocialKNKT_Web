import { useEffect, useState } from 'react'
import { ModalShell } from '../ModalShell'
import { getTopics } from '../../../action/action'
import './AskShareModal.css'

export function AskShareModal({ onClose }) {
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(true)

  useEffect(() => {
    getTopics()
      .then((response) => setTopics(response.data || []))
      .finally(() => setTopicsLoading(false))
  }, [])

  return (
    <ModalShell title="Ask or Share on KNKT(n)" onClose={onClose} className="ask-share-modal">
      <div className="community-modal-user">
        <img src="/assets/logo_icons/profile_avatar.png" alt="Dianne Russell" />
        <strong>Dianne Russell</strong>
      </div>
      <input className="community-modal-input" type="text" placeholder={'Start your question with “What, Why”, “How”, etc...'} />
      <input className="community-modal-input" type="text" placeholder="⌖  Location" />
      <div className="ask-category-dropdown">
        <button
          className="community-modal-input ask-category-trigger"
          type="button"
          onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
        >
          {category || 'Choose up to 5 Categories'}
          <img src="/assets/logo_icons/postadddropdown.svg" alt="" />
        </button>
        {isCategoryMenuOpen && (
          <div className="ask-category-menu">
            {topicsLoading ? <span className="ask-category-loading">Loading categories...</span> : topics.map((topic) => {
              const option = topic.topic || topic.title
              return (
              <button
                type="button"
                key={option}
                onClick={() => {
                  setCategory(option)
                  setIsCategoryMenuOpen(false)
                }}
              >
                {option}
              </button>
              )
            })}
          </div>
        )}
      </div>
      <button className="community-gradient-button" type="button">Post</button>
    </ModalShell>
  )
}
