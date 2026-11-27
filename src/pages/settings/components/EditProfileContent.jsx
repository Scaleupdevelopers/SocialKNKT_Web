import { useRef, useState } from 'react'
import { normalizeProfile, useProfile } from '../../../context/ProfileContext'
import { completeProfile, updateProfile } from '../../../action/action'
import { sections, collections, createDraft, buildPayload, validateDraft } from './profileDraft'
import { ProfileFields } from './ProfileFields'
import './ProfileEditor.css'

export function EditProfileContent() {
  const { profile, isLoading, error, refreshProfile, setProfile } = useProfile()
  const [active, setActive] = useState('basic')
  const [busy, setBusy] = useState(false)
  if (!profile && isLoading) return <p role="status">Loading profile…</p>
  if (!profile)
    return (
      <div role="alert">
        Unable to load profile.{' '}
        <button type="button" onClick={() => refreshProfile?.()}>
          Retry
        </button>
      </div>
    )
  return (
    <div className="settings-content profile-editor">
      <h2>Edit Profile</h2>
      {isLoading && <p role="status">Refreshing profile…</p>}
      {!isLoading && error && (
        <div role="alert">
          Unable to refresh profile. Your edits are still available.{' '}
          <button type="button" onClick={() => refreshProfile?.()}>
            Retry
          </button>
        </div>
      )}
      <div className="settings-content-body">
        <nav className="settings-menu edit-profile-menu" aria-label="Edit profile sections">
          {sections.map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={busy}
              aria-current={active === key ? 'page' : undefined}
              className={active === key ? 'active' : ''}
              onClick={() => setActive(key)}
            >
              {label}
              {active === key && <span>‹</span>}
            </button>
          ))}
        </nav>
        <SectionEditor
          key={`${profile.id}-${active}`}
          section={active}
          profile={profile}
          onSaved={setProfile}
          onBusy={setBusy}
        />
      </div>
    </div>
  )
}

function SectionEditor({ section, profile, onSaved, onBusy }) {
  const [draft, setDraft] = useState(() => createDraft(profile, section))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const disabled = saving || uploading
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const changed = JSON.stringify(draft) !== JSON.stringify(createDraft(profile, section))
  const pending = useRef(false)
  const save = async (event) => {
    event.preventDefault()
    if (pending.current) return
    const invalid = validateDraft(section, draft, profile)
    if (invalid) {
      setError(invalid)
      return
    }
    pending.current = true
    setSaving(true)
    onBusy(true)
    setError('')
    setMessage('')
    try {
      const saveProfile = section === 'pronunciation' ? completeProfile : updateProfile
      const response = await saveProfile(buildPayload(section, draft, profile))
      if (response.status !== true || !response.data) throw new Error('Update failed')
      const next = normalizeProfile(response.data)
      onSaved(next)
      setDraft(createDraft(next, section))
      setRevision((value) => value + 1)
      setMessage('Profile saved.')
    } catch {
      setError('Unable to save profile. Check your details and try Save again.')
    } finally {
      pending.current = false
      setSaving(false)
      onBusy(false)
    }
  }
  const cancel = () => {
    setDraft(createDraft(profile, section))
    setRevision((value) => value + 1)
    setError('')
    setMessage('')
  }
  return (
    <section className="privacy-settings edit-profile-details">
      {!collections[section] && <h3>{sections.find(([key]) => key === section)[1]}</h3>}
      <form onSubmit={save}>
        <fieldset className="profile-editor-fields" disabled={disabled}>
          <ProfileFields
            key={revision}
            section={section}
            draft={draft}
            onChange={setDraft}
            onBusy={(value) => {
              setUploading(value)
              onBusy(value)
            }}
            onError={setError}
          />
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        {uploading && <p role="status">Uploading file…</p>}
        {(!collections[section] || changed) && (
          <div className="edit-profile-actions">
            <button type="button" disabled={disabled} onClick={cancel}>
              Cancel
            </button>
            <button className="community-gradient-button" type="submit" disabled={disabled}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
