import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getSavedPosts,
  recordPostShare,
  recordPostViews,
  deletePost,
  getFlicks,
  savePost,
  updatePostLike,
} from '../../action/action'
import { mergeResults, postLink, readAuth } from '../../utils/helper'
import { toast } from 'react-toastify'

import { ReportPostModal } from '../../components/modals/ReportPostModal/ReportPostModal'
import { useProfile } from '../../context/ProfileContext'

import { Header } from '../../layouts/Header'
import { AutoLoadMore, LoadingSkeleton } from '../../components/common/RequestState'
import './Flicks.css'
import { CommentsModal } from '../../components/modals/CommentsModal/CommentsModal'

export function Flicks() {
  const [params] = useSearchParams()
  const saved = params.get('saved') === 'true'
  return <FlickFeed key={String(saved)} saved={saved} />
}

function FlickFeed({ saved }) {
  const [flicks, setFlicks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [savedFlickIds, setSavedFlickIds] = useState(() => new Set())
  const [savingFlickIds, setSavingFlickIds] = useState(() => new Set())
  const feedRef = useRef(null)
  const isWheelAnimating = useRef(false)
  const wheelUnlockTimer = useRef(null)
  const active = useRef(false)
  const busy = useRef(false)
  const generation = useRef(0)
  const viewed = useRef(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const loadPage = useCallback(
    async (nextPage) => {
      if (busy.current) return
      const requestGeneration = generation.current
      const isCurrent = () => active.current && requestGeneration === generation.current
      busy.current = true
      setLoadingMore(true)
      setLoadError(false)
      try {
        const { rows, next } = await readFlickPage(saved, nextPage)
        if (!isCurrent()) return
        setFlicks((current) => mergeResults(current, next))
        setSavedFlickIds(
          (current) =>
            new Set([
              ...current,
              ...next
                .filter((item) => saved || item.isSaved)
                .map((item) => item._id || item.id),
            ]),
        )
        setPage(nextPage + 1)
        // Saved records can reference deleted posts; only an empty response ends pagination.
        setHasMore(saved ? rows.length > 0 : rows.length >= 10)
      } catch {
        if (isCurrent()) setLoadError(true)
      } finally {
        if (isCurrent()) {
          busy.current = false
          setIsLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [saved],
  )

  const removeFlick = (flickId) => {
    generation.current++
    busy.current = false
    setFlicks((current) =>
      current.filter((item) => String(item._id || item.id) !== String(flickId)),
    )
    // Offset pages shift after deletion. Re-read from page zero on the next load.
    setPage(0)
    setHasMore(true)
    setLoadingMore(false)
    setLoadError(false)
  }

  const handleFeedWheel = (event) => {
    const feed = feedRef.current

    if (!feed || Math.abs(event.deltaY) < 8 || isWheelAnimating.current) {
      return
    }

    const direction = event.deltaY > 0 ? 1 : -1
    const pageHeight = feed.clientHeight
    const currentPage = Math.round(feed.scrollTop / pageHeight)
    const nextPage = Math.max(0, Math.min(flicks.length - 1, currentPage + direction))

    if (nextPage === currentPage) {
      return
    }

    event.preventDefault()
    isWheelAnimating.current = true
    feed.scrollTo({
      top: nextPage * pageHeight,
      behavior: 'smooth',
    })

    window.clearTimeout(wheelUnlockTimer.current)
    wheelUnlockTimer.current = window.setTimeout(() => {
      isWheelAnimating.current = false
    }, 700)
  }

  useEffect(() => () => window.clearTimeout(wheelUnlockTimer.current), [])

  const toggleSavedFlick = async (flickId) => {
    if (savingFlickIds.has(flickId) || savedFlickIds.has(flickId)) return
    const flick = flicks.find(
      (item, index) => (item._id || item.id || item.media || index) === flickId,
    )
    const postId = flick?._id || flick?.id
    if (!postId) return

    setSavingFlickIds((currentIds) => new Set(currentIds).add(flickId))
    try {
      await savePost(postId)
      setSavedFlickIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.add(flickId)
        return nextIds
      })
    } catch {
      toast.error('Unable to save flick. Please try again.')
    } finally {
      setSavingFlickIds((currentIds) => {
        const nextIds = new Set(currentIds)
        nextIds.delete(flickId)
        return nextIds
      })
    }
  }

  useEffect(() => {
    const videos = feedRef.current?.querySelectorAll('video')

    if (!videos?.length) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleIds = []
        entries.forEach((entry) => {
          const video = entry.target

          if (entry.isIntersecting) {
            video.play().catch(() => {})
            const id = video.dataset.postId
            if (id && !viewed.current.has(id)) {
              viewed.current.add(id)
              visibleIds.push(id)
            }
          } else {
            video.pause()
          }
        })
        if (visibleIds.length) {
          recordPostViews(visibleIds).catch(() => {
            visibleIds.forEach((id) => viewed.current.delete(id))
          })
        }
      },
      { threshold: 0.7 },
    )

    videos.forEach((video) => observer.observe(video))

    return () => observer.disconnect()
  }, [flicks])

  useEffect(() => {
    active.current = true
    let cancelled = false
    // Skip the discarded StrictMode setup without disabling its lifecycle checks.
    queueMicrotask(() => {
      if (!cancelled) loadPage(0)
    })
    return () => {
      cancelled = true
      active.current = false
      generation.current++
      busy.current = false
    }
  }, [loadPage])

  return (
    <main className="flicks-page">
      <Header />
      {saved && <Link to="/flicks">All Flicks</Link>}
      <section
        ref={feedRef}
        className="flicks-feed"
        aria-label={saved ? 'Saved Flicks' : 'Flicks feed'}
        onWheel={handleFeedWheel}
      >
        <FlickFeedStart
          isLoading={isLoading}
          loadError={loadError}
          count={flicks.length}
          saved={saved}
        />

        {!isLoading &&
          flicks.map((flick, index) => {
            const flickId = flick._id || flick.id || flick.media || index
            const isSaved = savedFlickIds.has(flickId)

            return (
              <FlickCard
                key={flickId}
                flick={flick}
                isSaved={isSaved}
                isSaving={savingFlickIds.has(flickId)}
                onToggleSaved={() => toggleSavedFlick(flickId)}
                onDeleted={() => removeFlick(flickId)}
              />
            )
          })}
        <FlickFeedFeedback
          isLoading={isLoading}
          loadingMore={loadingMore}
          loadError={loadError}
          hasMore={hasMore}
          onLoad={() => loadPage(page)}
        />
      </section>
    </main>
  )
}

function FlickFeedFeedback({ isLoading, loadingMore, loadError, hasMore, onLoad }) {
  return (
    <>
      {loadError && (
        <p role="alert">
          Unable to load flicks. <button onClick={onLoad}>Retry</button>
        </p>
      )}
      {!isLoading && loadingMore && (
        <LoadingSkeleton label="Loading more flicks…" variant="media" count={1} />
      )}
      <AutoLoadMore
        hasMore={hasMore}
        loading={isLoading || loadingMore}
        error={loadError}
        onLoadMore={onLoad}
        label="Flicks pagination"
      />
    </>
  )
}

function FlickFeedStart({ isLoading, loadError, count, saved }) {
  if (isLoading) {
    return (
      <article className="flick-feed-card flick-feed-skeleton" aria-label="Loading flick">
        <div className="flick-skeleton-details">
          <span className="flick-skeleton-avatar" />
          <span className="flick-skeleton-line flick-skeleton-name" />
          <span className="flick-skeleton-line flick-skeleton-description" />
        </div>
      </article>
    )
  }
  if (loadError || count > 0) return null
  return (
    <p className="flicks-status">
      {saved ? 'No saved flicks on this page.' : 'No flicks available yet.'}
    </p>
  )
}

function FlickCard({ flick, isSaved, isSaving, onToggleSaved, onDeleted }) {
  const { profile } = useProfile()
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const initial = initialFlickState(flick)
  const [commentCount, setCommentCount] = useState(initial.commentCount)
  const deleting = useRef(false)
  const liking = useRef(false)
  const isOwnFlick = ownsFlick(profile, flick)
  const [isLiked, setIsLiked] = useState(initial.isLiked)
  const [likeCount, setLikeCount] = useState(initial.likeCount)

  const handleLike = async () => {
    const postId = flick._id || flick.id
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

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  const shareUrl = postLink(flick._id || flick.id)
  const shareText = flickShareText(flick, shareUrl)
  const shared = useRef(initial.isShared)
  const recordShare = () => {
    if (shared.current) return
    shared.current = true
    recordPostShare(flick._id || flick.id).catch(() => {
      shared.current = false
    })
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Social Knkt Flick', text: shareText, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setIsShareOpen(false)
      }
      recordShare()
    } catch (error) {
      if (error.name !== 'AbortError') toast.error('Unable to share flick. Try Copy Link.')
    }
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      recordShare()
      setIsShareOpen(false)
      toast.success('Link copied.')
    } catch {
      toast.error('Unable to copy link. Check clipboard permissions and retry.')
    }
  }

  const handleDelete = async () => {
    const postId = flick._id || flick.id
    if (!postId || deleting.current) return
    deleting.current = true
    setIsDeleting(true)
    try {
      await deletePost(postId)
      setIsDeleteOpen(false)
      setIsOptionsOpen(false)
      onDeleted()
    } catch {
      toast.error('Unable to delete flick. Please try again.')
    } finally {
      deleting.current = false
      setIsDeleting(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const playback = { videoRef, isPlaying, isMuted, togglePlayback, toggleMute, setIsPlaying }
  const actions = {
    isLiked,
    likeCount,
    commentCount,
    handleLike,
    isSaved,
    isSaving,
    onToggleSaved,
    isOptionsOpen,
    isOwnFlick,
    setIsOptionsOpen,
    setIsCommentsOpen,
    setIsShareOpen,
    setIsDeleteOpen,
    setIsReportOpen,
  }
  const dialogs = {
    isShareOpen,
    setIsShareOpen,
    handleShare,
    copyShareLink,
    isReportOpen,
    setIsReportOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    isDeleting,
    handleDelete,
    isCommentsOpen,
    setIsCommentsOpen,
    setCommentCount,
  }
  return (
    <article className="flick-feed-card">
      <FlickVideo flick={flick} {...playback} />
      <FlickDetails flick={flick} />
      <FlickActions {...actions} />
      <FlickDialogs flick={flick} {...dialogs} />
    </article>
  )
}

async function readFlickPage(saved, page) {
  const response = await (saved ? getSavedPosts(page, 10) : getFlicks(page, 10))
  const rows = response.data || []
  return { rows, next: saved ? rows.filter((item) => item.mediaType === 'flicks') : rows }
}

function entityId(entity) {
  return entity?._id || entity?.id
}

function viewerId(profile, authData) {
  return (
    entityId(profile) || profile?.userId || entityId(authData?.user) || entityId(authData?.data)
  )
}

function ownerId(flick) {
  return (
    flick.userId ||
    entityId(flick.user) ||
    flick.ownerId ||
    entityId(flick.owner) ||
    entityId(flick.createdBy)
  )
}

function ownsFlick(profile, flick) {
  const currentUserId = viewerId(profile, readAuth())
  const flickOwnerId = ownerId(flick)
  return Boolean(
    currentUserId && flickOwnerId && String(flickOwnerId) === String(currentUserId),
  )
}

function initialFlickState(flick) {
  return {
    commentCount: Number(flick.commentCount || 0),
    isLiked: Boolean(flick.isLiked ?? flick.liked ?? flick.likeStatus),
    likeCount: Number(flick.likeCount ?? flick.likes ?? 0),
    isShared: Boolean(flick.isShared || flick.isshared),
  }
}

function flickShareText(flick, shareUrl) {
  return `📢 Social Knkt Flick\n${flick.description || ''}\n${shareUrl}`
}

function FlickVideo({
  flick,
  videoRef,
  isPlaying,
  isMuted,
  togglePlayback,
  toggleMute,
  setIsPlaying,
}) {
  return (
    <>
      <video
        ref={videoRef}
        data-post-id={entityId(flick)}
        src={flick.media}
        poster={flick.thumbnail}
        autoPlay
        muted={isMuted}
        playsInline
        preload="metadata"
        onClick={togglePlayback}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <div className="flick-video-controls" aria-label="Video controls">
        <button
          type="button"
          aria-label={isPlaying ? 'Pause flick' : 'Play flick'}
          onClick={togglePlayback}
        >
          {isPlaying ? (
            <img src="/assets/logo_icons/play_icon.svg" alt="" />
          ) : (
            <span aria-hidden="true">▶</span>
          )}
        </button>
        <button
          className={isMuted ? 'is-muted' : ''}
          type="button"
          aria-label={isMuted ? 'Unmute flick' : 'Mute flick'}
          aria-pressed={isMuted}
          onClick={toggleMute}
        >
          <img src="/assets/logo_icons/sound_icon.svg" alt="" />
        </button>
      </div>
    </>
  )
}

function FlickDetails({ flick }) {
  return (
    <div className="flick-feed-details">
      <div className="flick-feed-user">
        <img
          src={flick.userImage || flick.image || '/assets/logo_icons/profile_avatar.png'}
          alt=""
        />
        <strong>{flick.username || flick.userName || 'your.name'}</strong>
      </div>
      <p>{flick.description || ''}</p>
    </div>
  )
}

function FlickActions(actions) {
  return (
    <div className="flick-feed-actions">
      <FlickLikeButton
        isLiked={actions.isLiked}
        count={actions.likeCount}
        onClick={actions.handleLike}
      />
      <button
        type="button"
        aria-label="Comments"
        onClick={() => actions.setIsCommentsOpen(true)}
      >
        <img src="/assets/logo_icons/comment.svg" alt="" />
        <span>{actions.commentCount}</span>
      </button>
      <button
        type="button"
        aria-label="Share flick"
        onClick={() => actions.setIsShareOpen(true)}
      >
        <img src="/assets/logo_icons/share_icon.svg" alt="" />
      </button>
      <FlickSaveButton
        isSaved={actions.isSaved}
        isSaving={actions.isSaving}
        onClick={actions.onToggleSaved}
      />
      <button
        type="button"
        aria-label="More"
        onClick={() => actions.setIsOptionsOpen((value) => !value)}
      >
        ⋮
      </button>
      {actions.isOptionsOpen && <FlickOptions actions={actions} />}
    </div>
  )
}

function FlickLikeButton({ isLiked, count, onClick }) {
  return (
    <button
      type="button"
      className={isLiked ? 'is-liked' : ''}
      aria-label={isLiked ? 'Unlike' : 'Like'}
      aria-pressed={isLiked}
      onClick={onClick}
    >
      <img
        src={isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'}
        alt=""
      />
      <span>{count}</span>
    </button>
  )
}

function FlickSaveButton({ isSaved, isSaving, onClick }) {
  return (
    <button
      type="button"
      aria-label={isSaved ? 'Saved' : 'Save flick'}
      onClick={onClick}
      disabled={isSaving || isSaved}
    >
      <img
        src={isSaved ? '/assets/logo_icons/saveIcon.svg' : '/assets/logo_icons/unsaved.svg'}
        alt=""
      />
    </button>
  )
}

function FlickOptions({ actions }) {
  const open = () => {
    actions.setIsOptionsOpen(false)
    if (actions.isOwnFlick) actions.setIsDeleteOpen(true)
    else actions.setIsReportOpen(true)
  }
  return (
    <div className="flick-options-menu">
      <button type="button" onClick={open}>
        <img
          src={
            actions.isOwnFlick
              ? '/assets/logo_icons/red_delete_icon.svg'
              : '/assets/logo_icons/report.svg'
          }
          alt=""
        />
        {actions.isOwnFlick ? 'Delete' : 'Report'}
      </button>
    </div>
  )
}

function FlickDialogs(dialogs) {
  return (
    <>
      {dialogs.isShareOpen && (
        <FlickShareDialog
          onClose={() => dialogs.setIsShareOpen(false)}
          onShare={dialogs.handleShare}
          onCopy={dialogs.copyShareLink}
        />
      )}
      {dialogs.isReportOpen && (
        <ReportPostModal
          postId={entityId(dialogs.flick)}
          onClose={() => dialogs.setIsReportOpen(false)}
          contentLabel="Flick"
        />
      )}
      {dialogs.isDeleteOpen && (
        <FlickDeleteDialog
          isDeleting={dialogs.isDeleting}
          onClose={() => dialogs.setIsDeleteOpen(false)}
          onDelete={dialogs.handleDelete}
        />
      )}
      {dialogs.isCommentsOpen && (
        <CommentsModal
          post={dialogs.flick}
          postOwnerId={ownerId(dialogs.flick)}
          onClose={() => dialogs.setIsCommentsOpen(false)}
          onCommentCountChange={(change) =>
            dialogs.setCommentCount((count) => Math.max(0, count + change))
          }
        />
      )}
    </>
  )
}

function FlickShareDialog({ onClose, onShare, onCopy }) {
  return (
    <div className="flick-share-backdrop" role="presentation" onClick={onClose}>
      <div
        className="flick-share-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="flick-share-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <h2>Share Flick</h2>
        <button className="flick-share-action" type="button" onClick={onShare}>
          Share
        </button>
        <button className="flick-share-action" type="button" onClick={onCopy}>
          Copy Link
        </button>
      </div>
    </div>
  )
}

function FlickDeleteDialog({ isDeleting, onClose, onDelete }) {
  return (
    <div
      className="flick-delete-backdrop"
      role="presentation"
      onClick={() => !isDeleting && onClose()}
    >
      <div
        className="flick-delete-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Delete Flick</h2>
        <p>Are you sure you want to delete this flick?</p>
        <div>
          <button type="button" onClick={onClose} disabled={isDeleting}>
            No
          </button>
          <button type="button" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
