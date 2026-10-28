import { useNavigate } from 'react-router-dom'

export function ContactUs() {
  const navigate = useNavigate()

  return (
    <main className="contact-page">
      <header className="contact-header">
        <button
          className="contact-brand"
          type="button"
          aria-label="Back to login"
          onClick={() => navigate('/')}
        >
          <img src="/assets/logo_icons/app_logo-optimized.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="contact-card" aria-labelledby="contact-title">
        <img
          className="contact-icon"
          src="/assets/logo_icons/create_password_icon-optimized.png"
          alt=""
        />
        <h1 id="contact-title">Contact Us</h1>
        <p>We’re here to help. Send us your query.</p>

        <form
          className="contact-form"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="sr-only" htmlFor="contact-name">Name or Username</label>
          <input id="contact-name" type="text" placeholder="Name/Username" required />

          <label className="sr-only" htmlFor="contact-email">Email</label>
          <input id="contact-email" type="email" placeholder="Email" required />

          <label className="sr-only" htmlFor="contact-message">Message</label>
          <textarea id="contact-message" placeholder="Message" required />

          <button className="contact-submit" type="submit">Submit</button>
        </form>
      </section>
    </main>
  )
}
