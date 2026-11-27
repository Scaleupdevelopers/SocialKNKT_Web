import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateBannerImage, updateProfile, uploadFile } from '../../action/action'
import { useProfile } from '../../context/ProfileContext'
import './AddMedia.css'

export function AddMedia() {
  const context = useProfile()
  return (
    <MediaSetup key={context.authToken || context.profile?.id || 'setup'} context={context} />
  )
}

function MediaSetup({ context }) {
  const navigate = useNavigate()
  const { profile, isLoading, refreshProfile, setProfile } = context
  const [photo, setPhoto] = useState(null)
  const [banner, setBanner] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const busy = useRef(false)
  const mounted = useRef(false)
  const uploaded = useRef(new WeakMap())
  const saved = useRef({ photo: null, banner: null })

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  function selectFile(file, change) {
    if (!file || busy.current) return
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Choose a PNG or JPG image up to 10 MB.')
      return
    }
    setError('')
    change(file)
  }

  async function upload(file) {
    if (uploaded.current.has(file)) return uploaded.current.get(file)
    const url = await uploadFile(file)
    uploaded.current.set(file, url)
    return url
  }

  async function savePhoto() {
    if (!photo || saved.current.photo === photo) return
    const image = await upload(photo)
    if (!mounted.current) return
    const response = await updateProfile({
      image,
      bio: profile.bio || '',
      website: profile.website || '',
    })
    if (response.status !== true || !response.data) throw new Error('Photo save failed')
    saved.current.photo = photo
    if (mounted.current) setProfile(response.data)
  }

  async function saveBanner() {
    if (!banner || saved.current.banner === banner) return
    const banner_image = await upload(banner)
    if (!mounted.current) return
    const response = await updateBannerImage(banner_image)
    if (response.status !== true) throw new Error('Banner save failed')
    saved.current.banner = banner
    if (mounted.current) setProfile((current) => ({ ...current, banner_image }))
  }

  async function submit(event) {
    event.preventDefault()
    if (busy.current || !profile) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      await savePhoto()
      if (!mounted.current) return
      await saveBanner()
      if (mounted.current) navigate('/home')
    } catch {
      if (mounted.current)
        setError('Unable to save all photos. Your selections are kept. Continue to retry.')
    } finally {
      busy.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <main className="media-page">
      <header className="media-header">
        <button type="button" disabled={saving} onClick={() => navigate('/home')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>
      <section className="media-card" aria-labelledby="media-title">
        <div className="media-progress">
          <span />
        </div>
        <h1 id="media-title">You’re almost there!</h1>
        <p>Add a few details to finish setting up your account</p>
        {!profile &&
          (isLoading ? (
            <p role="status">Loading profile…</p>
          ) : (
            <p role="alert">
              Unable to load profile.{' '}
              <button type="button" onClick={refreshProfile}>
                Retry
              </button>
            </p>
          ))}
        <form className="media-form" onSubmit={submit}>
          <h2>Profile</h2>
          <div className="profile-media-grid">
            <UploadBox
              label="Profile Picture"
              file={photo}
              disabled={saving}
              onChange={(file) => selectFile(file, setPhoto)}
              small
            />
            <UploadBox
              label="Banner"
              file={banner}
              disabled={saving}
              onChange={(file) => selectFile(file, setBanner)}
            />
          </div>
          <h2>Add Content</h2>
          <UploadBox label="Content photos" disabled />
          <p className="media-content-status">
            Content upload is not available during setup yet. You can continue with your profile
            picture and banner.
          </p>
          {error && <p role="alert">{error}</p>}
          <button className="media-continue" type="submit" disabled={saving || !profile}>
            {saving ? 'Saving…' : 'Continue'}
          </button>
          <button
            className="media-skip"
            type="button"
            disabled={saving}
            onClick={() => navigate('/home')}
          >
            Skip for now
          </button>
        </form>
      </section>
    </main>
  )
}

function UploadBox({ label, file, onChange, disabled = false, small = false }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <label className={'upload-box ' + (small ? 'upload-box-small' : '')}>
      <span>{label}</span>
      <input
        type="file"
        aria-label={label}
        accept="image/png,image/jpeg"
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.files[0])
          event.target.value = ''
        }}
      />
      {preview ? (
        <img className="media-preview" src={preview} alt={file.name} />
      ) : (
        <span className="upload-placeholder">
          <img src="/assets/logo_icons/upload_icon.svg" alt="" />
          <small>png or .jpg formats only</small>
        </span>
      )}
    </label>
  )
}
