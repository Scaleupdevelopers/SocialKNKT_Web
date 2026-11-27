import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingSkeleton } from '../../../components/common/RequestState'

export function FlicksSection({ flicks, isLoading }) {
  const navigate = useNavigate()
  const [selectedFlick, setSelectedFlick] = useState(null)

  return (
    <>
      <section className="flicks-section">
        <div className="section-heading">
          <h2>Flicks</h2>
          <button type="button" onClick={() => navigate('/flicks')}>
            See All
          </button>
        </div>

        <div className="flicks-grid">
          {isLoading && <LoadingSkeleton label="Loading flicks…" variant="media" count={3} />}

          {!isLoading && flicks.length === 0 && (
            <p className="feed-status">No flicks available yet.</p>
          )}

          {!isLoading &&
            flicks.slice(0, 10).map((flick, index) => (
              <button
                className="flick-card"
                type="button"
                key={flick._id || flick.media || index}
                onClick={() => setSelectedFlick(flick)}
              >
                <img
                  src={flick.thumbnail}
                  alt={`${flick.username || 'User'} flick ${index + 1}`}
                />
              </button>
            ))}
        </div>
      </section>

      {selectedFlick && (
        <div
          className="flick-player-backdrop"
          role="presentation"
          onClick={() => setSelectedFlick(null)}
        >
          <div
            className="flick-player-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Play flick"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="flick-player-close"
              type="button"
              aria-label="Close flick"
              onClick={() => setSelectedFlick(null)}
            >
              ×
            </button>
            <video
              src={selectedFlick.media}
              poster={selectedFlick.thumbnail}
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}
    </>
  )
}
