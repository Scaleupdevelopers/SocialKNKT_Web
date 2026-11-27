import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { completeProfile, uploadFile } from '../../action/action'
import './Pronunciation.css'

const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop())
const extensionFor = (mime) =>
  ({ 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' })[mime.split(';')[0]] || 'webm'

export function PronunciationRecorder({
  value = '',
  onChange,
  onBusy,
  onPending,
  disabled = false,
}) {
  const root = useRef(null)
  const active = useRef(null)
  const callbacks = useRef({ onChange, onBusy, onPending })
  useLayoutEffect(() => {
    callbacks.current = { onChange, onBusy, onPending }
  }, [onChange, onBusy, onPending])
  const [phase, setPhase] = useState('idle')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const supported =
    typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)

  useEffect(() => {
    const session = {
      phase: 'idle',
      blob: null,
      url: '',
      stream: null,
      recorder: null,
      timer: null,
    }
    active.current = session
    // The editor disables its fieldset during upload, so recording stays interactive.
    // Capture submit here to block saves until the local recording is uploaded.
    const form = root.current?.closest('form')
    const guard = (event) => {
      if (session.phase === 'idle') return
      event.preventDefault()
      event.stopImmediatePropagation()
      setError('Finish recording and upload your audio before saving.')
    }
    form?.addEventListener('submit', guard, true)
    return () => {
      active.current = null
      clearTimeout(session.timer)
      if (session.recorder) {
        session.recorder.ondataavailable = null
        session.recorder.onstop = null
        session.recorder.onerror = null
        if (session.recorder.state !== 'inactive') session.recorder.stop()
      }
      stopTracks(session.stream)
      if (session.url) URL.revokeObjectURL(session.url)
      form?.removeEventListener('submit', guard, true)
    }
  }, [])

  const transition = (session, next) => {
    session.phase = next
    setPhase(next)
    callbacks.current.onPending?.(next !== 'idle')
    callbacks.current.onBusy?.(next === 'uploading')
  }

  const upload = async (session) => {
    if (session.phase === 'uploading') return
    transition(session, 'uploading')
    setError('')
    try {
      const url = await uploadFile(
        session.blob,
        extensionFor(session.blob.type),
        session.blob.type,
      )
      if (active.current !== session) return
      if (!/^https?:\/\//i.test(url)) throw new Error('Invalid audio URL')
      session.blob = null
      callbacks.current.onChange(url)
      transition(session, 'idle')
    } catch {
      if (active.current !== session) return
      setError('Unable to upload recording. Retry upload or record again.')
      transition(session, 'failed')
    }
  }

  const finish = (session, chunks, mime) => {
    clearTimeout(session.timer)
    stopTracks(session.stream)
    if (active.current !== session || session.phase === 'idle') return
    const blob = new Blob(chunks, { type: mime })
    if (!blob.size) {
      setError('No audio captured. Please record again.')
      transition(session, session.blob ? 'failed' : 'idle')
      return
    }
    session.blob = blob
    if (session.url) URL.revokeObjectURL(session.url)
    session.url = URL.createObjectURL(blob)
    setPreview(session.url)
    upload(session)
  }

  const stop = () => {
    const session = active.current
    if (session?.phase !== 'recording') return
    transition(session, 'stopping')
    clearTimeout(session.timer)
    session.recorder.stop()
    stopTracks(session.stream)
  }

  const prepare = (session, stream) => {
    session.stream = stream
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) =>
      MediaRecorder.isTypeSupported(type),
    )
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    session.recorder = recorder
    const chunks = []
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.onstop = () => finish(session, chunks, recorder.mimeType)
    recorder.onerror = () => {
      clearTimeout(session.timer)
      stopTracks(stream)
      if (active.current !== session) return
      transition(session, 'idle')
      recorder.onstop = null
      if (recorder.state !== 'inactive') recorder.stop()
      setError('Unable to record audio. Please record again.')
    }
    recorder.start()
    transition(session, 'recording')
    session.timer = setTimeout(stop, 30000)
  }

  const start = async () => {
    const session = active.current
    if (!session || disabled || !['idle', 'failed'].includes(session.phase)) return
    transition(session, 'requesting')
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (active.current !== session) {
        stopTracks(stream)
        return
      }
      prepare(session, stream)
    } catch (failure) {
      if (active.current !== session) return
      stopTracks(session.stream)
      transition(session, session.blob ? 'failed' : 'idle')
      setError(
        failure.name === 'NotAllowedError'
          ? 'Microphone access denied. Allow microphone access and try again, or type your pronunciation.'
          : 'Unable to access the microphone. Check your microphone and try again.',
      )
    }
  }

  return (
    <RecordingControls
      root={root}
      phase={phase}
      preview={preview || value}
      error={error}
      supported={supported}
      disabled={disabled}
      start={start}
      stop={stop}
      retry={() => upload(active.current)}
    />
  )
}

const recordingStatus = {
  requesting: 'Waiting for microphone permission…',
  recording: 'Recording… (up to 30 seconds)',
  uploading: 'Uploading recording…',
}

function RecordingControls({
  root,
  phase,
  preview,
  error,
  supported,
  disabled,
  start,
  stop,
  retry,
}) {
  return (
    <div className="pronunciation-field pronunciation-recorder" ref={root}>
      <span>Record your name</span>
      <div className={`record-box ${phase === 'recording' ? 'recording' : ''}`}>
        <button
          type="button"
          aria-label={phase === 'recording' ? 'Stop recording' : 'Record name'}
          disabled={
            disabled || !supported || ['requesting', 'stopping', 'uploading'].includes(phase)
          }
          onClick={phase === 'recording' ? stop : start}
        >
          <img src="/assets/logo_icons/microphone_icon.svg" alt="" />
          {phase === 'recording' && <span>Stop recording</span>}
        </button>
        <span role="status">{recordingStatus[phase]}</span>
        {preview && <audio controls src={preview} aria-label="Pronunciation preview" />}
      </div>
      <RecordingFeedback
        supported={supported}
        error={error}
        failed={phase === 'failed'}
        disabled={disabled}
        retry={retry}
      />
    </div>
  )
}

function RecordingFeedback({ supported, error, failed, disabled, retry }) {
  return (
    <>
      {!supported && (
        <p role="status">
          Audio recording is not supported in this browser. You can type your pronunciation.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {failed && (
        <button type="button" disabled={disabled} onClick={retry}>
          Retry upload
        </button>
      )}
    </>
  )
}

export function Pronunciation() {
  const navigate = useNavigate()
  const pending = useRef(false)
  const mounted = useRef(false)
  const [phoneticSpelling, setPhoneticSpelling] = useState('')
  const [recordName, setRecordName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [recordingPending, setRecordingPending] = useState(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (pending.current || recordingPending) return
    pending.current = true
    setIsSaving(true)
    try {
      const response = await completeProfile({
        phonetic_spelling: phoneticSpelling,
        record_name: recordName,
        stepCount: 4,
      })
      if (!mounted.current) return
      if (response.status !== true) throw new Error('Save failed')
      navigate('/add-media')
    } catch {
      if (mounted.current) toast.error('Unable to save pronunciation. Please try again.')
    } finally {
      pending.current = false
      if (mounted.current) setIsSaving(false)
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
        <div className="pronunciation-progress">
          <span />
        </div>
        <h1 id="pronunciation-title">Add Name Pronunciation</h1>
        <p className="pronunciation-description">
          Help others say your name right.
          <br />
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

          <PronunciationRecorder
            value={recordName}
            onChange={setRecordName}
            disabled={isSaving}
            onPending={setRecordingPending}
          />

          <button
            className="pronunciation-submit"
            type="submit"
            disabled={isSaving || recordingPending}
          >
            {isSaving ? 'Saving...' : 'Save Pronunciation'}
          </button>
          <button
            className="pronunciation-skip"
            type="button"
            disabled={isSaving}
            onClick={() => navigate('/add-media')}
          >
            Skip for now
          </button>
        </form>
      </section>
    </main>
  )
}
