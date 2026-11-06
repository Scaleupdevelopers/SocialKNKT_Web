import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { completeProfile } from '../../action/action'
import './Pronunciation.css'

export function Pronunciation() {
  const navigate = useNavigate()
  const recognitionRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [phoneticSpelling, setPhoneticSpelling] = useState('')
  const [recordName, setRecordName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error('Voice recording is not supported in this browser.')
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => setIsRecording(true)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim()

      setRecordName(transcript)
    }
    recognition.onerror = () => {
      setIsRecording(false)
      toast.error('Unable to record your name. Please try again.')
    }
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)

    try {
      const response = await completeProfile({
        phonetic_spelling: phoneticSpelling,
        record_name: recordName,
        stepCount: 4,
      })

      if (response.status === true) {
        toast.success(response.message || 'Pronunciation saved successfully.')
        navigate('/add-media')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to save pronunciation.')
    } finally {
      setIsSaving(false)
    }
  }

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

        <form className="pronunciation-form" onSubmit={handleSubmit}>
          <label className="pronunciation-field">
            <span>Phonetic Spelling</span>
            <input
              value={phoneticSpelling}
              placeholder="e.g., Ah-purr-vuh"
              onChange={(event) => setPhoneticSpelling(event.target.value)}
            />
          </label>

          <label className="pronunciation-field">
            <span>Record your name</span>
            <div className={`record-box ${isRecording ? 'recording' : ''}`}>
              <button type="button" aria-label="Record name" onClick={toggleRecording}>
                <img src="/assets/logo_icons/microphone_icon.svg" alt="" />
              </button>
              {isRecording && <small>Listening...</small>}
              {!isRecording && recordName && <p className="recorded-name">{recordName}</p>}
            </div>
          </label>

          <button className="pronunciation-submit" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Pronunciation'}
          </button>
          <button className="pronunciation-skip" type="button" onClick={() => navigate('/')}>
            Skip for now
          </button>
        </form>
      </section>
    </main>
  )
}
