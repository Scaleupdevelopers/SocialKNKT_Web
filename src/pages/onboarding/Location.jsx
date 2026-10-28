import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Location.css'

export function Location() {
  const navigate = useNavigate()
  const [hasLocation, setHasLocation] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  return (
    <main className="location-page">
      <header className="location-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="location-card" aria-labelledby="location-title">
        <div className="location-progress"><span /></div>
        <h1 id="location-title">Places You’ve Lived</h1>
        <p className="location-description">
          Where have you called home?<br />
          Share cities you’ve lived in to help friends and connections learn more about your journey.
        </p>

        {!hasLocation ? (
          <form className="location-form" onSubmit={(event) => { event.preventDefault(); setHasLocation(true) }}>
            <div className="location-grid">
              <LocationField label="Country" placeholder="Select country" />
              <LocationField label="City" placeholder="Select city" />
              <LocationField label="Start Year" placeholder="Year" />
              <LocationField label="End Year" placeholder="Year" />
            </div>

            <label className="location-checkbox">
              <input type="checkbox" />
              I currently staying
            </label>

            <button className="location-primary-button" type="submit">Save Location</button>
            <button className="location-skip-button" type="button" onClick={() => navigate('/')}>
              Skip for now
            </button>
          </form>
        ) : (
          <div className="saved-location">
            <div className="saved-location-heading">
              <span>Location</span>
              <span className="location-actions">
                <button type="button" aria-label="Edit location">
                  <img src="/assets/logo_icons/edit_icon.svg" alt="" />
                </button>
                <button type="button" aria-label="Delete location" onClick={() => setShowDeleteModal(true)}>
                  <img src="/assets/logo_icons/delete_icon.svg" alt="" />
                </button>
              </span>
            </div>
            <div className="saved-location-card">
              Bangalore, India<br />
              2018–2022
            </div>
            <button className="location-primary-button" type="button" onClick={() => setHasLocation(false)}>
              Add New Location
            </button>
            <button className="location-continue-button" type="button" onClick={() => navigate('/pronunciation')}>
              Continue
            </button>
          </div>
        )}
      </section>

      {showDeleteModal && (
        <div className="location-modal-backdrop">
          <div className="location-modal" role="dialog" aria-modal="true" aria-labelledby="delete-location-title">
            <button className="location-modal-close" type="button" aria-label="Close" onClick={() => setShowDeleteModal(false)}>×</button>
            <h2 id="delete-location-title">Delete Location</h2>
            <p>Are you sure you want to remove this place from<br />your profile?</p>
            <button className="location-delete-button" type="button" onClick={() => { setHasLocation(false); setShowDeleteModal(false) }}>
              Delete Location
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function LocationField({ label, placeholder }) {
  return (
    <label className="location-field">
      <span>{label}</span>
      <input placeholder={placeholder} required />
    </label>
  )
}
