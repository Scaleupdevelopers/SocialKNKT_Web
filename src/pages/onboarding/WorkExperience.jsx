import { LoadingSkeleton } from '../../components/common/RequestState'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { completeProfile, getCities, getCountries, getStates } from '../../action/action'
import './WorkExperience.css'

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const currentYear = new Date().getFullYear()
const years = Array.from({ length: currentYear - 1951 + 1 }, (_, index) => currentYear - index)

const emptyExperience = {
  title: '',
  company: '',
  country: '',
  countryId: '',
  state: '',
  stateId: '',
  city: '',
  cityId: '',
  employmentType: '',
  startDate: '',
  startMonth: '',
  startYear: '',
  endDate: '',
  endMonth: '',
  endYear: '',
  isCurrent: false,
}

const getDaysInMonth = (month, year = 2026) => {
  if (Number(month) === 2) {
    return 29
  }

  return month ? new Date(Number(year), Number(month), 0).getDate() : 31
}

const splitDate = (date) => {
  if (!date) {
    return { day: '', month: '', year: '' }
  }

  const [year, month, day] = date.split('-')

  return {
    day: String(Number(day)),
    month: String(Number(month)),
    year,
  }
}

export function WorkExperience() {
  const navigate = useNavigate()
  const [experience, setExperience] = useState(emptyExperience)
  const [experiences, setExperiences] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
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

  const [isLoadingCountries, setIsLoadingCountries] = useState(false)
  const [isLoadingStates, setIsLoadingStates] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)

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
      setIsLoadingCountries,
    )
  }, [geographyRetries.countries])

  useEffect(() => {
    setStates([])
    setGeographyStatus((current) => ({ ...current, states: 'idle' }))
    setIsLoadingStates(false)
    if (!experience.countryId) return
    return loadOptions(
      getStates({ countryId: experience.countryId }),
      setStates,
      'states',
      setGeographyStatus,
      setIsLoadingStates,
    )
  }, [experience.countryId, geographyRetries.states])

  useEffect(() => {
    setCities([])
    setGeographyStatus((current) => ({ ...current, cities: 'idle' }))
    setIsLoadingCities(false)
    if (!experience.countryId || !experience.stateId) return
    return loadOptions(
      getCities({ countryId: experience.countryId, stateId: experience.stateId }),
      setCities,
      'cities',
      setGeographyStatus,
      setIsLoadingCities,
    )
  }, [experience.countryId, experience.stateId, geographyRetries.cities])

  const updateExperience = (field, value) => {
    setExperience((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: false }))
  }

  const formatDate = (day, month, year) => {
    if (!day || !month || !year) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const toPayload = (item) => ({
    jobTitle: item.title,
    companyName: item.company,
    countryId: item.countryId,
    countryName: item.country,
    stateId: item.stateId,
    stateName: item.state,
    cityId: item.cityId,
    cityName: item.city,
    startDate: formatDate(item.startDate, item.startMonth, item.startYear),
    endDate: item.isCurrent ? '' : formatDate(item.endDate, item.endMonth, item.endYear) || '',
    employmentType: item.employmentType,
    currentlyWorking: item.isCurrent,
  })

  const addExperience = (event) => {
    event.preventDefault()

    const errors = {
      title: !experience.title.trim(),
      company: !experience.company.trim(),
    }

    if (errors.title || errors.company) {
      setFieldErrors(errors)
      return
    }

    const nextExperience = toPayload(experience)

    setExperiences((current) => {
      if (editingIndex === null) {
        return [...current, nextExperience]
      }

      return current.map((item, index) => (index === editingIndex ? nextExperience : item))
    })
    setExperience(emptyExperience)
    setEditingIndex(null)
    setShowPreview(true)
  }

  const editExperience = (item, index) => {
    const startDate = splitDate(item.startDate)
    const endDate = splitDate(item.endDate)

    setExperience({
      title: item.jobTitle || '',
      company: item.companyName || '',
      ...locationDraft(item),
      employmentType: item.employmentType || '',
      startDate: startDate.day,
      startMonth: startDate.month,
      startYear: startDate.year,
      endDate: endDate.day,
      endMonth: endDate.month,
      endYear: endDate.year,
      isCurrent: Boolean(item.currentlyWorking),
    })
    setEditingIndex(index)
    setFieldErrors({})
    setShowPreview(false)
  }

  const saveExperiences = async () => {
    if (savePending.current) return
    if (!experiences.length) {
      toast.error('Please add at least one work experience.')
      return
    }
    savePending.current = true
    setIsSaving(true)

    try {
      const entries = experiences.map((entry) => {
        const item = { ...entry }
        delete item.countryName
        delete item.stateName
        delete item.cityName
        return item
      })
      const response = await completeProfile({ workExperience: entries, stepCount: 1 })
      if (!mounted.current) return
      if (response.status !== true) throw new Error('Save failed')
      toast.success('Work experience saved successfully.')
      navigate('/education')
    } catch {
      if (mounted.current) toast.error('Unable to save work experience. Please try again.')
    } finally {
      savePending.current = false
      if (mounted.current) setIsSaving(false)
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
        <div className="progress-track">
          <span />
        </div>
        <h1 id="work-title">Add your Work Experience</h1>
        <p className="work-description">
          Show what you do and where you shine.
          <br />
          Highlight your current role or past jobs to help others connect with your professional
          side.
        </p>

        {!showPreview && (
          <form className="work-form" onSubmit={addExperience} noValidate>
            <GeographyFeedback status={geographyStatus} onRetry={retryGeography} />
            <div className="work-grid">
              <Field
                label="Job Title"
                value={experience.title}
                placeholder="Enter your Job Title"
                hasError={fieldErrors.title}
                onChange={(value) => updateExperience('title', value)}
              />
              <Field
                label="Company Name"
                value={experience.company}
                placeholder="Enter your company name"
                hasError={fieldErrors.company}
                onChange={(value) => updateExperience('company', value)}
              />
              <label className="work-field">
                <span>Country</span>
                <DateDropdown
                  label="Select country"
                  loading={isLoadingCountries}
                  value={experience.countryId}
                  options={countries.map((country) => ({
                    label: country.name,
                    value: country.id,
                  }))}
                  onChange={(value) => {
                    const selectedCountry = countries.find((country) => country.id === value)
                    setExperience((current) => ({
                      ...current,
                      country: selectedCountry?.name || '',
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
              </label>
              <label className="work-field">
                <span>State</span>
                <DateDropdown
                  label="Select state"
                  loading={isLoadingStates}
                  value={experience.stateId}
                  options={states.map((state) => ({ label: state.name, value: state.id }))}
                  onChange={(value) => {
                    const selectedState = states.find((state) => state.id === value)
                    setExperience((current) => ({
                      ...current,
                      state: selectedState?.name || '',
                      stateId: value,
                      city: '',
                      cityId: '',
                    }))
                    setCities([])
                  }}
                />
              </label>
              <label className="work-field">
                <span>City</span>
                <DateDropdown
                  label="Select city"
                  loading={isLoadingCities}
                  value={experience.cityId}
                  options={cities.map((city) => ({ label: city.name, value: city.id }))}
                  onChange={(value) => {
                    const selectedCity = cities.find((city) => city.id === value)
                    setExperience((current) => ({
                      ...current,
                      city: selectedCity?.name || '',
                      cityId: value,
                    }))
                  }}
                />
              </label>
              <label className="work-field">
                <span>Employment Type</span>
                <DateDropdown
                  label="Select your Employment Type"
                  value={experience.employmentType}
                  options={['Full-time', 'Part-time', 'Flex/Hybrid', 'Seasonal']}
                  onChange={(value) => updateExperience('employmentType', value)}
                />
              </label>
            </div>

            <div className="date-grid">
              <DateGroup
                label="Start Date"
                day={experience.startDate}
                month={experience.startMonth}
                year={experience.startYear}
                onChange={updateExperience}
              />
              {!experience.isCurrent && (
                <DateGroup
                  label="End Date"
                  prefix="end"
                  day={experience.endDate}
                  month={experience.endMonth}
                  year={experience.endYear}
                  onChange={updateExperience}
                />
              )}
            </div>

            <label className="work-checkbox">
              <input
                type="checkbox"
                checked={experience.isCurrent}
                onChange={(event) => updateExperience('isCurrent', event.target.checked)}
              />
              I currently work here
            </label>

            <button className="work-primary-button" type="submit">
              Add Work Experience
            </button>
          </form>
        )}

        {showPreview && experiences.length > 0 && (
          <div className="saved-work">
            <div className="saved-work-heading">
              <span>Work Experience</span>
            </div>
            {experiences.map((item, index) => (
              <div className="saved-work-card" key={`${item.companyName}-${index}`}>
                <div className="saved-work-card-content">
                  <strong>{item.jobTitle}</strong>
                  <span>{item.companyName}</span>
                  <span>
                    {[item.cityName, item.stateName, item.countryName]
                      .filter(Boolean)
                      .join(', ') || 'Location not added'}
                  </span>
                  <span>{item.employmentType || 'Employment type not added'}</span>
                  <span>
                    {item.startDate || 'Start date'} —{' '}
                    {item.currentlyWorking ? 'Present' : item.endDate || 'End date'}
                  </span>
                </div>
                <div className="saved-work-actions">
                  <button
                    type="button"
                    aria-label="Edit work experience"
                    onClick={() => editExperience(item, index)}
                  >
                    <img src="/assets/logo_icons/edit_icon.svg" alt="Edit" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete work experience"
                    onClick={() => {
                      setDeleteIndex(index)
                      setShowDeleteModal(true)
                    }}
                  >
                    <img src="/assets/logo_icons/delete_icon.svg" alt="Delete" />
                  </button>
                </div>
              </div>
            ))}
            <button
              className="work-primary-button"
              type="button"
              onClick={() => {
                setExperience(emptyExperience)
                setEditingIndex(null)
                setFieldErrors({})
                setShowPreview(false)
              }}
            >
              Add New Work Experience
            </button>
            <button
              className="continue-button"
              type="button"
              onClick={saveExperiences}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {!showPreview && (
          <button className="skip-button" type="button" onClick={() => navigate('/education')}>
            Skip for now
          </button>
        )}
      </section>

      {showDeleteModal && (
        <div className="delete-modal-backdrop" role="presentation">
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <button
              className="delete-modal-close"
              type="button"
              aria-label="Close"
              onClick={() => setShowDeleteModal(false)}
            >
              ×
            </button>
            <h2 id="delete-title">Delete Experience</h2>
            <p>
              This action will permanently remove this entry from
              <br />
              your profile.
            </p>
            <button className="delete-confirm-button" type="button" onClick={removeExperience}>
              Delete Work Experience
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function Field({ label, value, placeholder, hasError, onChange }) {
  return (
    <label className={`work-field ${hasError ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  )
}

function DateGroup({ label, prefix = 'start', day, month, year, onChange }) {
  const daysInSelectedMonth = getDaysInMonth(month, year)

  const days = Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1)

  const handleMonthChange = (value) => {
    onChange(`${prefix}Month`, value)

    if (day && Number(day) > getDaysInMonth(value, year)) {
      onChange(`${prefix}Date`, '')
    }
  }

  const handleYearChange = (value) => {
    onChange(`${prefix}Year`, value)

    if (day && month && Number(day) > getDaysInMonth(month, value)) {
      onChange(`${prefix}Date`, '')
    }
  }

  return (
    <fieldset className="date-group">
      <legend>{label}</legend>
      <div>
        <DateDropdown
          label="Month"
          value={month}
          options={months.map((item, index) => ({ label: item, value: index + 1 }))}
          onChange={handleMonthChange}
        />
        <DateDropdown
          label="Date"
          value={day}
          options={days}
          onChange={(value) => onChange(`${prefix}Date`, value)}
        />
        <DateDropdown label="Year" value={year} options={years} onChange={handleYearChange} />
      </div>
    </fieldset>
  )
}

function DateDropdown({ label, value, options, onChange, loading = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const normalizedOptions = options.map((option) =>
    typeof option === 'object' ? option : { label: option, value: option },
  )

  const selectedOption = normalizedOptions.find(
    (option) => String(option.value) === String(value),
  )

  return (
    <div ref={dropdownRef} className={`date-dropdown ${isOpen ? 'is-open' : ''}`}>
      <button
        className="date-dropdown-trigger"
        disabled={loading}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedOption?.label || label}
        <span className="date-dropdown-arrow" />
      </button>
      {loading && (
        <LoadingSkeleton
          label={`Loading ${label.replace('Select ', '')}…`}
          variant="field"
          count={1}
        />
      )}
      {isOpen && !loading && (
        <div className="date-dropdown-menu" role="listbox">
          {normalizedOptions.map((option) => (
            <button
              key={option.value}
              className={String(option.value) === String(value) ? 'selected' : ''}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Each effect owns its request; obsolete responses must not change options or feedback.
function loadOptions(request, setOptions, label, setStatus, setLoading) {
  let active = true
  setStatus((current) => ({ ...current, [label]: 'loading' }))
  setLoading(true)
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
    .finally(() => {
      if (active) setLoading(false)
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
