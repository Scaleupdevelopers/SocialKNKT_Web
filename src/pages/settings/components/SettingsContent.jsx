import { LoadingSkeleton } from '../../../components/common/RequestState'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  blockUser,
  deleteAccount,
  getBlockedUsers,
  updateAccountStatus,
  updatePassword,
  updateProfessionalStatus,
} from '../../../action/action'
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
                  setProfile((current) =>
                    current ? { ...current, isProfessional: nextValue } : current,
                  )
                } catch (error) {
                  setIsProfessional(!nextValue)
                  toast.error(error.message || 'Unable to update professional status.')
                } finally {
                  setIsProfessionalUpdating(false)
                }
              }}
            />
          </div>

          <SettingsMenuSections activeSection={activeSection} onSelect={setActiveSection} />

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
                    setProfile((current) => (current ? { ...current, profileType } : current))
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
        ) : activeSection === 'password' ? (
          <ChangePasswordForm />
        ) : (
          <BlockList />
        )}
      </div>

      {isDeleteOpen && (
        <DeleteAccountModal
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={() => navigate('/signin')}
        />
      )}
    </div>
  )
}

function SettingsMenuSections({ activeSection, onSelect }) {
  return [
    ['privacy', 'Account Privacy'],
    ['block-list', 'Block List'],
    ['password', 'Change password'],
  ].map(([section, label]) => (
    <button
      key={section}
      className={activeSection === section ? 'active' : ''}
      type="button"
      onClick={() => onSelect(section)}
    >
      {label}
      {activeSection === section && <span>‹</span>}
    </button>
  ))
}

function BlockList() {
  const [blockedUsers, setBlockedUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [unblockingId, setUnblockingId] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true
    getBlockedUsers()
      .then((response) => {
        const users = Array.isArray(response.data) ? response.data : []
        if (isMounted) setBlockedUsers(users.filter((user) => user && (user.id || user._id)))
      })
      .catch(() => {
        if (isMounted) setLoadError(true)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [retryCount])

  const handleUnblock = async (user) => {
    const userId = user.id || user._id
    if (!userId || unblockingId) return
    setUnblockingId(userId)
    try {
      await blockUser(userId, false)
      setBlockedUsers((current) => current.filter((item) => (item.id || item._id) !== userId))
      toast.success('User unblocked successfully.')
    } catch (error) {
      toast.error(error.message || 'Unable to unblock user.')
    } finally {
      setUnblockingId(null)
    }
  }

  return (
    <section className="privacy-settings block-list-section">
      <h3>Block List</h3>
      {isLoading ? (
        <LoadingSkeleton label="Loading blocked users…" variant="rows" count={3} />
      ) : loadError ? (
        <div role="alert">
          <p className="block-list-status">Unable to load block list. Please try again.</p>
          <button
            className="community-gradient-button settings-password-submit"
            type="button"
            onClick={() => {
              setIsLoading(true)
              setLoadError(false)
              setRetryCount((count) => count + 1)
            }}
          >
            Retry
          </button>
        </div>
      ) : blockedUsers.length === 0 ? (
        <p className="block-list-status">No blocked users.</p>
      ) : (
        <div className="blocked-users-list">
          {blockedUsers.map((user) => {
            const userId = user.id || user._id
            const name =
              `${user.fname || ''} ${user.lname || ''}`.trim() ||
              user.username ||
              'Unknown user'
            return (
              <div className="blocked-user-row" key={userId}>
                <img src={user.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
                <div className="blocked-user-details">
                  <strong>{name}</strong>
                  <span>@{user.username || 'user'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(user)}
                  disabled={unblockingId === userId}
                >
                  {unblockingId === userId ? 'Unblocking...' : 'Unblock'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
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
        <button
          className="delete-account-close"
          type="button"
          aria-label="Close delete account modal"
          onClick={onClose}
        >
          ×
        </button>
        <h2 id="delete-account-title">Delete Account</h2>
        <p>Are you sure you want to delete your KNKT account?</p>
        <p>
          Once you confirm, your account and associated data will be permanently deleted
          immediately. This action cannot be undone, and your account cannot be recovered.
        </p>
        <button
          className="delete-account-button"
          type="button"
          disabled={isDeleting}
          onClick={async () => {
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
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </section>
    </div>
  )
}

function passwordChangeErrors(values) {
  const errors = {}
  if (!values.oldPassword) errors.oldPassword = 'Old password is required.'
  if (!values.newPassword) errors.newPassword = 'New password is required.'
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm password is required.'
  if (
    values.newPassword &&
    values.confirmPassword &&
    values.newPassword !== values.confirmPassword
  )
    errors.confirmPassword = 'Passwords do not match.'
  return errors
}

function ChangePasswordForm() {
  const [values, setValues] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = passwordChangeErrors(values)
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
        <PasswordField
          label="Old Password"
          placeholder="Enter Old Password"
          info="Your current password is required."
          value={values.oldPassword}
          error={errors.oldPassword}
          onChange={(value) => updateValue('oldPassword', value)}
        />
        <PasswordField
          label="New Password"
          placeholder="Enter New Password"
          info="Use at least 8 characters with a number and symbol."
          value={values.newPassword}
          error={errors.newPassword}
          onChange={(value) => updateValue('newPassword', value)}
        />
        <PasswordField
          label="Confirm Password"
          placeholder="Re-enter New Password"
          info="Enter the same new password again."
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(value) => updateValue('confirmPassword', value)}
        />
        <button
          className="community-gradient-button settings-password-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Change Password'}
        </button>
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
        <button
          type="button"
          className="password-info-button"
          aria-label={`Show information about ${label}`}
          onClick={() => setIsInfoOpen(!isInfoOpen)}
        >
          i
        </button>
        {isInfoOpen && <span className="password-info-popover">{info}</span>}
      </span>
      <span className="settings-password-input">
        <input
          type={isVisible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          aria-label={`Toggle ${label} visibility`}
          onClick={() => setIsVisible(!isVisible)}
        >
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
