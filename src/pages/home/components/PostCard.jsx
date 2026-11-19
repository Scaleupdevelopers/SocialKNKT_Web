import { useEffect, useRef, useState } from 'react'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
import { CommentsModal } from '../../../components/modals/CommentsModal/CommentsModal'
import { deletePost, updatePostLike } from '../../../action/action'
import { toast } from 'react-toastify'
import { useProfile } from '../../../context/ProfileContext'
import { AUTH_STORAGE_KEY } from '../../../utils/helper'
const profileIcon = '/assets/logo_icons/profile_avatar.png'

export function PostCard({ post, onDeleted }) {
  const { profile } = useProfile()
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked ?? post.liked ?? post.likeStatus))
  const [likeCount, setLikeCount] = useState(Number(post.likeCount ?? post.likes ?? 0))
  const optionsRef = useRef(null)
  const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
  const currentUserId = profile?.id || authData?.user?.id || authData?.data?.id
  const isOwnPost = Boolean(currentUserId && (post.userId || post.user?.id) === currentUserId)

  useEffect(() => {
    if (!isOptionsOpen) return undefined

    const closeOptionsOnOutsideClick = (event) => {
      if (!optionsRef.current?.contains(event.target)) {
        setIsOptionsOpen(false)
      }
    }

    document.addEventListener('click', closeOptionsOnOutsideClick)
    return () => document.removeEventListener('click', closeOptionsOnOutsideClick)
  }, [isOptionsOpen])

  const handleDelete = async () => {
    const postId = post._id || post.id
    if (!postId || isDeleting) return
    
    setIsDeleting(true)
    try {
      await deletePost(postId)
      setIsOptionsOpen(false)
      setIsDeleteModalOpen(false)
      onDeleted?.(postId)
      toast.success('Post deleted successfully.')
    } catch (error) {
      toast.error(error.message || 'Unable to delete post.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLike = async () => {
    const postId = post._id || post.id
    if (!postId) return

    const previousLikeStatus = isLiked
    const nextLikeStatus = !previousLikeStatus
    setIsLiked(nextLikeStatus)
    setLikeCount((count) => Math.max(0, count + (nextLikeStatus ? 1 : -1)))
    try {
      await updatePostLike(postId, nextLikeStatus)
    } catch {
      setIsLiked((currentStatus) => {
        if (currentStatus !== nextLikeStatus) return currentStatus
        setLikeCount((count) => Math.max(0, count + (nextLikeStatus ? -1 : 1)))
        return previousLikeStatus
      })
    }
  }

  const shareUrl = `${window.location.origin}/home?postId=${post._id || post.id}`

  const handleShare = async () => {
    const postId = post._id || post.id
    if (!postId) return
    const shareText = `📢 Social Knkt Notification\nNew Post Shared by: ${authorName}\nPost: ${postDescription || ''}\nMedia:\n${mediaUrl || ''}\nStay connected and check out the latest activity on Social Knkt.`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${authorName}'s post`, text: shareText, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
    } catch {
      // Sharing can be cancelled or unavailable; keep the feed quiet.
    }
  }

  const copyShareLink = async () => {
    try {
      const shareText = `📢 Social Knkt Notification\nNew Post Shared by: ${authorName}\nPost: ${postDescription || ''}\nMedia:\n${mediaUrl || ''}\nStay connected and check out the latest activity on Social Knkt.`
      await navigator.clipboard.writeText(shareText)
      setIsShareOpen(false)
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  }
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
  const commentCount = post.commentCount ?? post.comments ?? 0

  return (
    <article className="feed-post">
      <div className="post-author-row">
        <img src={authorImage} alt={authorName} />
        <div>
          <h2>{authorName}</h2>
          <p>{postTime} · {post.username || post.role || ''}</p>
        </div>
        {isOwnPost && <div className="post-options" ref={optionsRef}>
          <button
            className="more-button"
            type="button"
            aria-label="More options"
            aria-expanded={isOptionsOpen}
            onClick={() => setIsOptionsOpen((value) => !value)}
          >
            ⋮
          </button>
          {isOptionsOpen && (
            <div className="post-options-menu" role="menu">
              <button className="post-delete-option" type="button" role="menuitem" onClick={() => { setIsOptionsOpen(false); setIsDeleteModalOpen(true) }} disabled={isDeleting}>
                <img src="/assets/logo_icons/red_delete_icon.svg" alt="" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
              </button>
            </div>
          )}
        </div>}
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
        <button className={`post-like-button ${isLiked ? 'is-liked' : ''}`} type="button" onClick={handleLike} aria-pressed={isLiked}>
          <img src={isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'} alt="" />
          {likeCount} Like
        </button>
        <button type="button" onClick={() => setIsCommentsOpen(true)}>
          <img src="/assets/logo_icons/comment.svg" alt="" />
          {commentCount} Comments
        </button>
        <button type="button" onClick={() => setIsShareOpen(true)}>
          <img src="/assets/logo_icons/share_icon.svg" alt="" />
          Share
        </button>
        <button type="button" onClick={() => setIsReportOpen(true)}>
          <img src="/assets/logo_icons/report.svg" alt="" />
          Report
        </button>
      </div>

      {isReportOpen && <ReportPostModal postId={post._id || post.id} onClose={() => setIsReportOpen(false)} />}
      {isCommentsOpen && <CommentsModal post={post} onClose={() => setIsCommentsOpen(false)} />}

      {isShareOpen && (
        <div className="post-share-backdrop" role="presentation" onClick={() => setIsShareOpen(false)}>
          <div className="post-share-modal" role="dialog" aria-modal="true" aria-labelledby="share-post-title" onClick={(event) => event.stopPropagation()}>
            <button className="post-share-close" type="button" aria-label="Close" onClick={() => setIsShareOpen(false)}>×</button>
            <h2 id="share-post-title">Share Post</h2>
            <button className="post-share-action" type="button" onClick={handleShare}>Share</button>
            <button className="post-share-action" type="button" onClick={copyShareLink}>Copy Link</button>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="post-delete-modal-backdrop" role="presentation" onClick={() => !isDeleting && setIsDeleteModalOpen(false)}>
          <div className="post-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-post-title" onClick={(event) => event.stopPropagation()}>
            <button className="post-delete-modal-close" type="button" aria-label="Close" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>×</button>
            <h2 id="delete-post-title">Delete Post</h2>
            <p>Are you sure you want to delete this post?</p>
            <div className="post-delete-modal-actions">
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancel</button>
              <button className="post-delete-confirm" type="button" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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
