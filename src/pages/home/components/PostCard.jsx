import { useEffect, useRef, useState } from 'react'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
import { CommentsModal } from '../../../components/modals/CommentsModal/CommentsModal'
import {
  deletePost,
  updatePostLike,
  recordPostShare,
  recordPostViews,
} from '../../../action/action'
import { toast } from 'react-toastify'
import { useProfile } from '../../../context/ProfileContext'
import { readAuth, postLink } from '../../../utils/helper'

const profileIcon = '/assets/logo_icons/profile_avatar.png'

function PostTypeIcons({ postType }) {
  const type = Number(postType)
  if (![1, 2, 3].includes(type)) return null
  const icons =
    type === 3
      ? [['/assets/logo_icons/User and Briefcase Icon.png', 'Personal and Professional']]
      : type === 1
        ? [['/assets/logo_icons/Professional.svg', 'Professional']]
        : [['/assets/logo_icons/personal.svg', 'Personal']]

  return (
    <span
      className={`post-type-icons ${type === 3 ? 'post-type-both' : ''}`}
      aria-label={icons.map(([, label]) => label).join(' and ')}
    >
      {icons.map(([icon, label]) => (
        <img key={label} src={icon} alt={label} />
      ))}
    </span>
  )
}

export function PostCard({
  post,
  onDeleted,
  showReport = true,
  reportInMenu = false,
  fallbackAuthorImage,
}) {
  const { profile } = useProfile()
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const initial = getPostCounts(post)
  const [isLiked, setIsLiked] = useState(initial.liked)
  const [likeCount, setLikeCount] = useState(initial.likes)
  const [commentCount, setCommentCount] = useState(initial.comments)
  const liking = useRef(false)
  const deleting = useRef(false)
  const authData = readAuth()
  const cardRef = useRef(null)
  const viewed = useRef(new Set())
  const postId = post._id || post.id
  useEffect(() => {
    if (!postId || !cardRef.current || !window.IntersectionObserver) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting) || viewed.current.has(postId)) return
        viewed.current.add(postId)
        recordPostViews([postId]).catch(() => viewed.current.delete(postId))
      },
      { threshold: 0.7 },
    )
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [postId])
  const currentUserId = getCurrentUserId(profile, authData)
  const isOwnPost = ownsPost(post, currentUserId)

  const handleDelete = async () => {
    const postId = post._id || post.id
    if (!postId || deleting.current) return
    deleting.current = true

    setIsDeleting(true)
    try {
      await deletePost(postId)
      setIsDeleteModalOpen(false)
      onDeleted?.(postId)
      toast.success('Post deleted successfully.')
    } catch {
      toast.error('Unable to delete post. Please try again.')
    } finally {
      deleting.current = false
      setIsDeleting(false)
    }
  }

  const handleLike = async () => {
    const postId = post._id || post.id
    if (!postId || liking.current) return
    liking.current = true

    const previousLikeStatus = isLiked
    const nextLikeStatus = !previousLikeStatus
    setIsLiked(nextLikeStatus)
    setLikeCount((count) => Math.max(0, count + (nextLikeStatus ? 1 : -1)))
    try {
      await updatePostLike(postId, nextLikeStatus)
    } catch {
      setIsLiked(previousLikeStatus)
      setLikeCount((count) => Math.max(0, count + (nextLikeStatus ? -1 : 1)))
      toast.error('Unable to update like. Please try again.')
    } finally {
      liking.current = false
    }
  }

  const shareUrl = postLink(post._id || post.id)
  const shareRecorded = useRef(Boolean(post.isShared || post.isshared))
  const shareBusy = useRef(false)
  const recordShare = () => {
    if (shareRecorded.current) return
    shareRecorded.current = true
    recordPostShare(post._id || post.id).catch(() => {
      shareRecorded.current = false
    })
  }

  const handleShare = async () => {
    const postId = post._id || post.id
    if (!postId || shareBusy.current) return
    shareBusy.current = true
    const shareText = `📢 Social Knkt Notification\nNew Post Shared by: ${authorName}\nPost: ${postDescription || ''}\nMedia:\n${mediaUrl || ''}\nStay connected and check out the latest activity on Social Knkt.`
    try {
      if (navigator.share) {
        await navigator.share({ title: `${authorName}'s post`, text: shareText, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
      recordShare()
      setIsShareOpen(false)
    } catch (error) {
      if (error.name !== 'AbortError') toast.error('Unable to share. Try Copy Link.')
    } finally {
      shareBusy.current = false
    }
  }

  const copyShareLink = async () => {
    if (shareBusy.current) return
    shareBusy.current = true
    try {
      await navigator.clipboard.writeText(shareUrl)
      recordShare()
      setIsShareOpen(false)
      toast.success('Link copied.')
    } catch {
      toast.error('Unable to copy link. Check clipboard permissions and retry.')
    } finally {
      shareBusy.current = false
    }
  }
  const authorName = getAuthorName(post)
  const authorImage = getAuthorImage(post, fallbackAuthorImage)
  const mediaUrl = getMediaUrl(post)
  const mediaAlt = getMediaAlt(post, authorName)
  const postTime = getPostTime(post)
  const postDescription = getDescription(post)

  return (
    <article className="feed-post" ref={cardRef}>
      <div className="post-author-row">
        <img src={authorImage} alt={authorName} />
        <div>
          <h2>{authorName}</h2>
          <p>
            {postTime}
            <PostTypeIcons postType={post.postType} />
          </p>
        </div>
        <PostOptions
          isOwnPost={isOwnPost}
          showReport={showReport}
          reportInMenu={reportInMenu}
          isDeleting={isDeleting}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          setIsReportOpen={setIsReportOpen}
        />
      </div>

      <PostDescription postDescription={postDescription} />

      <PostMedia post={post} mediaUrl={mediaUrl} mediaAlt={mediaAlt} />

      <PostActions
        isLiked={isLiked}
        likeCount={likeCount}
        commentCount={commentCount}
        handleLike={handleLike}
        setIsCommentsOpen={setIsCommentsOpen}
        setIsShareOpen={setIsShareOpen}
        showReport={showReport}
        isOwnPost={isOwnPost}
        reportInMenu={reportInMenu}
        setIsReportOpen={setIsReportOpen}
      />

      {isReportOpen && (
        <ReportPostModal postId={post._id || post.id} onClose={() => setIsReportOpen(false)} />
      )}
      {isCommentsOpen && (
        <CommentsModal
          post={post}
          postOwnerId={postOwnerId(post)}
          onClose={() => setIsCommentsOpen(false)}
          onCommentCountChange={(change) =>
            setCommentCount((count) => Math.max(0, count + change))
          }
        />
      )}

      <PostShareDialog
        isShareOpen={isShareOpen}
        setIsShareOpen={setIsShareOpen}
        handleShare={handleShare}
        copyShareLink={copyShareLink}
      />

      <PostDeleteDialog
        isDeleteModalOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        handleDelete={handleDelete}
      />
    </article>
  )
}

function getPostCounts(post) {
  return {
    liked: Boolean(post.isLiked ?? post.liked ?? post.likeStatus),
    likes: Number(post.likeCount ?? post.likes ?? 0),
    comments: Number(post.commentCount ?? post.comments ?? 0),
  }
}
function getCurrentUserId(profile, auth) {
  return profile?.id || auth?.user?.id || auth?.data?.id
}
function postOwnerId(post) {
  return post.userId || post.user?.id
}

function ownsPost(post, userId) {
  return Boolean(userId && postOwnerId(post) === userId)
}
function getAuthorName(post) {
  return (
    [post.fname, post.lname].filter(Boolean).join(' ') || post.username || post.name || 'User'
  )
}
function getAuthorImage(post, fallback) {
  return post.userImage || post.authorImage || fallback || profileIcon
}
function getMediaUrl(post) {
  if (!post.media) return post.image
  return post.mediaType === 'flicks' ? post.thumbnail || post.media : post.media
}
function getMediaAlt(post, name) {
  return isVideoMedia(post) ? name + "'s video" : name + "'s post"
}
function getPostTime(post) {
  return post.createdAt ? formatPostTime(post.createdAt) : post.hours || 'Just now'
}
function getDescription(post) {
  return post.description || post.content || ''
}
function PostOptions({
  isOwnPost,
  showReport,
  reportInMenu,
  isDeleting,
  setIsDeleteModalOpen,
  setIsReportOpen,
}) {
  const optionsRef = useRef(null)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
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

  return (
    <>
      {' '}
      {(isOwnPost || (showReport && reportInMenu && !isOwnPost)) && (
        <div className="post-options" ref={optionsRef}>
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
              {isOwnPost ? (
                <button
                  className="post-delete-option"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOptionsOpen(false)
                    setIsDeleteModalOpen(true)
                  }}
                  disabled={isDeleting}
                >
                  <img src="/assets/logo_icons/red_delete_icon.svg" alt="" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                </button>
              ) : (
                <button
                  className="post-report-option"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsOptionsOpen(false)
                    setIsReportOpen(true)
                  }}
                >
                  <img src="/assets/logo_icons/report.svg" alt="" />
                  <span>Report</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
function PostDescription({ postDescription }) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const descriptionLimit = 160
  const hasLongDescription = postDescription.length > descriptionLimit
  const visibleDescription =
    isDescriptionExpanded || !hasLongDescription
      ? postDescription
      : postDescription.slice(0, descriptionLimit).trimEnd() + '...'
  return (
    <>
      {' '}
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
    </>
  )
}
function PostActions({
  isLiked,
  likeCount,
  commentCount,
  handleLike,
  setIsCommentsOpen,
  setIsShareOpen,
  showReport,
  isOwnPost,
  reportInMenu,
  setIsReportOpen,
}) {
  return (
    <div className="post-actions">
      <button
        className={`post-like-button ${isLiked ? 'is-liked' : ''}`}
        type="button"
        onClick={handleLike}
        aria-pressed={isLiked}
      >
        <img
          src={isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'}
          alt=""
        />
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
      {showReport && !isOwnPost && !reportInMenu && (
        <button type="button" onClick={() => setIsReportOpen(true)}>
          <img src="/assets/logo_icons/report.svg" alt="" />
          Report
        </button>
      )}
    </div>
  )
}
function PostShareDialog({ isShareOpen, setIsShareOpen, handleShare, copyShareLink }) {
  if (!isShareOpen) return null
  return (
    <div
      className="post-share-backdrop"
      role="presentation"
      onClick={() => setIsShareOpen(false)}
    >
      <div
        className="post-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-post-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="post-share-close"
          type="button"
          aria-label="Close"
          onClick={() => setIsShareOpen(false)}
        >
          ×
        </button>
        <h2 id="share-post-title">Share Post</h2>
        <button className="post-share-action" type="button" onClick={handleShare}>
          Share
        </button>
        <button className="post-share-action" type="button" onClick={copyShareLink}>
          Copy Link
        </button>
      </div>
    </div>
  )
}
function PostDeleteDialog({
  isDeleteModalOpen,
  isDeleting,
  setIsDeleteModalOpen,
  handleDelete,
}) {
  if (!isDeleteModalOpen) return null
  return (
    <div
      className="post-delete-modal-backdrop"
      role="presentation"
      onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
    >
      <div
        className="post-delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-post-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="post-delete-modal-close"
          type="button"
          aria-label="Close"
          onClick={() => setIsDeleteModalOpen(false)}
          disabled={isDeleting}
        >
          ×
        </button>
        <h2 id="delete-post-title">Delete Post</h2>
        <p>Are you sure you want to delete this post?</p>
        <div className="post-delete-modal-actions">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="post-delete-confirm"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PostMedia({ post, mediaUrl, mediaAlt }) {
  if (!mediaUrl) {
    return null
  }

  if (isDocumentMedia(post)) {
    const thumbnail = getDocumentThumbnail(post)

    return (
      <a
        className="post-document-thumbnail"
        href={mediaUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${mediaAlt}`}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={mediaAlt} />
        ) : (
          <div className="post-document-placeholder">Document</div>
        )}
        <span>Click to open full document</span>
      </a>
    )
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
  const mediaType = String(post.mediaType || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '')
  const mediaUrl = String(post.media || '').toLowerCase()

  return (
    ['flicks', 'video', 'videolink', 'link'].includes(mediaType) ||
    /\.(mp4|webm|ogg)(\?|$)/.test(mediaUrl)
  )
}

function isDocumentMedia(post) {
  const mediaType = String(post.mediaType || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '')
  return ['document', 'file', 'pdf'].includes(mediaType)
}

function getDocumentThumbnail(post) {
  return (
    post.thumbnail || post.thumbnailUrl || post.mediaThumbnail || post.documentThumbnail || ''
  )
}

function getVideoEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.replace('www.', '')
    let videoId = ''

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      videoId =
        parsedUrl.searchParams.get('v') || parsedUrl.pathname.split('/').filter(Boolean).pop()
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
