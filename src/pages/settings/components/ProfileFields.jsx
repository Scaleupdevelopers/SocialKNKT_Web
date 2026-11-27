import { useState } from 'react'
import { collections, sections } from './profileDraft'
import { LocationFields } from './LocationFields'
import { MediaFields } from './MediaFields'
const editIcon = '/assets/logo_icons/profile-edit-outline.svg'
const deleteIcon = '/assets/logo_icons/profile-delete-outline.svg'

const labels = {
  fname: 'First Name',
  lname: 'Last Name',
  username: 'User Name',
  dob: 'Birth date',
  email: 'Email address',
  phone: 'Phone',
  website: 'Website',
  jobTitle: 'Job Title',
  companyName: 'Company Name',
  employmentType: 'Employment Type',
  school: 'School / College',
  degree: 'Degree',
  phonetic_spelling: 'Phonetic Spelling',
}
const inputTypes = { dob: 'date', email: 'email', website: 'url', phone: 'tel' }
export function Field({ name, value, onChange, type = 'text', required = false, ...rest }) {
  return (
    <label>
      {labels[name] || name}
      <input
        {...rest}
        required={required}
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function BasicFields({ draft, onChange }) {
  const change = (key, value) => onChange({ ...draft, [key]: value })
  return (
    <>
      <div className="edit-profile-grid">
        {['fname', 'lname', 'username', 'dob'].map((key) => (
          <Field
            key={key}
            name={key}
            type={inputTypes[key]}
            value={key === 'dob' ? draft[key].slice(0, 10) : draft[key]}
            onChange={(value) => change(key, value)}
          />
        ))}
      </div>
      <Field
        name="email"
        type="email"
        value={draft.email}
        onChange={(value) => change('email', value)}
      />
      <fieldset className="profile-gender">
        <legend>Gender</legend>
        {['Male', 'Female', 'Transgender', 'Gender Neutral', 'Non Binary', 'Other'].map(
          (gender) => (
            <label key={gender}>
              <input
                type="radio"
                name="gender"
                checked={draft.gender.toLowerCase() === gender.toLowerCase()}
                onChange={() => change('gender', gender)}
              />
              {gender}
            </label>
          ),
        )}
      </fieldset>
      <label>
        Bio
        <textarea value={draft.bio} onChange={(event) => change('bio', event.target.value)} />
      </label>
      <div className="edit-profile-grid">
        {['phone', 'website'].map((key) => (
          <Field
            key={key}
            name={key}
            type={inputTypes[key]}
            value={draft[key]}
            onChange={(value) => change(key, value)}
          />
        ))}
      </div>
    </>
  )
}

function CollectionFields({ section, draft, onChange }) {
  const [editing, setEditing] = useState(null)
  const config = collections[section]
  const update = (index, next) =>
    onChange(draft.map((item, position) => (position === index ? next : item)))
  const add = () => {
    setEditing(draft.length)
    onChange([...draft, { [config.current]: false }])
  }
  const remove = (index) => {
    setEditing(null)
    onChange(draft.filter((_, position) => position !== index))
  }
  return (
    <>
      {!draft.length && (
        <>
          <h3>{sections.find(([key]) => key === section)[1]}</h3>
          <p>No entries added yet.</p>
        </>
      )}
      {draft.map((item, index) => (
        <div className="profile-collection-item" key={index}>
          <div className="profile-summary-heading">
            <h3>
              {sections.find(([key]) => key === section)[1]}
              {index > 0 ? ` ${index + 1}` : ''}
            </h3>
            <div className="profile-summary-actions">
              <button
                type="button"
                aria-label={`Edit entry ${index + 1}`}
                aria-expanded={editing === index}
                onClick={() => setEditing(editing === index ? null : index)}
              >
                <img src={editIcon} alt="" />
              </button>
              <button
                type="button"
                aria-label={`Remove entry ${index + 1}`}
                onClick={() => remove(index)}
              >
                <img src={deleteIcon} alt="" />
              </button>
            </div>
          </div>
          {editing !== index ? (
            <CollectionSummary section={section} item={item} />
          ) : (
            <fieldset className="profile-entry">
              <legend>Entry {index + 1}</legend>
              <div className="edit-profile-grid">
                {config.fields.map((key) => (
                  <Field
                    key={key}
                    name={key}
                    value={item[key]}
                    required={key !== 'employmentType'}
                    onChange={(value) => update(index, { ...item, [key]: value })}
                  />
                ))}
                <LocationFields value={item} onChange={(next) => update(index, next)} />
                <Field
                  name={section === 'work' ? 'Start Date' : 'Start Year'}
                  type={section === 'work' ? 'date' : 'number'}
                  min={section === 'work' ? undefined : 1900}
                  max={section === 'work' ? undefined : 2200}
                  value={item[config.start]?.slice(0, section === 'work' ? 10 : 4)}
                  onChange={(value) => update(index, { ...item, [config.start]: value })}
                />
                {!item[config.current] && (
                  <Field
                    name={section === 'work' ? 'End Date' : 'End Year'}
                    type={section === 'work' ? 'date' : 'number'}
                    min={section === 'work' ? undefined : 1900}
                    max={section === 'work' ? undefined : 2200}
                    value={item[config.end]?.slice(0, section === 'work' ? 10 : 4)}
                    onChange={(value) => update(index, { ...item, [config.end]: value })}
                  />
                )}
              </div>
              <label className="profile-current">
                <input
                  type="checkbox"
                  checked={Boolean(item[config.current])}
                  onChange={(event) =>
                    update(index, {
                      ...item,
                      [config.current]: event.target.checked,
                      [config.end]: event.target.checked ? '' : item[config.end],
                    })
                  }
                />
                {
                  {
                    work: 'I currently work here',
                    education: 'I currently study here',
                    location: 'I currently live here',
                  }[section]
                }
              </label>
              <button type="button" onClick={() => setEditing(null)}>
                Done editing
              </button>
            </fieldset>
          )}
        </div>
      ))}
      <button className="profile-add-entry" type="button" onClick={add}>
        Add {section === 'work' ? 'work experience' : section}
      </button>
    </>
  )
}

function CollectionSummary({ section, item }) {
  const config = collections[section]
  const location = [item.cityName, item.countryName].filter(Boolean).join(', ')
  const date = (value) => {
    if (!value) return ''
    if (section !== 'work') return String(value).slice(0, 4)
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
  const dates = [
    date(item[config.start]),
    item[config.current] ? 'Present' : date(item[config.end]),
  ]
    .filter(Boolean)
    .join(section === 'work' ? ', ' : '-')
  const lines =
    section === 'work'
      ? [
          item.jobTitle,
          [item.companyName, item.employmentType].filter(Boolean).join(', '),
          location,
          dates,
        ]
      : [item.school, item.degree, location, dates]
  return (
    <div className={`profile-summary-card profile-summary-${section}`}>
      {lines.filter(Boolean).map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  )
}

export function ProfileFields({ section, draft, onChange, onBusy, onError }) {
  if (section === 'basic') return <BasicFields draft={draft} onChange={onChange} />
  if (collections[section])
    return <CollectionFields section={section} draft={draft} onChange={onChange} />
  if (section === 'media')
    return <MediaFields draft={draft} onChange={onChange} onBusy={onBusy} onError={onError} />
  return (
    <Field
      name="phonetic_spelling"
      required
      value={draft.phonetic_spelling}
      onChange={(value) => onChange({ phonetic_spelling: value })}
    />
  )
}
