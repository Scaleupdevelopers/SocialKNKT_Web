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
          <img src="/assets/logo_icons/app_logo-optimized.png" alt="SocialKNKT" />
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
              {showPassword ? '◉' : '◉'}
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
              src="/assets/logo_icons/google_icon-optimized.png"
              alt=""
            />
            Sign in with Google
          </button>
        </div>
      </section>
    </main>
  )
}
