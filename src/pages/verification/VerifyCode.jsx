import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './VerifyCode.css'

export function VerifyCode({ title = 'Verify Code', description }) {
  const { state } = useLocation()
  const navigate = useNavigate()
  const email = state?.email || ''
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  const updateCode = (index, value) => {
    const nextValue = value.replace(/\D/g, '').slice(-1)
    const nextCode = [...code]
    nextCode[index] = nextValue
    setCode(nextCode)

    if (nextValue && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus()
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
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/reset-password')
          }}
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
              />
            ))}
          </div>
          <button className="verify-button" type="submit">Verify Code</button>
        </form>

        <p className="verify-timer">00:05</p>
        <p className="resend-text">
          Didn’t get a code? <button type="button">Resend</button>
        </p>
      </section>
    </main>
  )
}
