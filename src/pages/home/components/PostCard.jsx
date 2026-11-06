import { useState } from 'react'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
const profileIcon = '/assets/logo_icons/profile_avatar.png'

export function PostCard({ post }) {
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const authorName = [post.fname, post.lname].filter(Boolean).join(' ')
    || post.username
    || post.name
    || 'User'
  const authorImage = post.userImage || post.authorImage || profileIcon
  const mediaUrl = post.media
    ? post.mediaType === 'flicks' ? post.thumbnail || post.media : post.media
    : post.image
  const mediaAlt = isVideoMedia(post) ? `${authorName}'s video` : `${authorName}'s post`
  const postTime = post.createdAt ? formatPostTime(post.createdAt) : post.hours || 'Just now'
  const postDescription = post.description || post.content || ''
  const descriptionLimit = 160
  const hasLongDescription = postDescription.length > descriptionLimit
  const visibleDescription = isDescriptionExpanded || !hasLongDescription
    ? postDescription
    : `${postDescription.slice(0, descriptionLimit).trimEnd()}...`
  const likeCount = post.likeCount ?? post.likes ?? 0
  const commentCount = post.commentCount ?? post.comments ?? 0

  return (
    <article className="feed-post">
      <div className="post-author-row">
        <img src={authorImage} alt={authorName} />
        <div>
          <h2>{authorName}</h2>
          <p>{postTime} · {post.username || post.role || ''}</p>
        </div>
        <button className="more-button" type="button" aria-label="More options">⋮</button>
      </div>

      {postDescription && (
        <p className="post-copy">
          {visibleDescription}
          {hasLongDescription && (
            <button
              className="post-copy-more"
              type="button"
              onClick={() => setIsDescriptionExpanded((value) => !value)}
            >
              {isDescriptionExpanded ? 'Less' : 'More'}
            </button>
          )}
        </p>
      )}

      <PostMedia post={post} mediaUrl={mediaUrl} mediaAlt={mediaAlt} />

      <div className="post-actions">
        <button type="button">
          <img src="/assets/logo_icons/like.svg" alt="" />
          {likeCount} Like
        </button>
        <button type="button">
          <img src="/assets/logo_icons/comment.svg" alt="" />
          {commentCount} Comments
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

function PostMedia({ post, mediaUrl, mediaAlt }) {
  if (!mediaUrl) {
    return null
  }

  const embedUrl = getVideoEmbedUrl(mediaUrl)

  if (embedUrl) {
    return (
      <iframe
        className="post-image post-video-embed"
        src={embedUrl}
        title={mediaAlt}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    )
  }

  if (isVideoMedia(post)) {
    return (
      <video
        className="post-image"
        src={post.media}
        poster={post.thumbnail || undefined}
        controls
        preload="metadata"
        aria-label={mediaAlt}
      />
    )
  }

  return <img className="post-image" src={mediaUrl} alt={mediaAlt} />
}

function isVideoMedia(post) {
  const mediaType = String(post.mediaType || '').toLowerCase().replace(/[-_\s]/g, '')
  const mediaUrl = String(post.media || '').toLowerCase()

  return [
    'flicks',
    'video',
    'videolink',
    'link',
  ].includes(mediaType) || /\.(mp4|webm|ogg)(\?|$)/.test(mediaUrl)
}

function getVideoEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.replace('www.', '')
    let videoId = ''

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      videoId = parsedUrl.searchParams.get('v') || parsedUrl.pathname.split('/').filter(Boolean).pop()
    }

    if (hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.split('/').filter(Boolean)[0]
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
  } catch {
    return ''
  }

  return ''
}

function formatPostTime(timestamp) {
  if (!timestamp) {
    return 'Just now'
  }

  const differenceInSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  if (differenceInSeconds < 60) {
    return 'Just now'
  }

  if (differenceInSeconds < 3600) {
    return `${Math.floor(differenceInSeconds / 60)} m`
  }

  if (differenceInSeconds < 86400) {
    return `${Math.floor(differenceInSeconds / 3600)} h`
  }

  return `${Math.floor(differenceInSeconds / 86400)} d`
}
