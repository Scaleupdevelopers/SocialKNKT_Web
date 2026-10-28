import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function VerifyAccount() {
  const navigate = useNavigate()
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
          <img src="/assets/logo_icons/app_logo-transparent.png" alt="SocialKNKT" />
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

        <form
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/account-created')
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
                aria-label={`Verification code digit ${index + 1}`}
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
