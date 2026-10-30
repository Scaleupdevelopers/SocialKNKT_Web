import { useState } from 'react'
import { Header } from '../../layouts/Header'
import './Settings.css'

const profileImage = '/assets/logo_icons/profile_avatar.png'

export function Settings() {
  const [isProfessional, setIsProfessional] = useState(true)
  const [bannerImage, setBannerImage] = useState(null)
  const [activeSection, setActiveSection] = useState('privacy')
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <main className="settings-page">
      <Header />

      <section className="settings-profile-card">
        <div className="settings-cover">
          {bannerImage && <img className="settings-cover-image" src={bannerImage} alt="Profile banner" />}
          <label className="settings-cover-edit" aria-label="Edit cover photo">
            <img src="/assets/logo_icons/edit_icon.svg" alt="" />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) setBannerImage(URL.createObjectURL(file))
              }}
            />
          </label>
        </div>

        <div className="settings-profile-image">
          <img src={profileImage} alt="Dianne Russell" />
        </div>

        <div className="settings-profile-details">
          <div>
            <div className="settings-name-row">
              <h1>Dianne Russell</h1>
              <span>@Diane_R001</span>
            </div>
            <div className="settings-stats">
              <span><strong>2,467</strong> Posts</span>
              <span><strong>1,589</strong> Connections</span>
            </div>
            <h2>UI UX Designer</h2>
            <p className="settings-location">● <span>San Francisco, California</span></p>
          </div>

          <div className="settings-profile-actions">
            <p>Joined March 2025</p>
            <div>
              <button type="button">Edit Profile</button>
              <button className="settings-icon-button" type="button" aria-label="Settings">
                <img src="/assets/logo_icons/setting.svg" alt="" />
              </button>
            </div>
          </div>
        </div>

        <div className="settings-content">
          <h2>Settings</h2>
          <div className="settings-content-body">
            <nav className="settings-menu" aria-label="Settings menu">
              <button className={activeSection === 'privacy' ? 'active' : ''} type="button" onClick={() => setActiveSection('privacy')}>Account Privacy {activeSection === 'privacy' && <span>‹</span>}</button>
              <button type="button">Block List</button>
              <button className={activeSection === 'password' ? 'active' : ''} type="button" onClick={() => setActiveSection('password')}>Change password {activeSection === 'password' && <span>‹</span>}</button>
              <button className="danger" type="button" onClick={() => setIsDeleteOpen(true)}>Delete Account</button>
            </nav>

            {activeSection === 'privacy' ? (
              <section className="privacy-settings">
                <h3>Privacy Settings</h3>
                <div className="privacy-row">
                  <span>Professional</span>
                  <button className={`privacy-toggle ${isProfessional ? 'is-on' : ''}`} type="button" aria-label="Toggle professional privacy" aria-pressed={isProfessional} onClick={() => setIsProfessional(!isProfessional)}><span /></button>
                </div>
              </section>
            ) : (
              <ChangePasswordForm />
            )}
          </div>
        </div>
      </section>

      {isDeleteOpen && <DeleteAccountModal onClose={() => setIsDeleteOpen(false)} />}
    </main>
  )
}

function DeleteAccountModal({ onClose }) {
  return (
    <div className="delete-account-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="delete-account-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title" onClick={(event) => event.stopPropagation()}>
        <button className="delete-account-close" type="button" aria-label="Close delete account modal" onClick={onClose}>×</button>
        <h2 id="delete-account-title">Delete Account</h2>
        <p>Are you sure you want to delete your KNKT account?</p>
        <p>Once you confirm, your account will be deactivated for 30 days. You can recover your account during this period. After 30 days, your account and associated data will be permanently deleted and cannot be recovered.</p>
        <button className="delete-account-button" type="button" onClick={onClose}>Delete</button>
      </section>
    </div>
  )
}

function ChangePasswordForm() {
  return (
    <section className="privacy-settings change-password-section">
      <h3>Change Password</h3>
      <form onSubmit={(event) => event.preventDefault()}>
        <PasswordField label="Old Password" placeholder="Enter Old Password" info="Your current password is required." />
        <PasswordField label="New Password" placeholder="Enter New Password" info="Use at least 8 characters with a number and symbol." />
        <PasswordField label="Confirm Password" placeholder="Re-enter New Password" info="Enter the same new password again." />
        <button className="community-gradient-button settings-password-submit" type="submit">Change Password</button>
      </form>
    </section>
  )
}

function PasswordField({ label, placeholder, info }) {
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
        <input type={isVisible ? 'text' : 'password'} placeholder={placeholder} />
        <button type="button" aria-label={`Toggle ${label} visibility`} onClick={() => setIsVisible(!isVisible)}><EyeIcon hidden={!isVisible} /></button>
      </span>
    </label>
  )
}

function EyeIcon({ hidden }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" /><circle cx="12" cy="12" r="2.5" />{hidden && <path d="M3 3l18 18" />}</svg>
}
