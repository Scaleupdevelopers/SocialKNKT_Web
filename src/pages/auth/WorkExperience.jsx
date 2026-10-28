import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function WorkExperience() {
  const navigate = useNavigate()
  const [hasExperience, setHasExperience] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setHasExperience(true)
  }

  return (
    <main className="work-page">
      <header className="work-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo-transparent.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="work-card" aria-labelledby="work-title">
        <div className="progress-track"><span /></div>
        <h1 id="work-title">Add your Work Experience</h1>
        <p className="work-description">
          Show what you do and where you shine.<br />
          Highlight your current role or past jobs to help others connect with your professional side.
        </p>

        {!hasExperience ? (
          <form className="work-form" onSubmit={handleSubmit}>
            <div className="work-grid">
              <Field label="Job Title" placeholder="Enter your Job Title" />
              <Field label="Company Name" placeholder="Enter your company name" />
              <Field label="Country" placeholder="Select country" />
              <Field label="City" placeholder="Select city" />
              <Field label="Employment Type" placeholder="Select your Employment Type" />
            </div>

            <div className="date-grid">
              <DateGroup label="Start Date" />
              <DateGroup label="End Date" />
            </div>

            <label className="work-checkbox">
              <input type="checkbox" />
              I currently work here
            </label>

            <button className="work-primary-button" type="submit">Add Work Experience</button>
            <button className="skip-button" type="button" onClick={() => navigate('/')}>
              Skip for now
            </button>
          </form>
        ) : (
          <div className="saved-work">
            <div className="saved-work-heading">
              <span>Work Experience</span>
              <span>✎ &nbsp;▥</span>
            </div>
            <div className="saved-work-card">
              Product Designer<br />
              WaveStudio, Full-time<br />
              Bangalore, India<br />
              March 2022, Present
            </div>
            <button className="work-primary-button" type="button" onClick={() => setHasExperience(false)}>
              Add New Work Experience
            </button>
            <button className="continue-button" type="button" onClick={() => navigate('/')}>
              Continue
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

function Field({ label, placeholder }) {
  return (
    <label className="work-field">
      <span>{label}</span>
      <input placeholder={placeholder} required />
    </label>
  )
}

function DateGroup({ label }) {
  return (
    <fieldset className="date-group">
      <legend>{label}</legend>
      <div>
        <input placeholder="Date" />
        <input placeholder="Month" />
        <input placeholder="Year" />
      </div>
    </fieldset>
  )
}
