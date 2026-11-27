import { useEffect, useRef, useState } from 'react'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
import { CommentsModal } from '../../../components/modals/CommentsModal/CommentsModal'
import { deletePost, updatePostLike, recordPostShare } from '../../../action/action'
import { toast } from 'react-toastify'
import { useProfile } from '../../../context/ProfileContext'
import { AUTH_STORAGE_KEY, postLink } from '../../../utils/helper'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const profileIcon = '/assets/logo_icons/profile_avatar.png'

function PostTypeIcons({ postType }) {
  const type = Number(postType)
  if (![1, 2, 3].includes(type)) return null
  const icons = type === 3
    ? [['/assets/logo_icons/User and Briefcase Icon.png', 'Personal and Professional']]
    : type === 1
      ? [['/assets/logo_icons/Professional.svg', 'Professional']]
      : [['/assets/logo_icons/personal.svg', 'Personal']]

  return (
    <span className={`post-type-icons ${type === 3 ? 'post-type-both' : ''}`} aria-label={icons.map(([, label]) => label).join(' and ')}>
      {icons.map(([icon, label]) => <img key={label} src={icon} alt={label} />)}
    </span>
  )
}

export function PostCard({ post, onDeleted, showReport = true, reportInMenu = false, fallbackAuthorImage = '' }) {
  const { profile } = useProfile()
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked ?? post.liked ?? post.likeStatus))
  const [likeCount, setLikeCount] = useState(Number(post.likeCount ?? post.likes ?? 0))
  const [commentCount, setCommentCount] = useState(Number(post.commentCount ?? post.comments ?? 0))
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const authorName = [post.fname, post.lname].filter(Boolean).join(' ')
    || post.username
    || post.name
    || 'User'
  const authorImage = post.userImage || post.authorImage || fallbackAuthorImage || profileIcon
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

  return (
    <article className="feed-post">
      <div className="post-author-row">
        <img src={authorImage} alt={authorName} />
        <div>
          <h2>{authorName}</h2>
          <p>
            {postTime}
            <PostTypeIcons postType={post.postType} />
          </p>
        </div>
        {(isOwnPost || (showReport && reportInMenu && !isOwnPost)) && <div className="post-options" ref={optionsRef}>
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
                <button className="post-delete-option" type="button" role="menuitem" onClick={() => { setIsOptionsOpen(false); setIsDeleteModalOpen(true) }} disabled={isDeleting}>
                  <img src="/assets/logo_icons/red_delete_icon.svg" alt="" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                </button>
              ) : (
                <button className="post-report-option" type="button" role="menuitem" onClick={() => { setIsOptionsOpen(false); setIsReportOpen(true) }}>
                  <img src="/assets/logo_icons/report.svg" alt="" />
                  <span>Report</span>
                </button>
              )}
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
        {showReport && !isOwnPost && !reportInMenu && (
          <button type="button" onClick={() => setIsReportOpen(true)}>
            <img src="/assets/logo_icons/report.svg" alt="" />
            Report
          </button>
        )}
      </div>

      {isReportOpen && <ReportPostModal postId={post._id || post.id} onClose={() => setIsReportOpen(false)} />}
      {isCommentsOpen && <CommentsModal post={post} onClose={() => setIsCommentsOpen(false)} onCommentCountChange={(change) => setCommentCount((count) => Math.max(0, count + change))} />}

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

  if (isDocumentMedia(post)) {
    const thumbnail = getDocumentThumbnail(post)

    return (
      <a className="post-document-thumbnail" href={mediaUrl} target="_blank" rel="noreferrer" aria-label={`Open ${mediaAlt}`}>
        {thumbnail ? <img src={thumbnail} alt={mediaAlt} /> : <div className="post-document-placeholder">Document</div>}
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

function DocumentThumbnail({ url, thumbnail, title }) {
  const canvasRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)

  useEffect(() => {
    if (thumbnail) return undefined

    let cancelled = false
    const loadingTask = pdfjsLib.getDocument(url)
    loadingTask.promise.then(async (pdf) => {
      const page = await pdf.getPage(1)
      if (cancelled || !canvasRef.current) return
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = Math.min(1.5, 900 / baseViewport.width)
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    }).catch(() => {})

    return () => {
      cancelled = true
      loadingTask.destroy()
    }
  }, [thumbnail, url])

  return (
    <>
      <button className="post-document-thumbnail" type="button" onClick={() => setIsOpen(true)} aria-label={`Open ${title}`}>
      {thumbnail ? <img src={thumbnail} alt={title} /> : <canvas ref={canvasRef} aria-label={title} />}
      <span>Tap to open full document</span>
      </button>
      {isOpen && (
        <div className="post-document-modal" role="presentation" onClick={() => setIsOpen(false)}>
          <div className="post-document-modal-content" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
            <button className="post-document-modal-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close">×</button>
            {previewFailed ? <iframe className="post-document-fallback" src={url} title={title} /> : <PdfPreview url={url} title={title} onError={() => setPreviewFailed(true)} />}
          </div>
        </div>
      )}
    </>
  )
}

function PdfPreview({ url, title, onError }) {
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let loadingTask

    const renderPdf = async () => {
      const container = containerRef.current
      if (!container) return
      container.replaceChildren()

      try {
        loadingTask = pdfjsLib.getDocument(url)
        const pdf = await loadingTask.promise

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return
          const page = await pdf.getPage(pageNumber)
          const baseViewport = page.getViewport({ scale: 1 })
          const scale = Math.min(1.8, (container.clientWidth - 24) / baseViewport.width)
          const viewport = page.getViewport({ scale })
          const canvas = document.createElement('canvas')
          canvas.className = 'post-pdf-page'
          canvas.width = viewport.width
          canvas.height = viewport.height
          container.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        }
      } catch {
        if (!cancelled) onError?.()
      }
    }

    renderPdf()
    return () => {
      cancelled = true
      loadingTask?.destroy()
    }
  }, [url])

  return <div ref={containerRef} className="post-document-preview" aria-label={title} />
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

function isDocumentMedia(post) {
  const mediaType = String(post.mediaType || '').toLowerCase().replace(/[-_\s]/g, '')
  return ['document', 'file', 'pdf'].includes(mediaType)
}

function getDocumentThumbnail(post) {
  return post.thumbnail || post.thumbnailUrl || post.mediaThumbnail || post.documentThumbnail || ''
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
