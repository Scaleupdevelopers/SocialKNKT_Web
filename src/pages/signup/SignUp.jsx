import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'react-toastify'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { checkUser, signUp } from '../../action/action'
import { AUTH_STORAGE_KEY, rememberSignup } from '../../utils/helper'
import './SignUp.css'

function initialSignupValues(profile = {}) {
  const values = Object.fromEntries(
    ['fname', 'lname', 'username', 'email', 'dob', 'phone'].map((field) => [
      field,
      profile[field] || '',
    ]),
  )
  return { ...values, gender: profile.gender || 'male', password: '', confirmPassword: '' }
}

function signupRequiredFields(values, isSocialSignup, termsAccepted) {
  const fields = ['fname', 'lname', 'username', 'dob', 'phone']
  if (!isSocialSignup) fields.push('password', 'confirmPassword')
  return {
    ...Object.fromEntries(fields.map((field) => [field, !values[field]])),
    email: !values.email.trim(),
    terms: !termsAccepted,
  }
}

function signupPayload(values, isSocialSignup, socialProfile) {
  const { email, username, phone, fname, lname, dob, gender, password } = values
  const data = {
    email: email.trim().toLowerCase(),
    username,
    phone,
    fname,
    lname,
    sso: isSocialSignup,
    dob,
    gender,
    devicePlatform: '',
  }
  if (!isSocialSignup) return { ...data, password }
  const { ssoAccount, deviceToken, devicePlatform, identityToken, image } = socialProfile
  return { ...data, ssoAccount, deviceToken, devicePlatform, identityToken, image }
}

function finishSignup(response, isSocialSignup, email, navigate) {
  const user = response.data
  const hasVerifiedSocialSession =
    isSocialSignup && user?.isEmailVerified === true && Boolean(user?.token)
  if (hasVerifiedSocialSession) {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: user.token,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          email: user.email,
          image: user.image,
          bannerImage: user.banner_image,
        },
      }),
    )
    toast.success(response.message || 'Account created successfully.')
    navigate('/work-experience')
    return
  }
  rememberSignup(user, email)
  toast.success(response.message || 'Account created successfully.')
  navigate('/verify-account', { state: { email: signupEmail(user, email) } })
}

function signupEmail(user, fallback) {
  return user?.email?.trim().toLowerCase() || fallback
}

export function SignUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const socialProfile = location.state?.socialProfile
  const isSocialSignup = location.state?.socialSignup === true
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingUser, setIsCheckingUser] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [formValues, setFormValues] = useState(() => initialSignupValues(socialProfile || {}))

  const handleChange = (field, value) => {
    setFormValues((values) => ({
      ...values,
      [field]: value,
    }))
    setFieldErrors((errors) => ({ ...errors, [field]: false }))
  }

  const handleUserCheck = async () => {
    const { username, email } = formValues

    if (!username.trim() || !email.trim() || isCheckingUser) {
      return
    }

    setIsCheckingUser(true)

    try {
      const response = await checkUser({ username, email: email.trim().toLowerCase() })

      if (response.status === true) {
        toast.success('Username is available.')
      }
    } catch {
      setFieldErrors((errors) => ({
        ...errors,
        username: 'Username is not available.',
      }))
    } finally {
      setIsCheckingUser(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const { password, confirmPassword, phone } = formValues
    const requiredFields = signupRequiredFields(formValues, isSocialSignup, termsAccepted)

    if (Object.values(requiredFields).some(Boolean)) {
      setFieldErrors(requiredFields)
      return
    }

    if (!phone) {
      toast.error('Phone number is required.')
      return
    }

    if (!isSocialSignup && password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    const signupData = signupPayload(formValues, isSocialSignup, socialProfile)

    setIsSubmitting(true)

    try {
      const response = await signUp(signupData)

      if (response.status === true) {
        finishSignup(response, isSocialSignup, signupData.email, navigate)
      }
    } catch (error) {
      toast.error(error.message || 'Unable to create account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="signup-page">
      <header className="signup-header">
        <button className="signup-logo" type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
        <p className="signup-login-prompt">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/')}>
            Login Now
          </button>
        </p>
      </header>

      <section className="signup-card" aria-labelledby="signup-title">
        <h1 id="signup-title">Go ahead and sign up</h1>
        <p className="signup-subtitle">Please Enter Your Details</p>

        <form className="signup-form" onSubmit={handleSubmit} noValidate>
          <div className="signup-grid">
            <SignupField
              name="fname"
              label="First Name"
              placeholder="Enter your First Name"
              value={formValues.fname}
              onChange={handleChange}
              hasError={fieldErrors.fname}
            />
            <SignupField
              name="lname"
              label="Last Name"
              placeholder="Enter your Last Name"
              value={formValues.lname}
              onChange={handleChange}
              hasError={fieldErrors.lname}
            />
            <SignupField
              name="username"
              label="User Name"
              placeholder="Enter your User Name"
              value={formValues.username}
              onChange={handleChange}
              onBlur={handleUserCheck}
              hasError={fieldErrors.username}
              errorMessage={fieldErrors.username}
            />
            <SignupField
              name="email"
              label="Email address"
              type="email"
              placeholder="Enter your email"
              value={formValues.email}
              onChange={handleChange}
              onBlur={handleUserCheck}
              hasError={fieldErrors.email}
            />
            <SignupField
              name="dob"
              label="Birth date"
              type="date"
              placeholder="mm/dd/yyyy"
              value={formValues.dob}
              onChange={handleChange}
              hasError={fieldErrors.dob}
            />
            <label
              className={`signup-field ${fieldErrors.phone ? 'has-error' : ''}`}
              htmlFor="signup-phone"
            >
              <span>Number</span>
              <PhoneInput
                international
                defaultCountry="US"
                name="phone"
                value={formValues.phone}
                onChange={(value) => handleChange('phone', value || '')}
                placeholder="Enter your number"
              />
            </label>
          </div>

          <fieldset className="gender-field">
            <legend>Gender</legend>
            <div className="gender-options">
              {['Male', 'Female', 'Transgender', 'Gender Neutral', 'Non Binary', 'Other'].map(
                (gender) => (
                  <label key={gender}>
                    <input
                      type="radio"
                      name="gender"
                      value={gender.toLowerCase()}
                      checked={formValues.gender === gender.toLowerCase()}
                      onChange={(event) => handleChange('gender', event.target.value)}
                    />
                    {gender}
                  </label>
                ),
              )}
            </div>
          </fieldset>

          {!isSocialSignup && (
            <div className="signup-grid">
              <PasswordField
                name="password"
                label="Password"
                value={formValues.password}
                onChange={handleChange}
                hasError={fieldErrors.password}
                showPassword={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
              <PasswordField
                name="confirmPassword"
                label="Confirm Password"
                value={formValues.confirmPassword}
                onChange={handleChange}
                hasError={fieldErrors.confirmPassword}
                showPassword={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
              />
            </div>
          )}

          <label className={`terms-checkbox ${fieldErrors.terms ? 'has-error' : ''}`}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => {
                setTermsAccepted(event.target.checked)
                setFieldErrors((errors) => ({ ...errors, terms: false }))
              }}
            />
            <span>
              I accept the{' '}
              <a href="https://socialknkt.com/terms" target="_blank" rel="noopener noreferrer">
                <strong>Terms and conditions.</strong>
              </a>
            </span>
          </label>

          <button className="signup-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
      </section>
    </main>
  )
}

function SignupField({
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  hasError,
  errorMessage,
}) {
  return (
    <label className={`signup-field ${hasError ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={onBlur}
        required
      />
      {errorMessage && <small className="signup-field-error">{errorMessage}</small>}
    </label>
  )
}

function PasswordField({ name, label, value, onChange, hasError, showPassword, onToggle }) {
  return (
    <label className={`signup-field ${hasError ? 'has-error' : ''}`}>
      <span>{label}</span>
      <div className="signup-password-input">
        <input
          name={name}
          type={showPassword ? 'text' : 'password'}
          placeholder={label}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          required
        />
        <button type="button" aria-label="Toggle password visibility" onClick={onToggle}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {showPassword && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
    </label>
  )
}
