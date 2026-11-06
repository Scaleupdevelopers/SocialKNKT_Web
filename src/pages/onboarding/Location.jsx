import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCities, getCountries, getStates } from '../../action/action'
import { completeProfile } from '../../action/action'
import { toast } from 'react-toastify'
import './Location.css'

const currentYear = new Date().getFullYear()
const locationYears = Array.from(
  { length: currentYear - 1955 + 1 },
  (_, index) => currentYear - index,
)

export function Location() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState(null)
  const [location, setLocation] = useState({
    country: '',
    countryId: '',
    state: '',
    stateId: '',
    city: '',
    cityId: '',
    startYear: '',
    endYear: '',
    currentlyStaying: false,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [countries, setCountries] = useState([])
  const [states, setStates] = useState([])
  const [cities, setCities] = useState([])

  useEffect(() => {
    getCountries().then((response) => setCountries(response.data || [])).catch((error) => toast.error(error.message))
  }, [])

  useEffect(() => {
    if (!location.countryId) return
    getStates({ countryId: location.countryId }).then((response) => setStates(response.data || [])).catch((error) => toast.error(error.message))
  }, [location.countryId])

  useEffect(() => {
    if (!location.countryId || !location.stateId) return
    getCities({ countryId: location.countryId, stateId: location.stateId }).then((response) => setCities(response.data || [])).catch((error) => toast.error(error.message))
  }, [location.countryId, location.stateId])

  const updateLocation = (field, value) => {
    setLocation((current) => ({ ...current, [field]: value }))

    if (value.trim?.()) {
      setFieldErrors((current) => ({ ...current, [field]: false }))
    }
  }

  const handleCurrentStayingChange = (checked) => {
    setLocation((current) => ({
      ...current,
      currentlyStaying: checked,
      country: checked ? 'India' : current.country,
      endYear: checked ? '' : current.endYear,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const errors = {
      country: !location.country.trim(),
      state: !location.state.trim(),
      city: !location.city.trim(),
    }

    setFieldErrors(errors)

    if (errors.country || errors.state || errors.city) {
      return
    }

    const nextLocation = {
      countryId: location.countryId,
      countryName: location.country,
      stateId: location.stateId,
      stateName: location.state,
      cityId: location.cityId,
      cityName: location.city,
      startYear: location.startYear ? `${location.startYear}-01-01` : '',
      endYear: location.currentlyStaying || !location.endYear ? '' : `${location.endYear}-01-01`,
      currentlyLiving: location.currentlyStaying,
    }

    setLocations((current) => editingIndex === null
      ? [...current, nextLocation]
      : current.map((item, index) => index === editingIndex ? nextLocation : item))
    setLocation({ ...location, startYear: '', endYear: '', currentlyStaying: false })
    setEditingIndex(null)
    setShowPreview(true)
  }

  const saveLocations = async () => {
    setIsSaving(true)

    try {
      const placesLived = locations.map(({ countryName, stateName, cityName, ...item }) => item)
      const response = await completeProfile({ placesLived, stepCount: 3 })

      if (response.status === true) {
        toast.success(response.message || 'Locations saved successfully.')
        navigate('/pronunciation')
      }
    } catch (error) {
      toast.error(error.message || 'Unable to save location.')
    } finally {
      setIsSaving(false)
    }
  }

  const editLocation = (item, index) => {
    setLocation({
      country: item.countryName || '',
      countryId: item.countryId || '',
      state: item.stateName || '',
      stateId: item.stateId || '',
      city: item.cityName || '',
      cityId: item.cityId || '',
      startYear: item.startYear ? item.startYear.slice(0, 4) : '',
      endYear: item.endYear ? item.endYear.slice(0, 4) : '',
      currentlyStaying: Boolean(item.currentlyLiving),
    })
    setEditingIndex(index)
    setFieldErrors({})
    setShowPreview(false)
  }

  return (
    <main className="location-page">
      <header className="location-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="location-card" aria-labelledby="location-title">
        <div className="location-progress"><span /></div>
        <h1 id="location-title">Places You’ve Lived</h1>
        <p className="location-description">
          Where have you called home?<br />
          Share cities you’ve lived in to help friends and connections learn more about your journey.
        </p>

        {!showPreview ? (
          <form className="location-form" noValidate onSubmit={handleSubmit}>
            <div className="location-grid">
              <OptionDropdown label="Country" value={location.countryId} options={countries.map((item) => ({ label: item.name, value: item.id }))} hasError={fieldErrors.country} onChange={(value) => { const item = countries.find((country) => country.id === value); setLocation((current) => ({ ...current, country: item?.name || '', countryId: value, state: '', stateId: '', city: '', cityId: '' })); setStates([]); setCities([]) }} />
              <OptionDropdown label="State" value={location.stateId} options={states.map((item) => ({ label: item.name, value: item.id }))} hasError={fieldErrors.state} onChange={(value) => { const item = states.find((state) => state.id === value); setLocation((current) => ({ ...current, state: item?.name || '', stateId: value, city: '', cityId: '' })); setCities([]) }} />
              <OptionDropdown label="City" value={location.cityId} options={cities.map((item) => ({ label: item.name, value: item.id }))} hasError={fieldErrors.city} onChange={(value) => { const item = cities.find((city) => city.id === value); setLocation((current) => ({ ...current, city: item?.name || '', cityId: value })) }} />
              <YearDropdown
                label="Start Year"
                value={location.startYear}
                onChange={(value) => updateLocation('startYear', value)}
              />
              {!location.currentlyStaying && (
                <YearDropdown
                  label="End Year"
                  value={location.endYear}
                  onChange={(value) => updateLocation('endYear', value)}
                />
              )}
            </div>

            <label className="location-checkbox">
              <input
                type="checkbox"
                checked={location.currentlyStaying}
                onChange={(event) => handleCurrentStayingChange(event.target.checked)}
              />
              I currently staying
            </label>

            <button className="location-primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Location'}
            </button>
            <button className="location-skip-button" type="button" onClick={() => navigate('/')}>
              Skip for now
            </button>
          </form>
        ) : (
          <div className="saved-location">
            <div className="saved-location-heading"><span>Location</span></div>
            {locations.map((item, index) => (
              <div className="saved-location-card" key={`${item.cityId}-${index}`}>
                <div className="saved-location-content">
                  <strong>{[item.cityName, item.stateName, item.countryName].filter(Boolean).join(', ')}</strong>
                  <span>{item.startYear || 'Start year'} — {item.currentlyLiving ? 'Present' : item.endYear || 'End year'}</span>
                </div>
                <span className="location-actions">
                  <button type="button" aria-label="Edit location" onClick={() => editLocation(item, index)}>
                    <img src="/assets/logo_icons/edit_icon.svg" alt="Edit" />
                  </button>
                  <button type="button" aria-label="Delete location" onClick={() => { setDeleteIndex(index); setShowDeleteModal(true) }}>
                    <img src="/assets/logo_icons/delete_icon.svg" alt="Delete" />
                  </button>
                </span>
              </div>
            ))}
            <button className="location-primary-button" type="button" onClick={() => { setLocation({ ...location, startYear: '', endYear: '', currentlyStaying: false }); setEditingIndex(null); setShowPreview(false) }}>
              Add New Location
            </button>
            <button className="location-continue-button" type="button" onClick={saveLocations} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}
      </section>

      {showDeleteModal && (
        <div className="location-modal-backdrop">
          <div className="location-modal" role="dialog" aria-modal="true" aria-labelledby="delete-location-title">
            <button className="location-modal-close" type="button" aria-label="Close" onClick={() => setShowDeleteModal(false)}>×</button>
            <h2 id="delete-location-title">Delete Location</h2>
            <p>Are you sure you want to remove this place from<br />your profile?</p>
            <button className="location-delete-button" type="button" onClick={() => { setLocations((current) => current.filter((_, index) => index !== deleteIndex)); setShowPreview(locations.length > 1); setShowDeleteModal(false); setDeleteIndex(null) }}>
              Delete Location
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function YearDropdown({ label, value, onChange, disabled = false }) {
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

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
    <div className="location-field location-year-field" ref={dropdownRef}>
      <span>{label}</span>
      <button
        className="location-year-trigger"
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{value || 'Year'}</span>
        <span className="location-year-arrow" aria-hidden="true" />
      </button>

      {isOpen && !disabled && (
        <div className="location-year-menu" role="listbox">
          {locationYears.map((year) => (
            <button
              key={year}
              type="button"
              role="option"
              aria-selected={String(year) === value}
              onClick={() => {
                onChange(String(year))
                setIsOpen(false)
              }}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OptionDropdown({ label, value, options, onChange, hasError = false }) {
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const closeDropdown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', closeDropdown)
    return () => document.removeEventListener('mousedown', closeDropdown)
  }, [])

  return (
    <div className={`location-field location-year-field${hasError ? ' has-error' : ''}`} ref={dropdownRef}>
      <span>{label}</span>
      <button className="location-year-trigger" type="button" onClick={() => setIsOpen((open) => !open)}>
        <span>{options.find((option) => String(option.value) === String(value))?.label || `Select ${label.toLowerCase()}`}</span>
        <span className="location-year-arrow" aria-hidden="true" />
      </button>
      {isOpen && <div className="location-year-menu" role="listbox">{options.map((option) => <button key={option.value} type="button" onClick={() => { onChange(option.value); setIsOpen(false) }}>{option.label}</button>)}</div>}
    </div>
  )
}
