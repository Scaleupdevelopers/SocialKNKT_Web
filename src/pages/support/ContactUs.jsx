import { LoadingSkeleton } from '../../components/common/RequestState'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getContactDetails } from '../../action/action'
import { contactDetails, contactMailto } from './contact'
import './ContactUs.css'

export function ContactUs() {
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    getContactDetails()
      .then((response) => {
        if (active) setContact(contactDetails(response.data?.contactHTML))
      })
      .catch(() => {
        if (active) setError('Unable to load contact details. Please try again.')
      })
    return () => {
      active = false
    }
  }, [revision])
  function submit(event) {
    event.preventDefault()
    if (!contact?.email) return
    const data = new FormData(event.currentTarget)
    window.location.href = contactMailto(
      contact.email,
      data.get('name'),
      data.get('email'),
      data.get('message'),
    )
  }

  return (
    <main className="contact-page">
      <header className="contact-header">
        <button
          className="contact-brand"
          type="button"
          aria-label="Back to login"
          onClick={() => navigate('/')}
        >
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="contact-card" aria-labelledby="contact-title">
        <img
          className="contact-icon"
          src="/assets/logo_icons/create_password_icon.png"
          alt=""
        />
        <h1 id="contact-title">Contact Us</h1>
        <p>We’re here to help. Send us your query.</p>
        {error && (
          <p role="alert">
            {error}{' '}
            <button type="button" onClick={() => setRevision((value) => value + 1)}>
              Try again
            </button>
          </p>
        )}
        {!contact && !error && (
          <LoadingSkeleton label="Loading contact details…" variant="rows" count={3} />
        )}
        {contact && (
          <p className="contact-details">
            {contact.text || 'Support contact details are currently unavailable.'}
          </p>
        )}
        {contact?.email && (
          <p>Opens your email app. Send the message there to contact support.</p>
        )}

        <form className="contact-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="contact-name">
            Name or Username
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            placeholder="Name/Username"
            required
            maxLength={120}
          />

          <label className="sr-only" htmlFor="contact-email">
            Email
          </label>
          <input id="contact-email" name="email" type="email" placeholder="Email" required />

          <label className="sr-only" htmlFor="contact-message">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            placeholder="Message"
            required
            maxLength={2000}
          />

          <button className="contact-submit" type="submit" disabled={!contact?.email}>
            Open email app
          </button>
        </form>
      </section>
    </main>
  )
}
