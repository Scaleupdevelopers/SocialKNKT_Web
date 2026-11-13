import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { getFlicks } from '../../action/action'
import { Header } from '../../layouts/Header'
import './Flicks.css'

export function Flicks() {
  const [flicks, setFlicks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [savedFlickIds, setSavedFlickIds] = useState(() => new Set())
  const feedRef = useRef(null)

  const toggleSavedFlick = (flickId) => {
    setSavedFlickIds((currentIds) => {
      const nextIds = new Set(currentIds)

      if (nextIds.has(flickId)) {
        nextIds.delete(flickId)
      } else {
        nextIds.add(flickId)
      }

      return nextIds
    })
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
        setFlicks(response.data || [])
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
      <section ref={feedRef} className="flicks-feed" aria-label="Flicks feed">
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
          <article className="flick-feed-card" key={flickId}>
            <video
              src={flick.media}
              poster={flick.thumbnail}
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
            <div className="flick-feed-details">
              <div className="flick-feed-user">
                <img src={flick.userImage || flick.image || '/assets/logo_icons/profile_avatar.png'} alt="" />
                <strong>{flick.username || flick.userName || 'your.name'}</strong>
                <button type="button">Follow</button>
              </div>
              <p>{flick.description || ''}</p>
            </div>
            <div className="flick-feed-actions">
              <button type="button" aria-label="Like">
                <img src="/assets/logo_icons/like.svg" alt="" />
                <span>{flick.likeCount || 0}</span>
              </button>
              <button type="button" aria-label="Comments">
                <img src="/assets/logo_icons/comment.svg" alt="" />
                <span>{flick.commentCount || 0}</span>
              </button>
              <button
                type="button"
                aria-label={isSaved ? 'Remove from saved' : 'Save flick'}
                onClick={() => toggleSavedFlick(flickId)}
              >
                <img
                  src={isSaved
                    ? '/assets/logo_icons/saveIcon.svg'
                    : '/assets/logo_icons/unsaved.svg'}
                  alt=""
                />
              </button>
              <button type="button" aria-label="More">⋮</button>
            </div>
          </article>
          )
        })}
      </section>
    </main>
  )
}
