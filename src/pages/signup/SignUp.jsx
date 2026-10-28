import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export function SignUp() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <main className="signup-page">
      <header className="signup-header">
        <button className="signup-logo" type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo-optimized.png" alt="SocialKNKT" />
        </button>
        <p className="signup-login-prompt">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/')}>Login Now</button>
        </p>
      </header>

      <section className="signup-card" aria-labelledby="signup-title">
        <h1 id="signup-title">Go ahead and sign up</h1>
        <p className="signup-subtitle">Please Enter Your Details</p>

        <form
          className="signup-form"
          onSubmit={(event) => {
            event.preventDefault()
            navigate('/verify-account')
          }}
        >
          <div className="signup-grid">
            <SignupField label="First Name" placeholder="Enter your First Name" />
            <SignupField label="Last Name" placeholder="Enter your Last Name" />
            <SignupField label="User Name" placeholder="Enter your User Name" />
            <SignupField label="Email address" type="email" placeholder="Enter your email" />
            <SignupField label="Birth date" type="date" placeholder="mm/dd/yyyy" />
            <SignupField label="Number" type="tel" placeholder="Enter your number" />
          </div>

          <fieldset className="gender-field">
            <legend>Gender</legend>
            <div className="gender-options">
              {['Male', 'Female', 'Transgender', 'Gender Neutral', 'Non Binary', 'Other'].map((gender, index) => (
                <label key={gender}>
                  <input type="radio" name="gender" defaultChecked={index === 0} />
                  {gender}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="signup-grid">
            <PasswordField label="Password" showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PasswordField label="Confirm Password" showPassword={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
          </div>

          <label className="terms-checkbox">
            <input type="checkbox" required />
            <span>I accept the <strong>Terms and conditions.</strong></span>
          </label>

          <button className="signup-submit" type="submit">Sign Up</button>
        </form>
      </section>
    </main>
  )
}

function SignupField({ label, type = 'text', placeholder }) {
  return (
    <label className="signup-field">
      <span>{label}</span>
      <input type={type} placeholder={placeholder} required />
    </label>
  )
}

function PasswordField({ label, showPassword, onToggle }) {
  return (
    <label className="signup-field">
      <span>{label}</span>
      <div className="signup-password-input">
        <input type={showPassword ? 'text' : 'password'} placeholder={label} required />
        <button type="button" aria-label="Toggle password visibility" onClick={onToggle}>◉</button>
      </div>
    </label>
  )
}
