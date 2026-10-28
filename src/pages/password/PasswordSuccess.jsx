import { useNavigate } from 'react-router-dom'
import './PasswordPages.css'

function PasswordSuccess() {
  const navigate = useNavigate()

  return (
    <main className="password-page success-page">
      <header className="password-header">
        <div className="brand-mark" aria-label="SocialKNKT logo">
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </div>
      </header>

      <section className="password-card success-card">
        <img className="password-page-icon" src="/assets/logo_icons/password_success_icon.png" alt="" />
        <h1>Password updated</h1>
        <p>Wohoo your password has been updated<br />successfully</p>
        <button className="password-submit" type="button" onClick={() => navigate('/')}>
          Back to Login
        </button>
      </section>
    </main>
  )
}

export default PasswordSuccess
