import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { completeProfile } from '../../action/action'
import './WorkExperience.css'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const years = Array.from({ length: 47 }, (_, index) => 2026 - index)
const days = Array.from({ length: 31 }, (_, index) => index + 1)

const emptyExperience = {
  title: '', company: '', country: '', city: '', employmentType: '',
  startDate: '', startMonth: '', startYear: '',
  endDate: '', endMonth: '', endYear: '', isCurrent: false,
}

export function WorkExperience() {
  const navigate = useNavigate()
  const [experience, setExperience] = useState(emptyExperience)
  const [experiences, setExperiences] = useState([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const updateExperience = (field, value) => {
    setExperience((current) => ({ ...current, [field]: value }))
  }

  const formatDate = (day, month, year) => {
    if (!day || !month || !year) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const toPayload = (item) => ({
    company: item.company,
    title: item.title,
    startDate: formatDate(item.startDate, item.startMonth, item.startYear),
    endDate: item.isCurrent ? null : formatDate(item.endDate, item.endMonth, item.endYear),
    isCurrent: item.isCurrent,
    description: '',
  })

  const addExperience = (event) => {
    event.preventDefault()
    setExperiences((current) => [...current, toPayload(experience)])
    setExperience(emptyExperience)
  }

  const saveExperiences = async () => {
    if (!experiences.length) {
      toast.error('Please add at least one work experience.')
      return
    }

    setIsSaving(true)

    try {
      const response = await completeProfile({ workExperience: experiences, stepCount: 1 })

      if (response.status === true) {
        toast.success(response.message || 'Work experience saved successfully.')
        navigate('/education')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to save work experience.')
    } finally {
      setIsSaving(false)
    }
  }

  const removeExperience = () => {
    setExperiences((current) => current.filter((_, index) => index !== deleteIndex))
    setShowDeleteModal(false)
    setDeleteIndex(null)
  }

  return (
    <main className="work-page">
      <header className="work-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="work-card" aria-labelledby="work-title">
        <div className="progress-track"><span /></div>
        <h1 id="work-title">Add your Work Experience</h1>
        <p className="work-description">
          Show what you do and where you shine.<br />
          Highlight your current role or past jobs to help others connect with your professional side.
        </p>

        <form className="work-form" onSubmit={addExperience}>
          <div className="work-grid">
            <Field label="Job Title" value={experience.title} placeholder="Enter your Job Title" onChange={(value) => updateExperience('title', value)} />
            <Field label="Company Name" value={experience.company} placeholder="Enter your company name" onChange={(value) => updateExperience('company', value)} />
            <Field label="Country" value={experience.country} placeholder="Select country" onChange={(value) => updateExperience('country', value)} />
            <Field label="City" value={experience.city} placeholder="Select city" onChange={(value) => updateExperience('city', value)} />
            <Field label="Employment Type" value={experience.employmentType} placeholder="Select your Employment Type" onChange={(value) => updateExperience('employmentType', value)} />
          </div>

          <div className="date-grid">
            <DateGroup label="Start Date" day={experience.startDate} month={experience.startMonth} year={experience.startYear} onChange={updateExperience} />
            {!experience.isCurrent && <DateGroup label="End Date" prefix="end" day={experience.endDate} month={experience.endMonth} year={experience.endYear} onChange={updateExperience} />}
          </div>

          <label className="work-checkbox">
            <input type="checkbox" checked={experience.isCurrent} onChange={(event) => updateExperience('isCurrent', event.target.checked)} />
            I currently work here
          </label>

          <button className="work-primary-button" type="submit">Add Work Experience</button>
        </form>

        {experiences.length > 0 && (
          <div className="saved-work">
            <div className="saved-work-heading"><span>Work Experience</span></div>
            {experiences.map((item, index) => (
              <div className="saved-work-card" key={`${item.company}-${index}`}>
                <span>{item.title}</span><br />
                {item.company}<br />
                {item.startDate || 'Start date'} — {item.isCurrent ? 'Present' : item.endDate || 'End date'}
                <button className="saved-work-delete" type="button" onClick={() => { setDeleteIndex(index); setShowDeleteModal(true) }}>
                  <img src="/assets/logo_icons/delete_icon.svg" alt="Delete work experience" />
                </button>
              </div>
            ))}
            <button className="work-primary-button" type="button" onClick={saveExperiences} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {experiences.length === 0 && <button className="skip-button" type="button" onClick={() => navigate('/education')}>Skip for now</button>}
      </section>

      {showDeleteModal && (
        <div className="delete-modal-backdrop" role="presentation">
          <div className="delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <button className="delete-modal-close" type="button" aria-label="Close" onClick={() => setShowDeleteModal(false)}>×</button>
            <h2 id="delete-title">Delete Experience</h2>
            <p>This action will permanently remove this entry from<br />your profile.</p>
            <button className="delete-confirm-button" type="button" onClick={removeExperience}>Delete Work Experience</button>
          </div>
        </div>
      )}
    </main>
  )
}

function Field({ label, value, placeholder, onChange }) {
  return (
    <label className="work-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} required />
    </label>
  )
}

function DateGroup({ label, prefix = 'start', day, month, year, onChange }) {
  return (
    <fieldset className="date-group">
      <legend>{label}</legend>
      <div>
        <select value={day} onChange={(event) => onChange(`${prefix}Date`, event.target.value)} required>
          <option value="">Date</option>
          {days.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={month} onChange={(event) => onChange(`${prefix}Month`, event.target.value)} required>
          <option value="">Month</option>
          {months.map((item, index) => <option key={item} value={index + 1}>{item}</option>)}
        </select>
        <select value={year} onChange={(event) => onChange(`${prefix}Year`, event.target.value)} required>
          <option value="">Year</option>
          {years.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </fieldset>
  )
}
