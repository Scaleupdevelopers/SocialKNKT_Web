import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { sendForgotPasswordOtp } from '../../action/action'
import './ForgotPassword.css'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      setEmailError('Email is required')
      return
    }

    setEmailError('')
    setIsSubmitting(true)

    try {
      const response = await sendForgotPasswordOtp({ email })

      if (response.status === true) {
        toast.success(response.message || 'OTP sent successfully.')
        navigate('/verify-code', { state: { email } })
      }
    } catch (error) {
      toast.error(error.message || 'Unable to send OTP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="forgot-page">
      <header className="forgot-header">
        <div className="brand-mark" aria-label="SocialKNKT logo">
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </div>
      </header>

      <section className="forgot-card" aria-labelledby="forgot-title">
        <img
          className="forgot-icon"
          src="/assets/logo_icons/forgot_password_icon.png"
          alt=""
        />
        <h1 id="forgot-title">Forgot password?</h1>
        <p className="forgot-description">
          Don’t worry! It happens. Please enter the email
          <br />
          associated with your account.
        </p>

        <form
          className="forgot-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="sr-only" htmlFor="forgot-email">Email Id</label>
          <input
            id="forgot-email"
            type="email"
            placeholder="Email Id"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError('')
            }}
            required
          />
          {emailError && <p className="forgot-field-error">{emailError}</p>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Submit'}
          </button>
        </form>

        <button className="back-button" type="button" onClick={() => navigate('/')}>
          Back to Login
        </button>

        <p className="help-text">
          Need Help? <a href="/contact-us">Contact Us</a>
        </p>
      </section>
    </main>
  )
}
