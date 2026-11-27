import { useEffect, useState } from 'react'
import { getCountries, getStates, getCities } from '../../../action/action'

function useOptions(load, dependencies) {
  const [state, setState] = useState({ data: [], loading: true, error: false })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setState({ data: [], loading: true, error: false })
    load()
      .then((response) => {
        if (active) setState({ data: response.data || [], loading: false, error: false })
      })
      .catch(() => {
        if (active) setState({ data: [], loading: false, error: true })
      })
    return () => {
      active = false
    }
    // Dependencies identify the geographic parent; ignore stale requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, retry])
  return { ...state, retry: () => setRetry((value) => value + 1) }
}

function LocationSelect({ label, value, name, options, disabled, onChange }) {
  return (
    <label>
      {label}
      <select
        value={value || ''}
        disabled={disabled || options.loading}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{options.loading ? 'Loading…' : `Select ${label.toLowerCase()}`}</option>
        {value && !options.data.some((item) => String(item.id) === String(value)) && (
          <option value={value}>{name || 'Saved location'}</option>
        )}
        {options.data.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {options.error && (
        <span role="alert">
          Unable to load {label.toLowerCase()}.{' '}
          <button type="button" onClick={options.retry}>
            Retry {label.toLowerCase()}
          </button>
        </span>
      )}
    </label>
  )
}

export function LocationFields({ value, onChange }) {
  const countries = useOptions(getCountries, [])
  const states = useOptions(
    () =>
      value.countryId ? getStates({ countryId: value.countryId }) : Promise.resolve({ data: [] }),
    [value.countryId],
  )
  const cities = useOptions(
    () =>
      value.stateId
        ? getCities({ countryId: value.countryId, stateId: value.stateId })
        : Promise.resolve({ data: [] }),
    [value.countryId, value.stateId],
  )
  return (
    <>
      <LocationSelect
        label="Country"
        value={value.countryId}
        name={value.countryName}
        options={countries}
        onChange={(countryId) =>
          onChange({
            ...value,
            countryId,
            countryName: countries.data.find((item) => String(item.id) === countryId)?.name || '',
            stateId: '',
            cityId: '',
            stateName: '',
            cityName: '',
          })
        }
      />
      <LocationSelect
        label="State"
        value={value.stateId}
        name={value.stateName}
        options={states}
        disabled={!value.countryId}
        onChange={(stateId) =>
          onChange({
            ...value,
            stateId,
            stateName: states.data.find((item) => String(item.id) === stateId)?.name || '',
            cityId: '',
            cityName: '',
          })
        }
      />
      <LocationSelect
        label="City"
        value={value.cityId}
        name={value.cityName}
        options={cities}
        disabled={!value.stateId}
        onChange={(cityId) =>
          onChange({
            ...value,
            cityId,
            cityName: cities.data.find((item) => String(item.id) === cityId)?.name || '',
          })
        }
      />
    </>
  )
}
