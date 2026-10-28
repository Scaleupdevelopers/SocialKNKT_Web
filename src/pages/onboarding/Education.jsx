import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Education.css'

export function Education() {
  const navigate = useNavigate()
  const [hasEducation, setHasEducation] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  return (
    <main className="education-page">
      <header className="education-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="education-card" aria-labelledby="education-title">
        <div className="education-progress"><span /></div>
        <h1 id="education-title">Add Your Education</h1>
        <p className="education-description">
          Show where you’ve studied and grown.<br />
          Add schools, colleges, or courses that shaped your journey.
        </p>

        {!hasEducation ? (
          <form className="education-form" onSubmit={(event) => { event.preventDefault(); setHasEducation(true) }}>
            <div className="education-grid">
              <EducationField label="School / Institution Name" placeholder="Enter your institution name" />
              <EducationField label="Degree / Program" placeholder="Enter your Degree / Program" />
              <EducationField label="Country" placeholder="Select country" />
              <EducationField label="City" placeholder="Select city" />
              <EducationField label="Start Year" placeholder="Year" />
              <EducationField label="End Year" placeholder="Year" />
            </div>

            <label className="education-checkbox">
              <input type="checkbox" />
              I currently studying
            </label>

            <button className="education-primary-button" type="submit">Save Education</button>
            <button className="education-skip-button" type="button" onClick={() => navigate('/')}>
              Skip for now
            </button>
          </form>
        ) : (
          <div className="saved-education">
            <div className="saved-education-heading">
              <span>Education</span>
              <span className="education-actions">
                <button type="button" aria-label="Edit education">
                  <img src="/assets/logo_icons/edit_icon.svg" alt="" />
                </button>
                <button type="button" aria-label="Delete education" onClick={() => setShowDeleteModal(true)}>
                  <img src="/assets/logo_icons/delete_icon.svg" alt="" />
                </button>
              </span>
            </div>
            <div className="saved-education-card">
              National Institute of Design<br />
              Bachelor of Design (B.Des)<br />
              Bangalore, India<br />
              2018–2022
            </div>
            <button className="education-primary-button" type="button" onClick={() => setHasEducation(false)}>
              Add New Education
            </button>
            <button className="education-continue-button" type="button" onClick={() => navigate('/location')}>
              Continue
            </button>
          </div>
        )}
      </section>

      {showDeleteModal && (
        <div className="education-modal-backdrop">
          <div className="education-modal" role="dialog" aria-modal="true" aria-labelledby="delete-education-title">
            <button className="education-modal-close" type="button" aria-label="Close" onClick={() => setShowDeleteModal(false)}>×</button>
            <h2 id="delete-education-title">Delete Education</h2>
            <p>Are you sure you want to delete this education<br />entry?</p>
            <button className="education-delete-button" type="button" onClick={() => { setHasEducation(false); setShowDeleteModal(false) }}>
              Delete Education
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function EducationField({ label, placeholder }) {
  return (
    <label className="education-field">
      <span>{label}</span>
      <input placeholder={placeholder} required />
    </label>
  )
}
