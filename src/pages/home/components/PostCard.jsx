import { useState } from 'react'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
const profileIcon = '/assets/logo_icons/profile_avatar.png'

export function PostCard({ post }) {
  const [isReportOpen, setIsReportOpen] = useState(false)

  return (
    <article className="feed-post">
      <div className="post-author-row">
        <img src={profileIcon} alt={post.name} />
        <div>
          <h2>{post.name}</h2>
          <p>{post.hours} · {post.role}</p>
        </div>
        <button className="more-button" type="button" aria-label="More options">⋮</button>
      </div>

      <p className="post-copy">
        {post.content} <span>More</span>
      </p>

      <img
        className="post-image"
        src={post.image}
        alt={`${post.name}'s restaurant post`}
        onError={(event) => {
          event.currentTarget.src = '/assets/home_food_post.jpg'
        }}
      />

      <div className="post-actions">
        <button type="button">
          <img src="/assets/logo_icons/like.svg" alt="" />
          {post.likes} Like
        </button>
        <button type="button">
          <img src="/assets/logo_icons/comment.svg" alt="" />
          {post.comments} Comments
        </button>
        <button type="button" onClick={() => setIsReportOpen(true)}>
          <img src="/assets/logo_icons/report.svg" alt="" />
          Report
        </button>
      </div>

      {isReportOpen && <ReportPostModal onClose={() => setIsReportOpen(false)} />}
    </article>
  )
}
