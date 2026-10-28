import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './SignIn.css'

export function SignIn() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  return (
    <main className="auth-page">
      <header className="auth-header">
        <div className="brand-mark" aria-label="SocialKNKT logo placeholder">
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </div>

        <p className="register-prompt">
          Don’t have an account?{' '}
          <button type="button" onClick={() => navigate('/sign-up')}>
            Register Now
          </button>
        </p>
      </header>

      <section className="signin-card" aria-labelledby="signin-title">
        <h1 id="signin-title">Glad to see you, Again!</h1>
        <p className="signin-subtitle">Please Enter Your Details</p>

        <form className="signin-form" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="email">Email Id</label>
          <input id="email" type="email" placeholder="Email Id" autoComplete="email" />

          <label className="sr-only" htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
            <button
              className="password-toggle"
              type="button"
              aria-label="Toggle password visibility"
              onClick={() => setShowPassword((visible) => !visible)}
            >
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

          <button className="forgot-link" type="button" onClick={() => navigate('/forgot-password')}>
            Forgot Password?
          </button>
          <button className="login-button" type="submit">Login</button>
        </form>

        <div className="divider" aria-hidden="true">
          <span>Or continue with email</span>
        </div>

        <div className="social-buttons">
          <button className="social-button" type="button">
            <img
              className="social-icon"
              src="/assets/logo_icons/apple_icon.svg"
              alt=""
            />
            Sign in with Apple
          </button>
          <button className="social-button" type="button">
            <img
              className="social-icon google-social-icon"
              src="/assets/logo_icons/google_icon.png"
              alt=""
            />
            Sign in with Google
          </button>
        </div>
      </section>
    </main>
  )
}
