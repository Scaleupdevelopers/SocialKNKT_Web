import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { deletePost, getFlicks, savePost, updatePostLike } from '../../action/action'
import { ReportPostModal } from '../../components/modals/ReportPostModal/ReportPostModal'
import { useProfile } from '../../context/ProfileContext'
import { AUTH_STORAGE_KEY } from '../../utils/helper'
import { Header } from '../../layouts/Header'
import './Flicks.css'
import { CommentsModal } from '../../components/modals/CommentsModal/CommentsModal'

export function Flicks() {
  const [flicks, setFlicks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [savedFlickIds, setSavedFlickIds] = useState(() => new Set())
  const [savingFlickIds, setSavingFlickIds] = useState(() => new Set())
  const feedRef = useRef(null)
  const isWheelAnimating = useRef(false)
  const wheelUnlockTimer = useRef(null)

  const handleFeedWheel = (event) => {
    const feed = feedRef.current

    if (!feed || Math.abs(event.deltaY) < 8 || isWheelAnimating.current) {
      return
    }

    event.preventDefault()

    const direction = event.deltaY > 0 ? 1 : -1
    const pageHeight = feed.clientHeight
    const currentPage = Math.round(feed.scrollTop / pageHeight)
    const nextPage = Math.max(0, Math.min(flicks.length - 1, currentPage + direction))

    if (nextPage === currentPage) {
      return
    }

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
    const flick = flicks.find((item, index) => (item._id || item.media || index) === flickId)
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
    } catch (error) {
      toast.error(error.message || 'Unable to save flick.')
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
        entries.forEach((entry) => {
          const video = entry.target

          if (entry.isIntersecting) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.7 },
    )

    videos.forEach((video) => observer.observe(video))

    return () => observer.disconnect()
  }, [flicks])

  useEffect(() => {
    const loadFlicks = async () => {
      try {
        const response = await getFlicks(0, 10)
        const nextFlicks = response.data || []
        setFlicks(nextFlicks)
        setSavedFlickIds(new Set(nextFlicks.reduce((savedIds, flick, index) => {
          if (flick.isSaved === true) savedIds.push(flick._id || flick.media || index)
          return savedIds
        }, [])))
      } catch (error) {
        toast.error(error.message || 'Unable to load flicks.')
      } finally {
        setIsLoading(false)
      }
    }

    loadFlicks()
  }, [])

  return (
    <main className="flicks-page">
      <Header />
      <section ref={feedRef} className="flicks-feed" aria-label="Flicks feed" onWheel={handleFeedWheel}>
        {isLoading && (
          <article className="flick-feed-card flick-feed-skeleton" aria-label="Loading flick">
            <div className="flick-skeleton-details">
              <span className="flick-skeleton-avatar" />
              <span className="flick-skeleton-line flick-skeleton-name" />
              <span className="flick-skeleton-line flick-skeleton-description" />
            </div>
          </article>
        )}

        {!isLoading && flicks.length === 0 && (
          <p className="flicks-status">No flicks available yet.</p>
        )}

        {!isLoading && flicks.map((flick, index) => {
          const flickId = flick._id || flick.media || index
          const isSaved = savedFlickIds.has(flickId)

          return (
            <FlickCard
              key={flickId}
              flick={flick}
              isSaved={isSaved}
              isSaving={savingFlickIds.has(flickId)}
              onToggleSaved={() => toggleSavedFlick(flickId)}
            />
          )
        })}
      </section>
    </main>
  )
}

function FlickCard({ flick, isSaved, isSaving, onToggleSaved }) {
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
  const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
  const currentUserId = profile?.id || authData?.user?.id || authData?.data?.id
  const isOwnFlick = Boolean(currentUserId && (flick.userId || flick.user?.id) === currentUserId)
  const [isLiked, setIsLiked] = useState(Boolean(flick.isLiked ?? flick.liked ?? flick.likeStatus))
  const [likeCount, setLikeCount] = useState(Number(flick.likeCount ?? flick.likes ?? 0))

  const handleLike = async () => {
    const postId = flick._id || flick.id
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

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  const shareUrl = flick.media || flick.thumbnail || ''
  const shareText = `📢 Social Knkt Flick\n${flick.description || ''}\n${shareUrl}`

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Social Knkt Flick', text: shareText, url: shareUrl })
    } else {
      await navigator.clipboard.writeText(shareText)
      setIsShareOpen(false)
    }
  }

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareText)
    setIsShareOpen(false)
  }

  const handleDelete = async () => {
    const postId = flick._id || flick.id
    if (!postId || isDeleting) return
    setIsDeleting(true)
    try {
      await deletePost(postId)
      setIsDeleteOpen(false)
      setIsOptionsOpen(false)
      window.location.reload()
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  return (
    <article className="flick-feed-card">
      <video
        ref={videoRef}
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
        <button type="button" aria-label={isPlaying ? 'Pause flick' : 'Play flick'} onClick={togglePlayback}>
          {isPlaying
            ? <img src="/assets/logo_icons/play_icon.svg" alt="" />
            : <span aria-hidden="true">▶</span>}
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

      <div className="flick-feed-details">
        <div className="flick-feed-user">
          <img src={flick.userImage || flick.image || '/assets/logo_icons/profile_avatar.png'} alt="" />
          <strong>{flick.username || flick.userName || 'your.name'}</strong>
        </div>
        <p>{flick.description || ''}</p>
      </div>
      <div className="flick-feed-actions">
        <button type="button" className={isLiked ? 'is-liked' : ''} aria-label={isLiked ? 'Unlike' : 'Like'} aria-pressed={isLiked} onClick={handleLike}>
          <img src={isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'} alt="" />
          <span>{likeCount}</span>
        </button>
        <button type="button" aria-label="Comments" onClick={() => setIsCommentsOpen(true)}>
          <img src="/assets/logo_icons/comment.svg" alt="" />
          <span>{flick.commentCount || 0}</span>
        </button>
        <button type="button" aria-label="Share flick" onClick={() => setIsShareOpen(true)}>
          <img src="/assets/logo_icons/share_icon.svg" alt="" />
        </button>
        <button type="button" aria-label={isSaved ? 'Saved' : 'Save flick'} onClick={onToggleSaved} disabled={isSaving || isSaved}>
          <img src={isSaved ? '/assets/logo_icons/saveIcon.svg' : '/assets/logo_icons/unsaved.svg'} alt="" />
        </button>
        <button type="button" aria-label="More" onClick={() => setIsOptionsOpen((value) => !value)}>⋮</button>
        {isOptionsOpen && <div className="flick-options-menu"><button type="button" onClick={() => { setIsOptionsOpen(false); setIsReportOpen(true) }}><img src="/assets/logo_icons/report.svg" alt="" />Report</button>{isOwnFlick ? <button type="button" onClick={() => { setIsOptionsOpen(false); setIsDeleteOpen(true) }}><img src="/assets/logo_icons/red_delete_icon.svg" alt="" />Delete</button> : null}</div>}
      </div>
      {isShareOpen && (
        <div className="flick-share-backdrop" role="presentation" onClick={() => setIsShareOpen(false)}>
          <div className="flick-share-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="flick-share-close" type="button" aria-label="Close" onClick={() => setIsShareOpen(false)}>×</button>
            <h2>Share Flick</h2>
            <button className="flick-share-action" type="button" onClick={handleShare}>Share</button>
            <button className="flick-share-action" type="button" onClick={copyShareLink}>Copy Link</button>
          </div>
        </div>
      )}
      {isReportOpen && <ReportPostModal postId={flick._id || flick.id} onClose={() => setIsReportOpen(false)} contentLabel="Flick" />}
      {isDeleteOpen && <div className="flick-delete-backdrop" role="presentation" onClick={() => !isDeleting && setIsDeleteOpen(false)}><div className="flick-delete-modal" role="dialog" onClick={(event) => event.stopPropagation()}><h2>Delete Flick</h2><p>Are you sure you want to delete this flick?</p><div><button type="button" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>No</button><button type="button" onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</button></div></div></div>}
      {isCommentsOpen && <CommentsModal post={flick} onClose={() => setIsCommentsOpen(false)} />}
    </article>
  )
}
