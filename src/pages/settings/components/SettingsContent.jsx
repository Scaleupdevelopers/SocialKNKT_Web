import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { deleteAccount, updateAccountStatus, updatePassword, updateProfessionalStatus } from '../../../action/action'
import { useProfile } from '../../../context/ProfileContext'

export function SettingsContent() {
  const navigate = useNavigate()
  const { profile, setProfile } = useProfile()
  const [isProfessional, setIsProfessional] = useState(Boolean(profile?.isProfessional))
  const [isProfessionalUpdating, setIsProfessionalUpdating] = useState(false)
  const [isPrivateAccount, setIsPrivateAccount] = useState(profile?.profileType === 2)
  const [isPrivacyUpdating, setIsPrivacyUpdating] = useState(false)
  const [activeSection, setActiveSection] = useState('privacy')
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    if (typeof profile?.isProfessional === 'boolean') setIsProfessional(profile.isProfessional)
    if (typeof profile?.profileType === 'number') setIsPrivateAccount(profile.profileType === 2)
  }, [profile?.isProfessional, profile?.profileType])

  return (
    <div className="settings-content">
      <h2>Settings</h2>

      <div className="settings-content-body">
        <nav className="settings-menu" aria-label="Settings menu">
          <div className="settings-professional-row">
            <span>Professional</span>
            <Toggle
              checked={isProfessional}
              label="Toggle professional mode"
              onChange={async () => {
                if (isProfessionalUpdating) return
                const nextValue = !isProfessional
                setIsProfessional(nextValue)
                setIsProfessionalUpdating(true)
                try {
                  await updateProfessionalStatus(nextValue)
                  setProfile((current) => current ? { ...current, isProfessional: nextValue } : current)
                } catch (error) {
                  setIsProfessional(!nextValue)
                  toast.error(error.message || 'Unable to update professional status.')
                } finally {
                  setIsProfessionalUpdating(false)
                }
              }}
            />
          </div>

          <button
            className={activeSection === 'privacy' ? 'active' : ''}
            type="button"
            onClick={() => setActiveSection('privacy')}
          >
            Account Privacy
            {activeSection === 'privacy' && <span>‹</span>}
          </button>

          <button type="button">Block List</button>

          <button
            className={activeSection === 'password' ? 'active' : ''}
            type="button"
            onClick={() => setActiveSection('password')}
          >
            Change password
            {activeSection === 'password' && <span>‹</span>}
          </button>

          <button className="danger" type="button" onClick={() => setIsDeleteOpen(true)}>
            Delete Account
          </button>
        </nav>

        {activeSection === 'privacy' ? (
          <section className="privacy-settings">
            <h3>Account Privacy</h3>
            <div className="privacy-row">
              <span>Account privacy</span>
              <Toggle
                checked={isPrivateAccount}
                label="Toggle account privacy"
                onChange={async () => {
                  if (isPrivacyUpdating) return
                  const nextValue = !isPrivateAccount
                  setIsPrivateAccount(nextValue)
                  setIsPrivacyUpdating(true)
                  try {
                    const profileType = nextValue ? 2 : 1
                    await updateAccountStatus(profileType)
                    setProfile((current) => current ? { ...current, profileType } : current)
                  } catch (error) {
                    setIsPrivateAccount(!nextValue)
                    toast.error(error.message || 'Unable to update account privacy.')
                  } finally {
                    setIsPrivacyUpdating(false)
                  }
                }}
              />
            </div>
          </section>
        ) : (
          <ChangePasswordForm />
        )}
      </div>

      {isDeleteOpen && <DeleteAccountModal onClose={() => setIsDeleteOpen(false)} onDeleted={() => navigate('/signin')} />}
    </div>
  )
}

function Toggle({ checked, label, onChange }) {
  return (
    <button
      className={`privacy-toggle ${checked ? 'is-on' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={onChange}
    >
      <span />
    </button>
  )
}

function DeleteAccountModal({ onClose, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false)
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="delete-account-backdrop" role="presentation" onClick={handleBackdropClick}>
      <section
        className="delete-account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="delete-account-close" type="button" aria-label="Close delete account modal" onClick={onClose}>
          ×
        </button>
        <h2 id="delete-account-title">Delete Account</h2>
        <p>Are you sure you want to delete your KNKT account?</p>
        <p>
          Once you confirm, your account will be deactivated for 30 days. You can recover your account during this period. After 30 days, your account and associated data will be permanently deleted and cannot be recovered.
        </p>
        <button className="delete-account-button" type="button" disabled={isDeleting} onClick={async () => {
          if (isDeleting) return
          setIsDeleting(true)
          try {
            await deleteAccount()
            localStorage.removeItem('socialknkt_auth')
            toast.success('Account deleted successfully.')
            onDeleted()
          } catch (error) {
            toast.error(error.message || 'Unable to delete account.')
          } finally {
            setIsDeleting(false)
          }
        }}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
      </section>
    </div>
  )
}

function ChangePasswordForm() {
  const [values, setValues] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!values.oldPassword) nextErrors.oldPassword = 'Old password is required.'
    if (!values.newPassword) nextErrors.newPassword = 'New password is required.'
    if (!values.confirmPassword) nextErrors.confirmPassword = 'Confirm password is required.'
    if (values.newPassword && values.confirmPassword && values.newPassword !== values.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      await updatePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword })
      setValues({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setErrors({})
      toast.success('Password changed successfully.')
    } catch (error) {
      toast.error(error.message || 'Unable to change password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="privacy-settings change-password-section">
      <h3>Change Password</h3>
      <form onSubmit={handleSubmit} noValidate>
        <PasswordField label="Old Password" placeholder="Enter Old Password" info="Your current password is required." value={values.oldPassword} error={errors.oldPassword} onChange={(value) => updateValue('oldPassword', value)} />
        <PasswordField label="New Password" placeholder="Enter New Password" info="Use at least 8 characters with a number and symbol." value={values.newPassword} error={errors.newPassword} onChange={(value) => updateValue('newPassword', value)} />
        <PasswordField label="Confirm Password" placeholder="Re-enter New Password" info="Enter the same new password again." value={values.confirmPassword} error={errors.confirmPassword} onChange={(value) => updateValue('confirmPassword', value)} />
        <button className="community-gradient-button settings-password-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Change Password'}</button>
      </form>
    </section>
  )
}

function PasswordField({ label, placeholder, info, value, error, onChange }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  return (
    <label className="settings-password-field">
      <span className="settings-password-label">
        {label}
        <button type="button" className="password-info-button" aria-label={`Show information about ${label}`} onClick={() => setIsInfoOpen(!isInfoOpen)}>i</button>
        {isInfoOpen && <span className="password-info-popover">{info}</span>}
      </span>
      <span className="settings-password-input">
        <input type={isVisible ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
        <button type="button" aria-label={`Toggle ${label} visibility`} onClick={() => setIsVisible(!isVisible)}>
          <EyeIcon hidden={!isVisible} />
        </button>
      </span>
      {error && <small className="settings-field-error">{error}</small>}
    </label>
  )
}

function EyeIcon({ hidden }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {hidden && <path d="M3 3l18 18" />}
    </svg>
  )
}
