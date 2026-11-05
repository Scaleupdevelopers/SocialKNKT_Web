import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'react-toastify'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { checkUser, signUp } from '../../action/action'
import './SignUp.css'

export function SignUp() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingUser, setIsCheckingUser] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [formValues, setFormValues] = useState({
    fname: '',
    lname: '',
    username: '',
    email: '',
    dob: '',
    phone: '',
    gender: 'male',
    password: '',
    confirmPassword: '',
  })

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
      const response = await checkUser({ username, email })

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

    const {
      email,
      password,
      confirmPassword,
      username,
      phone,
      fname,
      lname,
      dob,
      gender,
    } = formValues

    const requiredFields = {
      fname: !fname,
      lname: !lname,
      username: !username,
      email: !email,
      dob: !dob,
      phone: !phone,
      password: !password,
      confirmPassword: !confirmPassword,
      terms: !termsAccepted,
    }

    if (Object.values(requiredFields).some(Boolean)) {
      setFieldErrors(requiredFields)
      return
    }

    if (!phone) {
      toast.error('Phone number is required.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    const signupData = {
      email,
      password,
      username,
      phone,
      fname,
      lname,
      sso: false,
      dob,
      gender,
      devicePlatform: '',
    }

    setIsSubmitting(true)

    try {
      const response = await signUp(signupData)

      if (response.status === true) {
        toast.success(response.message || 'Account created successfully.')
        navigate('/verify-account', {
          state: { email: signupData.email },
        })
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
          <button type="button" onClick={() => navigate('/')}>Login Now</button>
        </p>
      </header>

      <section className="signup-card" aria-labelledby="signup-title">
        <h1 id="signup-title">Go ahead and sign up</h1>
        <p className="signup-subtitle">Please Enter Your Details</p>

        <form
          className="signup-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="signup-grid">
            <SignupField name="fname" label="First Name" placeholder="Enter your First Name" value={formValues.fname} onChange={handleChange} hasError={fieldErrors.fname} />
            <SignupField name="lname" label="Last Name" placeholder="Enter your Last Name" value={formValues.lname} onChange={handleChange} hasError={fieldErrors.lname} />
            <SignupField name="username" label="User Name" placeholder="Enter your User Name" value={formValues.username} onChange={handleChange} onBlur={handleUserCheck} hasError={fieldErrors.username} errorMessage={fieldErrors.username} />
            <SignupField name="email" label="Email address" type="email" placeholder="Enter your email" value={formValues.email} onChange={handleChange} onBlur={handleUserCheck} hasError={fieldErrors.email} />
            <SignupField name="dob" label="Birth date" type="date" placeholder="mm/dd/yyyy" value={formValues.dob} onChange={handleChange} hasError={fieldErrors.dob} />
            <label className={`signup-field ${fieldErrors.phone ? 'has-error' : ''}`} htmlFor="signup-phone">
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
              {['Male', 'Female', 'Transgender', 'Gender Neutral', 'Non Binary', 'Other'].map((gender) => (
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
              ))}
            </div>
          </fieldset>

          <div className="signup-grid">
            <PasswordField name="password" label="Password" value={formValues.password} onChange={handleChange} hasError={fieldErrors.password} showPassword={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PasswordField name="confirmPassword" label="Confirm Password" value={formValues.confirmPassword} onChange={handleChange} hasError={fieldErrors.confirmPassword} showPassword={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
          </div>

          <label className={`terms-checkbox ${fieldErrors.terms ? 'has-error' : ''}`}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => {
                setTermsAccepted(event.target.checked)
                setFieldErrors((errors) => ({ ...errors, terms: false }))
              }}
            />
            <span>I accept the <strong>Terms and conditions.</strong></span>
          </label>

          <button className="signup-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
      </section>
    </main>
  )
}

function SignupField({ name, label, type = 'text', placeholder, value, onChange, onBlur, hasError, errorMessage }) {
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
