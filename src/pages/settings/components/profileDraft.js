export const sections = [
  ['basic', 'Basic Details'],
  ['work', 'Work Experience'],
  ['education', 'Education'],
  ['location', 'Location'],
  ['pronunciation', 'Name Pronunciation'],
  ['media', 'Media'],
]
export const collections = {
  work: {
    source: 'workExperiences',
    target: 'workExperience',
    fields: ['jobTitle', 'companyName', 'employmentType'],
    start: 'startDate',
    end: 'endDate',
    current: 'currentlyWorking',
  },
  education: {
    source: 'educations',
    target: 'education',
    fields: ['school', 'degree'],
    start: 'startYear',
    end: 'endYear',
    current: 'currentlyStudying',
  },
  location: {
    source: 'places',
    target: 'placesLived',
    fields: [],
    start: 'startYear',
    end: 'endYear',
    current: 'currentlyLiving',
  },
}
export const basicFields = [
  'fname',
  'lname',
  'username',
  'dob',
  'email',
  'gender',
  'bio',
  'website',
  'phone',
]
const pick = (value, keys) =>
  Object.fromEntries(
    keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]),
  )

export function createDraft(profile, section) {
  const config = collections[section]
  if (config) return (profile[config.source] || []).map((item) => ({ ...item }))
  if (section === 'basic')
    return Object.fromEntries(basicFields.map((key) => [key, profile[key] || '']))
  if (section === 'pronunciation') {
    return {
      phonetic_spelling: profile.phonetic_spelling || '',
      record_name: profile.record_name || '',
    }
  }
  return createMediaDraft(profile)
}

function createMediaDraft(profile) {
  return {
    image: profile.image || '',
    resume: profile.resume || '',
    headshot: [...(profile.headshot || [])],
    certificates_or_licences: [...(profile.certificates_or_licences || [])],
  }
}

export function buildPayload(section, draft, profile) {
  if (section === 'pronunciation') {
    return { phonetic_spelling: draft.phonetic_spelling, record_name: draft.record_name }
  }
  // These scalars are explicitly assigned by the server even during section updates.
  const preserved = { bio: profile.bio || '', website: profile.website || '' }
  const config = collections[section]
  if (!config) {
    const initial = createDraft(profile, section)
    const changes = Object.fromEntries(
      Object.entries(draft).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(initial[key]),
      ),
    )
    return { ...preserved, ...changes }
  }
  const keys = [
    ...config.fields,
    'countryId',
    'stateId',
    'cityId',
    config.start,
    config.end,
    config.current,
  ]
  return {
    ...preserved,
    [config.target]: draft.map((item) => {
      const entry = pick(item, keys)
      for (const key of ['countryId', 'stateId', 'cityId']) {
        if (entry[key] === '') entry[key] = null
      }
      return entry
    }),
  }
}

export function validateDraft(section, draft, profile) {
  if (section === 'basic') {
    const cannotClear = ['fname', 'lname', 'username', 'dob', 'email', 'phone', 'gender']
    if (cannotClear.some((key) => profile[key] && !draft[key]?.trim()))
      return 'Existing name, contact, birth date and gender fields cannot be cleared.'
    return ''
  }
  const config = collections[section]
  if (!config) return ''
  const required = config.fields.filter((key) => key !== 'employmentType')
  if (draft.some((item) => required.some((key) => !item[key]?.trim())))
    return 'Complete the required details for each entry.'
  if (
    section === 'location' &&
    draft.some((item) => !item.countryId || !item.stateId || !item.cityId)
  )
    return 'Choose country, state and city for each location.'
  const invalidDates = draft.some(
    (item) => item[config.start] && item[config.end] && item[config.end] < item[config.start],
  )
  return invalidDates ? 'End date must be on or after start date.' : ''
}
