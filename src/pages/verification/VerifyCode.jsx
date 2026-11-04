import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { resendOtp, verifyOtp } from '../../action/action'
import './VerifyCode.css'

export function VerifyCode({ title = 'Verify Code', description }) {
  const { state } = useLocation()
  const navigate = useNavigate()
  const email = state?.email || ''
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(60)
  const [codeError, setCodeError] = useState('')
  const inputRefs = useRef([])

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    const otp = code.join('')

    if (otp.length !== 6 || !email) {
      setCodeError('Please enter the complete verification code')
      return
    }

    setCodeError('')
    setIsSubmitting(true)

    try {
      const response = await verifyOtp({
        otp,
        email,
        needToken: true,
      })

      if (response.status === true) {
        toast.success(response.message || 'OTP verified successfully.')
        navigate('/reset-password', {
          state: {
            email,
            verificationToken: response.data,
          },
        })
      }
    } catch (error) {
      toast.error(error.message || 'Unable to verify OTP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error('Email is missing. Please request a new OTP.')
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

      <section className="verify-card" aria-labelledby="verify-title">
        <img
          className="verify-icon"
          src="/assets/logo_icons/verify_code_icon.png"
          alt=""
        />
        <h1 id="verify-title">{title}</h1>
        <p className="verify-description">
          {description || (
            <>
              Enter OTP sent to <strong>{email || 'your email'}</strong> to reset
              <br />
              your password. Please check your inbox
            </>
          )}
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="otp-fields">
            {code.map((value, index) => (
              <input
                key={index}
                ref={(element) => { inputRefs.current[index] = element }}
                value={value}
                inputMode="numeric"
                maxLength={1}
                aria-label={`OTP digit ${index + 1}`}
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

        <p className="verify-timer">
          00:{String(remainingSeconds).padStart(2, '0')}
        </p>
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
