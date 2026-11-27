import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { resendOtp, verifyOtp } from '../../action/action'
import { AUTH_STORAGE_KEY, consumeSignup, getPendingSignupVersion } from '../../utils/helper'
import './VerifyAccount.css'

export function VerifyAccount() {
  const { state, key: locationKey } = useLocation()
  const navigate = useNavigate()
  const email = (state?.email || '').trim().toLowerCase()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(60)
  const [codeError, setCodeError] = useState('')
  const inputRefs = useRef([])
  const submittingRef = useRef(false)
  const mountedRef = useRef(false)
  const generationRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    generationRef.current++
    const invalidate = () => {
      generationRef.current++
    }
    const onStorage = (event) => {
      if (!event.key || event.key === AUTH_STORAGE_KEY) invalidate()
    }
    window.addEventListener('auth-change', invalidate)
    window.addEventListener('storage', onStorage)
    return () => {
      mountedRef.current = false
      invalidate()
      window.removeEventListener('auth-change', invalidate)
      window.removeEventListener('storage', onStorage)
    }
  }, [email, locationKey])

  useEffect(() => {
    if (remainingSeconds === 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [remainingSeconds])

  const updateCode = (index, value) => {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    const nextCode = [...code]
    nextCode[index] = nextValue
    setCode(nextCode)
    setCodeError('')

    if (nextValue && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index, event) => {
    if (event.key !== 'Backspace' || code[index] || index === 0) {
      return
    }

    event.preventDefault()
    const nextCode = [...code]
    nextCode[index - 1] = ''
    setCode(nextCode)
    setCodeError('')
    inputRefs.current[index - 1]?.focus()
  }

  const completeVerification = (response) => {
    const session = consumeSignup(email)
    if (!session) {
      toast.success('Account verified. Please sign in to continue.')
      navigate('/signin', { replace: true })
      return
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
    window.dispatchEvent(new Event('auth-change'))
    toast.success(response.message || 'Account verified successfully.')
    navigate('/account-created', { replace: true })
  }

  const validateCode = (otp) => {
    if (otp.length !== 6 || !email) {
      setCodeError('Please enter the complete verification code')
      return false
    }
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return
    const otp = code.join('')
    if (!validateCode(otp)) return

    submittingRef.current = true
    setIsSubmitting(true)
    const generation = generationRef.current
    const authSnapshot = localStorage.getItem(AUTH_STORAGE_KEY)
    const signupSnapshot = getPendingSignupVersion()
    const isCurrent = () =>
      mountedRef.current &&
      generationRef.current === generation &&
      localStorage.getItem(AUTH_STORAGE_KEY) === authSnapshot &&
      getPendingSignupVersion() === signupSnapshot

    try {
      const response = await verifyOtp({
        otp,
        email,
        needToken: false,
      })

      if (!isCurrent()) return
      if (response.status === true) {
        completeVerification(response)
      }
    } catch (error) {
      if (isCurrent()) toast.error(error.message || 'Unable to verify account.')
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error('Email is missing. Please sign up again.')
      return
    }

    setIsResending(true)

    try {
      const response = await resendOtp({ email })

      if (response.status === true) {
        setCode(['', '', '', '', '', ''])
        setCodeError('')
        setRemainingSeconds(60)
        inputRefs.current[0]?.focus()
        toast.success(response.message || 'OTP resent successfully.')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to resend OTP.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="verify-page">
      <header className="verify-header">
        <div className="brand-mark" aria-label="SocialKNKT logo">
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </div>
      </header>

      <section className="verify-card" aria-labelledby="verify-account-title">
        <img className="verify-icon" src="/assets/logo_icons/verify_code_icon.png" alt="" />
        <h1 id="verify-account-title">Verify Your Account</h1>
        <p className="verify-description">
          We have sent you a verification code to verify your
          <br />
          email. Please check your inbox or spam folder
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="otp-fields">
            {code.map((value, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element
                }}
                value={value}
                inputMode="numeric"
                maxLength={1}
                aria-label={`Verification code digit ${index + 1}`}
                onChange={(event) => updateCode(index, event.target.value)}
                onKeyDown={(event) => handleCodeKeyDown(index, event)}
              />
            ))}
          </div>
          {codeError && <p className="verify-field-error">{codeError}</p>}

          <button className="verify-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <p className="verify-timer">00:{String(remainingSeconds).padStart(2, '0')}</p>
        <p className="resend-text">
          Didn’t get a code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || remainingSeconds > 0}
          >
            {isResending ? 'Sending...' : 'Resend'}
          </button>
        </p>
      </section>
    </main>
  )
}
