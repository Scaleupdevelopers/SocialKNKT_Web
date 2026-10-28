import { useNavigate } from 'react-router-dom'
import './AccountCreated.css'

export function AccountCreated() {
  const navigate = useNavigate()

  return (
    <main className="account-created-page">
      <header className="account-created-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="account-created-card" aria-labelledby="account-created-title">
        <img className="account-created-icon" src="/assets/logo_icons/password_success_icon.png" alt="" />
        <h1 id="account-created-title">Account Created</h1>
        <p>Wohoo your account has been created<br />successfully</p>
        <button className="account-created-button" type="button" onClick={() => navigate('/work-experience')}>
          Get Started
        </button>
      </section>
    </main>
  )
}
