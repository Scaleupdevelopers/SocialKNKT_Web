import { useState } from 'react'

const sections = [
  ['basic', 'Basic Details'],
  ['work', 'Work Experience'],
  ['education', 'Education'],
  ['location', 'Location'],
  ['pronunciation', 'Name Pronunciation'],
]

export function EditProfileContent() {
  const [activeSection, setActiveSection] = useState('basic')

  return (
    <div className="settings-content">
      <h2>Edit Profile</h2>

      <div className="settings-content-body">
        <nav className="settings-menu edit-profile-menu" aria-label="Edit profile sections">
          {sections.map(([value, label]) => (
            <button
              className={activeSection === value ? 'active' : ''}
              type="button"
              key={value}
              onClick={() => setActiveSection(value)}
            >
              {label}
              {activeSection === value && <span>‹</span>}
            </button>
          ))}
        </nav>

        <EditSectionContent activeSection={activeSection} />
      </div>
    </div>
  )
}

function EditSectionContent({ activeSection }) {
  if (activeSection !== 'basic') {
    const section = sections.find(([value]) => value === activeSection)

    return (
      <section className="privacy-settings edit-profile-placeholder">
        <h3>{section?.[1]}</h3>
        <p>This profile section is ready to be updated.</p>
      </section>
    )
  }

  return (
    <section className="privacy-settings edit-profile-details">
      <h3>Basic Details</h3>

      <form onSubmit={(event) => event.preventDefault()}>
        <div className="edit-profile-grid">
          <label>
            First Name
            <input defaultValue="Dianne" />
          </label>
          <label>
            Last Name
            <input defaultValue="Russell" />
          </label>
          <label>
            User Name
            <input defaultValue="Diane_R001" />
          </label>
          <label>
            Birth date
            <input defaultValue="21/08/1998" />
          </label>
        </div>

        <label>
          Email address
          <input defaultValue="Dianne.Russell001@gmail.com" />
        </label>

        <fieldset>
          <legend>Gender</legend>
          <label><input type="radio" name="gender" defaultChecked /> Male</label>
          <label><input type="radio" name="gender" /> Female</label>
          <label><input type="radio" name="gender" /> Transgender</label>
          <label><input type="radio" name="gender" /> Gender Neutral</label>
          <label><input type="radio" name="gender" /> Non Binary</label>
          <label><input type="radio" name="gender" /> Other</label>
        </fieldset>

        <label>
          Bio
          <textarea defaultValue="Design, Art, photography, Dance, Creativity, Nature, Lifestyle 💗🦋💐" />
        </label>

        <div className="edit-profile-actions">
          <button type="button">Cancel</button>
          <button className="community-gradient-button" type="submit">Save</button>
        </div>
      </form>
    </section>
  )
}
