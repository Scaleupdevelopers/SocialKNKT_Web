import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    navigate('/password-success')
  }

  return (
    <main className="password-page">
      <header className="password-header">
        <div className="brand-mark" aria-label="SocialKNKT logo">
          <img src="/assets/logo_icons/app_logo-optimized.png" alt="SocialKNKT" />
        </div>
      </header>

      <section className="password-card">
        <img className="password-page-icon" src="/assets/logo_icons/create_password_icon-optimized.png" alt="" />
        <h1>Create New Password</h1>
        <p>Go ahead and create a unique password</p>

        <form onSubmit={handleSubmit}>
          <PasswordInput
            id="new-password"
            placeholder="New Password"
            value={password}
            showPassword={showPassword}
            onChange={setPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
          <PasswordInput
            id="confirm-password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            showPassword={showConfirmPassword}
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirmPassword((visible) => !visible)}
          />
          <button className="password-submit" type="submit">Set Password</button>
        </form>
      </section>
    </main>
  )
}

function PasswordInput({ id, placeholder, value, showPassword, onChange, onToggle }) {
  return (
    <div className="password-input-wrap">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <button type="button" aria-label="Toggle password visibility" onClick={onToggle}>
        {showPassword ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 8.6 4 9.8 6a11.8 11.8 0 0 1-3.2 3.5" />
            <path d="M6.2 6.2A11.8 11.8 0 0 0 2.2 10c1.2 2 4.6 6 9.8 6 1 0 2-.2 2.8-.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default ResetPassword
