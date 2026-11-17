import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { login, ssoCheck } from '../../action/action'
import { AUTH_STORAGE_KEY } from '../../utils/helper'
import { appleProvider, firebaseAuth, googleProvider } from '../../config/firebase'
import { getAdditionalUserInfo, signInWithPopup } from 'firebase/auth'
import './SignIn.css'

export function SignIn() {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const navigate = useNavigate()
  const handleAppleSignIn = async () => {
    setIsAppleSubmitting(true)
    try {
      const result = await signInWithPopup(firebaseAuth, appleProvider)
      const firebaseUser = result.user
      const appleProfile = getAdditionalUserInfo(result)?.profile || {}
      const displayNameParts = (firebaseUser.displayName || appleProfile.name || '').trim().split(/\s+/).filter(Boolean)
      const email = firebaseUser.email || ''
      const socialProfile = {
        email,
        fname: firebaseUser.displayName?.split(' ')[0] || appleProfile.firstName || displayNameParts[0] || '',
        lname: firebaseUser.displayName?.split(' ').slice(1).join(' ') || appleProfile.lastName || displayNameParts.slice(1).join(' ') || '',
        username: email.split('@')[0],
        image: '',
        ssoAccount: 'apple',
        deviceToken: localStorage.getItem('deviceToken') || '',
        devicePlatform: 'web',
        identityToken: firebaseUser.uid,
      }
      const ssoResponse = await ssoCheck(socialProfile)
      const isExistingVerifiedUser = ssoResponse.status === true
        && ssoResponse.data?.isEmailVerified === true
        && Boolean(ssoResponse.data?.token)

      if (!isExistingVerifiedUser) {
        navigate('/sign-up', { state: { socialSignup: true, socialProfile } })
        return
      }

      const user = ssoResponse.data
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        token: user.token,
        user: { id: user.id, username: user.username || '', phone: user.phone || '', email: user.email || email, image: user.image || '', bannerImage: user.banner_image || '' },
      }))
      toast.success(ssoResponse.message || 'Apple login successful.')
      navigate('/home')
    } catch (error) {
      toast.error(error.message || 'Unable to login with Apple.')
    } finally {
      setIsAppleSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true)

    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      const firebaseUser = result.user
      const identityToken = firebaseUser.uid
      const [fname = '', ...lnameParts] = (firebaseUser.displayName || '').split(' ')

      const ssoPayload = {
        email: firebaseUser.email || '',
        fname,
        lname: lnameParts.join(' '),
        ssoAccount: 'google',
        deviceToken: localStorage.getItem('deviceToken') || '',
        devicePlatform: 'web',
        identityToken,
      }

      const ssoResponse = await ssoCheck(ssoPayload)
      const isExistingVerifiedUser = ssoResponse.status === true
        && ssoResponse.data?.isEmailVerified === true
        && Boolean(ssoResponse.data?.token)
      if (!isExistingVerifiedUser) {
        navigate('/sign-up', {
          state: {
            socialSignup: true,
            socialProfile: {
              ...ssoPayload,
              phone: '',
              gender: '',
              dob: '',
              image: firebaseUser.photoURL || '',
              username: firebaseUser.email?.split('@')[0] || '',
            },
          },
        })
        return
      }

      const user = ssoResponse.data
      const authData = {
        token: user.token,
        user: {
          id: user.id,
          username: user.username || '',
          phone: user.phone || '',
          email: user.email || firebaseUser.email || '',
          image: user.image || firebaseUser.photoURL || '',
          bannerImage: user.banner_image || '',
        },
      }

      if (!authData.token) {
        throw new Error('Google login response did not include an auth token.')
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      toast.success(ssoResponse.message || 'Google login successful.')
      navigate('/home')
    } catch (error) {
      toast.error(error.message || 'Unable to login with Google.')
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Email is required'
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const response = await login({ email, password })

      if (response.status === true) {
        toast.success(response.message || 'Login successful.')
      }

      const user = response.data
      const authData = {
        token: user.token,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          email: user.email,
          image: user.image,
          bannerImage: user.banner_image,
        },
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      navigate('/home')
    } catch (error) {
      toast.error(error.message || 'Unable to login.')
    } finally {
      setIsSubmitting(false)
    }
  }

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

        <form
          className="signin-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="sr-only" htmlFor="email">Email Id</label>
          <input
            id="email"
            type="email"
            placeholder="Email Id"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setFieldErrors((errors) => ({ ...errors, email: '' }))
            }}
            required
          />
          {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}

          <label className="sr-only" htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setFieldErrors((errors) => ({ ...errors, password: '' }))
              }}
              autoComplete="current-password"
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label="Toggle password visibility"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" />
                <circle cx="12" cy="12" r="2.5" />
                {showPassword && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </div>
          {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}

          <button className="forgot-link" type="button" onClick={() => navigate('/forgot-password')}>
            Forgot Password?
          </button>
          <button className="login-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="divider" aria-hidden="true">
          <span>Or continue with email</span>
        </div>

        <div className="social-buttons">
          <button className="social-button" type="button" disabled={isAppleSubmitting || isGoogleSubmitting || isSubmitting} onClick={handleAppleSignIn}>
            <img
              className="social-icon"
              src="/assets/logo_icons/apple_icon.svg"
              alt=""
            />
            {isAppleSubmitting ? 'Signing in...' : 'Sign in with Apple'}
          </button>
          <button
            className="social-button"
            type="button"
            disabled={isGoogleSubmitting || isSubmitting}
            onClick={handleGoogleSignIn}
          >
            <img className="social-icon google-social-icon" src="/assets/logo_icons/google_icon.png" alt="" />
            {isGoogleSubmitting ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </section>
    </main>
  )
}

