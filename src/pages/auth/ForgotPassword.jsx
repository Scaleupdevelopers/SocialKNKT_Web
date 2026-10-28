import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  return (
    <main className="forgot-page">
      <header className="forgot-header">
        <div className="brand-mark" aria-label="SocialKNKT logo">
          <img src="/assets/logo_icons/app_logo-transparent.png" alt="SocialKNKT" />
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
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/verify-code', { state: { email } })
          }}
        >
          <label className="sr-only" htmlFor="forgot-email">Email Id</label>
          <input
            id="forgot-email"
            type="email"
            placeholder="Email Id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="submit-button" type="submit">Submit</button>
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
