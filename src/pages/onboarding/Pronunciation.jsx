import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Pronunciation.css'

export function Pronunciation() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)

  return (
    <main className="pronunciation-page">
      <header className="pronunciation-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="pronunciation-card" aria-labelledby="pronunciation-title">
        <div className="pronunciation-progress"><span /></div>
        <h1 id="pronunciation-title">Add Name Pronunciation</h1>
        <p className="pronunciation-description">
          Help others say your name right.<br />
          Record or type out how it’s pronounced so people can greet you with confidence.
        </p>

        <form className="pronunciation-form" onSubmit={(event) => { event.preventDefault(); navigate('/add-media') }}>
          <label className="pronunciation-field">
            <span>Phonetic Spelling</span>
            <select defaultValue="">
              <option value="" disabled>e.g., Ah-purr-vuh</option>
              <option value="ah-purr-vuh">Ah-purr-vuh</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="pronunciation-field">
            <span>Record your name</span>
            <div className={`record-box ${isRecording ? 'recording' : ''}`}>
              <button type="button" aria-label="Record name" onClick={() => setIsRecording((value) => !value)}>
                <img src="/assets/logo_icons/microphone_icon.svg" alt="" />
              </button>
              {isRecording && <small>Recording...</small>}
            </div>
          </label>

          <button className="pronunciation-submit" type="submit">Save Pronunciation</button>
          <button className="pronunciation-skip" type="button" onClick={() => navigate('/')}>
            Skip for now
          </button>
        </form>
      </section>
    </main>
  )
}
