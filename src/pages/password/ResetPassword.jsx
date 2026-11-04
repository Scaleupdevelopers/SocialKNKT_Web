import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { changePassword } from '../../action/action'
import './PasswordPages.css'

function ResetPassword() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const email = state?.email || ''
  const resetToken = state?.verificationToken || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!password.trim()) {
      nextErrors.password = 'Password is required'
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirm Password is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})

    if (!email || !resetToken) {
      toast.error('Reset session has expired. Please request a new OTP.')
      navigate('/forgot-password', { replace: true })
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await changePassword({
        email,
        password,
        token: resetToken,
      })

      if (response.status === true) {
        toast.success(response.message || 'Password changed successfully.')
        navigate('/password-success')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to change password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="password-page">
      <header className="password-header">
        <div className="brand-mark" aria-label="SocialKNKT logo">
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </div>
      </header>

      <section className="password-card">
        <img className="password-page-icon" src="/assets/logo_icons/create_password_icon.png" alt="" />
        <h1>Create New Password</h1>
        <p>Go ahead and create a unique password</p>

        <form onSubmit={handleSubmit} noValidate>
          <PasswordInput
            id="new-password"
            placeholder="New Password"
            value={password}
            showPassword={showPassword}
            onChange={(value) => {
              setPassword(value)
              setFieldErrors((errors) => ({ ...errors, password: '' }))
            }}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
          {fieldErrors.password && <p className="password-field-error">{fieldErrors.password}</p>}
          <PasswordInput
            id="confirm-password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            showPassword={showConfirmPassword}
            onChange={(value) => {
              setConfirmPassword(value)
              setFieldErrors((errors) => ({ ...errors, confirmPassword: '' }))
            }}
            onToggle={() => setShowConfirmPassword((visible) => !visible)}
          />
          {fieldErrors.confirmPassword && <p className="password-field-error">{fieldErrors.confirmPassword}</p>}
          <button className="password-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Set Password'}
          </button>
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
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" />
          <circle cx="12" cy="12" r="2.5" />
          {showPassword && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  )
}

export default ResetPassword
