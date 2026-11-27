import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCities, getCountries, getStates } from '../../action/action'
import { completeProfile } from '../../action/action'
import { toast } from 'react-toastify'
import './Education.css'

const currentYear = new Date().getFullYear()
const educationYears = Array.from(
  { length: currentYear - 1955 + 1 },
  (_, index) => currentYear - index,
)

export function Education() {
  const navigate = useNavigate()
  const [educations, setEducations] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const [education, setEducation] = useState({
    school: '',
    degree: '',
    country: '',
    countryId: '',
    state: '',
    stateId: '',
    city: '',
    cityId: '',
    startYear: '',
    endYear: '',
    currentlyStudying: false,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [countries, setCountries] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])
  const [geographyStatus, setGeographyStatus] = useState({})
  const [geographyRetries, setGeographyRetries] = useState({
    countries: 0,
    states: 0,
    cities: 0,
  })

  const retryGeography = (field) => {
    setGeographyStatus((current) => ({ ...current, [field]: 'loading' }))
    setGeographyRetries((current) => ({ ...current, [field]: current[field] + 1 }))
  }

  const savePending = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    return loadOptions(
      getCountries(),
      setCountries,
      'countries',
      setGeographyStatus,
    )
  }, [geographyRetries.countries])

  useEffect(() => {
    setStates([])
    setGeographyStatus((current) => ({ ...current, states: 'idle' }))
    if (!education.countryId) return
    return loadOptions(
      getStates({ countryId: education.countryId }),
      setStates,
      'states',
      setGeographyStatus,
    )
  }, [education.countryId, geographyRetries.states])

  useEffect(() => {
    setCities([])
    setGeographyStatus((current) => ({ ...current, cities: 'idle' }))
    if (!education.countryId || !education.stateId) return
    return loadOptions(
      getCities({ countryId: education.countryId, stateId: education.stateId }),
      setCities,
      'cities',
      setGeographyStatus,
    )
  }, [education.countryId, education.stateId, geographyRetries.cities])

  const updateEducation = (field, value) => {
    setEducation((current) => ({ ...current, [field]: value }))

    if (value.trim?.()) {
      setFieldErrors((current) => ({ ...current, [field]: false }))
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const errors = {
      school: !education.school.trim(),
      degree: !education.degree.trim(),
    }

    setFieldErrors(errors)

    if (errors.school || errors.degree) {
      return
    }

    const nextEducation = {
      school: education.school,
      degree: education.degree,
      startYear: String(education.startYear),
      endYear: education.currentlyStudying ? '' : String(education.endYear),
      countryId: education.countryId,
      countryName: education.country,
      stateId: education.stateId,
      stateName: education.state,
      cityId: education.cityId,
      cityName: education.city,
      currentlyStudying: education.currentlyStudying,
    }

    setEducations((current) =>
      editingIndex === null
        ? [...current, nextEducation]
        : current.map((item, index) => (index === editingIndex ? nextEducation : item)),
    )
    setEducation({
      ...education,
      school: '',
      degree: '',
      startYear: '',
      endYear: '',
      currentlyStudying: false,
    })
    setEditingIndex(null)
    setShowPreview(true)
  }

  const saveEducations = async () => {
    if (savePending.current) return
    savePending.current = true
    setIsSaving(true)

    try {
      const entries = educations.map((entry) => {
        const item = { ...entry }
        delete item.countryName
        delete item.stateName
        delete item.cityName
        return item
      })
      const response = await completeProfile({ education: entries, stepCount: 2 })
      if (!mounted.current) return
      if (response.status !== true) throw new Error('Save failed')
      toast.success('Education saved successfully.')
      navigate('/location')
    } catch {
      if (mounted.current) toast.error('Unable to save education. Please try again.')
    } finally {
      savePending.current = false
      if (mounted.current) setIsSaving(false)
    }
  }

  const editEducation = (item, index) => {
    setEducation({
      school: item.school || '',
      degree: item.degree || '',
      ...locationDraft(item),
      startYear: item.startYear || '',
      endYear: item.endYear || '',
      currentlyStudying: Boolean(item.currentlyStudying),
    })
    setEditingIndex(index)
    setFieldErrors({})
    setShowPreview(false)
  }

  return (
    <main className="education-page">
      <header className="education-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="education-card" aria-labelledby="education-title">
        <div className="education-progress">
          <span />
        </div>
        <h1 id="education-title">Add Your Education</h1>
        <p className="education-description">
          Show where you’ve studied and grown.
          <br />
          Add schools, colleges, or courses that shaped your journey.
        </p>

        {!showPreview ? (
          <form className="education-form" noValidate onSubmit={handleSubmit}>
            <GeographyFeedback status={geographyStatus} onRetry={retryGeography} />
            <div className="education-grid">
              <EducationField
                label="School / Institution Name"
                placeholder="Enter your institution name"
                value={education.school}
                hasError={fieldErrors.school}
                onChange={(value) => updateEducation('school', value)}
              />
              <EducationField
                label="Degree / Program"
                placeholder="Enter your Degree / Program"
                value={education.degree}
                hasError={fieldErrors.degree}
                onChange={(value) => updateEducation('degree', value)}
              />
              <OptionDropdown
                label="Country"
                value={education.countryId}
                options={countries.map((item) => ({ label: item.name, value: item.id }))}
                onChange={(value) => {
                  const item = countries.find((country) => country.id === value)
                  setEducation((current) => ({
                    ...current,
                    country: item?.name || '',
                    countryId: value,
                    state: '',
                    stateId: '',
                    city: '',
                    cityId: '',
                  }))
                  setStates([])
                  setCities([])
                }}
              />
              <OptionDropdown
                label="State"
                value={education.stateId}
                options={states.map((item) => ({ label: item.name, value: item.id }))}
                onChange={(value) => {
                  const item = states.find((state) => state.id === value)
                  setEducation((current) => ({
                    ...current,
                    state: item?.name || '',
                    stateId: value,
                    city: '',
                    cityId: '',
                  }))
                  setCities([])
                }}
              />
              <OptionDropdown
                label="City"
                value={education.cityId}
                options={cities.map((item) => ({ label: item.name, value: item.id }))}
                onChange={(value) => {
                  const item = cities.find((city) => city.id === value)
                  setEducation((current) => ({
                    ...current,
                    city: item?.name || '',
                    cityId: value,
                  }))
                }}
              />
              <YearDropdown
                label="Start Year"
                value={education.startYear}
                onChange={(value) => updateEducation('startYear', value)}
              />
              {!education.currentlyStudying && (
                <YearDropdown
                  label="End Year"
                  value={education.endYear}
                  onChange={(value) => updateEducation('endYear', value)}
                />
              )}
            </div>

            <label className="education-checkbox">
              <input
                type="checkbox"
                checked={education.currentlyStudying}
                onChange={(event) => updateEducation('currentlyStudying', event.target.checked)}
              />
              I currently studying
            </label>

            <button className="education-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Education'}
            </button>
            <button
              className="education-skip-button"
              type="button"
              onClick={() => navigate('/location')}
            >
              Skip for now
            </button>
          </form>
        ) : (
          <div className="saved-education">
            <div className="saved-education-heading">
              <span>Education</span>
            </div>
            {educations.map((item, index) => (
              <div className="saved-education-card" key={`${item.school}-${index}`}>
                <div className="saved-education-content">
                  <strong>{item.school}</strong>
                  <span>{item.degree}</span>
                  <span>
                    {[item.cityName, item.stateName, item.countryName]
                      .filter(Boolean)
                      .join(', ') || 'Location not added'}
                  </span>
                  <span>
                    {item.startYear || 'Start year'} —{' '}
                    {item.currentlyStudying ? 'Present' : item.endYear || 'End year'}
                  </span>
                </div>
                <span className="education-actions">
                  <button
                    type="button"
                    aria-label="Edit education"
                    onClick={() => editEducation(item, index)}
                  >
                    <img src="/assets/logo_icons/edit_icon.svg" alt="Edit" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete education"
                    onClick={() => {
                      setDeleteIndex(index)
                      setShowDeleteModal(true)
                    }}
                  >
                    <img src="/assets/logo_icons/delete_icon.svg" alt="Delete" />
                  </button>
                </span>
              </div>
            ))}
            <button
              className="education-primary-button"
              type="button"
              onClick={() => {
                setEducation({
                  ...education,
                  school: '',
                  degree: '',
                  startYear: '',
                  endYear: '',
                  currentlyStudying: false,
                })
                setEditingIndex(null)
                setShowPreview(false)
              }}
            >
              Add New Education
            </button>
            <button
              className="education-continue-button"
              type="button"
              onClick={saveEducations}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}
      </section>

      {showDeleteModal && (
        <div className="education-modal-backdrop">
          <div
            className="education-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-education-title"
          >
            <button
              className="education-modal-close"
              type="button"
              aria-label="Close"
              onClick={() => setShowDeleteModal(false)}
            >
              ×
            </button>
            <h2 id="delete-education-title">Delete Education</h2>
            <p>
              Are you sure you want to delete this education
              <br />
              entry?
            </p>
            <button
              className="education-delete-button"
              type="button"
              onClick={() => {
                setEducations((current) => current.filter((_, index) => index !== deleteIndex))
                setShowPreview(educations.length > 1)
                setShowDeleteModal(false)
                setDeleteIndex(null)
              }}
            >
              Delete Education
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function EducationField({ label, placeholder, value, onChange, hasError = false }) {
  return (
    <label className={`education-field${hasError ? ' has-error' : ''}`}>
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function YearDropdown({ label, value, onChange, disabled = false, options = educationYears }) {
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const normalizedOptions = options.map((option) =>
    typeof option === 'object' ? option : { label: option, value: option },
  )
  const selectedOption = normalizedOptions.find(
    (option) => String(option.value) === String(value),
  )

  useEffect(() => {
    const closeDropdown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', closeDropdown)

    return () => document.removeEventListener('mousedown', closeDropdown)
  }, [])

  return (
    <div className="education-field education-year-field" ref={dropdownRef}>
      <span>{label}</span>
      <button
        className="education-year-trigger"
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          {selectedOption?.label ||
            (options === educationYears ? 'Year' : `Select ${label.toLowerCase()}`)}
        </span>
        <span className="education-year-arrow" aria-hidden="true" />
      </button>

      {isOpen && !disabled && (
        <div className="education-year-menu" role="listbox">
          {normalizedOptions.map((item) => {
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={String(item.value) === String(value)}
                onClick={() => {
                  onChange(item.value)
                  setIsOpen(false)
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OptionDropdown({ label, value, options, onChange }) {
  return <YearDropdown label={label} value={value} options={options} onChange={onChange} />
}

// Each effect owns its request; obsolete responses must not change options or feedback.
function loadOptions(request, setOptions, label, setStatus) {
  let active = true
  setStatus((current) => ({ ...current, [label]: 'loading' }))
  request
    .then((response) => {
      if (!active) return
      setOptions(response.data || [])
      setStatus((current) => ({ ...current, [label]: 'idle' }))
    })
    .catch(() => {
      if (!active) return
      setStatus((current) => ({ ...current, [label]: 'failed' }))
      toast.error(`Unable to load ${label}. Please try again.`)
    })
  return () => {
    active = false
  }
}

function locationDraft(item) {
  return {
    country: item.countryName || '',
    countryId: item.countryId || '',
    state: item.stateName || '',
    stateId: item.stateId || '',
    city: item.cityName || '',
    cityId: item.cityId || '',
  }
}

function GeographyFeedback({ status, onRetry }) {
  return Object.entries(status).map(([field, state]) => {
    if (state === 'loading') {
      return <p key={field} role="status">Loading {field}…</p>
    }
    if (state !== 'failed') return null
    return (
      <p key={field} role="alert">
        Unable to load {field}.{' '}
        <button type="button" onClick={() => onRetry(field)}>
          Retry {field}
        </button>
      </p>
    )
  })
}
