// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EditProfileContent } from './EditProfileContent'
import { useProfile } from '../../../context/ProfileContext'
import { completeProfile, updateProfile, uploadFile } from '../../../action/action'

vi.mock('../../../context/ProfileContext', () => ({
  useProfile: vi.fn(),
  normalizeProfile: (data) => ({ ...data, fullName: `${data.fname} ${data.lname}` }),
}))
vi.mock('../../../action/action', async (original) => ({
  ...(await original()),
  updateProfile: vi.fn(),
  completeProfile: vi.fn(),
  uploadFile: vi.fn(),
  getCountries: vi.fn().mockResolvedValue({ data: [] }),
  getStates: vi.fn().mockResolvedValue({ data: [] }),
  getCities: vi.fn().mockResolvedValue({ data: [] }),
}))

const profile = {
  id: 'user',
  fname: 'Sam',
  lname: 'Lee',
  username: 'sam',
  email: 'sam@example.org',
  bio: 'Original',
  website: '',
  workExperiences: [],
}
let setProfile
beforeEach(() => {
  vi.clearAllMocks()
  setProfile = vi.fn()
  useProfile.mockReturnValue({
    profile,
    isLoading: false,
    error: null,
    setProfile,
    refreshProfile: vi.fn(),
  })
})
afterEach(cleanup)

it('saves and clears pronunciation through the mobile complete-profile contract', async () => {
  const source = {
    ...profile,
    phonetic_spelling: 'Sam',
    record_name: 'https://example.org/name.webm',
  }
  useProfile.mockReturnValue({ profile: source, setProfile })
  completeProfile.mockResolvedValue({
    status: true,
    data: { ...source, phonetic_spelling: '' },
  })
  render(<EditProfileContent />)
  fireEvent.click(screen.getByRole('button', { name: 'Name Pronunciation' }))
  fireEvent.change(screen.getByLabelText(/Phonetic spelling/i), { target: { value: '' } })
  fireEvent.click(screen.getByText('Save'))
  await screen.findByText('Profile saved.')
  expect(completeProfile).toHaveBeenCalledWith({
    phonetic_spelling: '',
    record_name: source.record_name,
  })
  expect(updateProfile).not.toHaveBeenCalled()
})

it('keeps the same draft mounted through background refresh, failure and retry', () => {
  const refreshProfile = vi.fn()
  const context = { profile, setProfile, refreshProfile }
  useProfile.mockReturnValue(context)
  const view = render(<EditProfileContent />)
  const input = screen.getByLabelText('First Name')
  fireEvent.change(input, { target: { value: 'Unsaved name' } })

  useProfile.mockReturnValue({ ...context, isLoading: true })
  view.rerender(<EditProfileContent />)
  expect(screen.getByLabelText('First Name')).toBe(input)
  expect(input.value).toBe('Unsaved name')

  useProfile.mockReturnValue({ ...context, error: new Error('Refresh failed') })
  view.rerender(<EditProfileContent />)
  expect(screen.getByLabelText('First Name')).toBe(input)
  expect(input.value).toBe('Unsaved name')
  fireEvent.click(screen.getByText('Retry'))
  expect(refreshProfile).toHaveBeenCalledTimes(1)

  useProfile.mockReturnValue({ ...context, isLoading: true })
  view.rerender(<EditProfileContent />)
  useProfile.mockReturnValue({ ...context, profile: { ...profile, fname: 'Refreshed name' } })
  view.rerender(<EditProfileContent />)
  expect(screen.getByLabelText('First Name')).toBe(input)
  expect(input.value).toBe('Unsaved name')
  fireEvent.click(screen.getByText('Cancel'))
  expect(screen.getByLabelText('First Name').value).toBe('Refreshed name')
  expect(updateProfile).not.toHaveBeenCalled()
})

it('loads real values and cancels edits without sending requests', () => {
  render(<EditProfileContent />)
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Changed' } })
  fireEvent.click(screen.getByText('Cancel'))
  expect(screen.getByLabelText('First Name').value).toBe('Sam')
  expect(updateProfile).not.toHaveBeenCalled()
})
it('retains draft on failure and retries a save with normalized context update', async () => {
  updateProfile
    .mockRejectedValueOnce(new Error('private server details'))
    .mockResolvedValueOnce({ status: true, data: { ...profile, fname: 'Alex' } })
  render(<EditProfileContent />)
  fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alex' } })
  fireEvent.click(screen.getByText('Save'))
  await screen.findByRole('alert')
  expect(screen.getByLabelText('First Name').value).toBe('Alex')
  expect(screen.getByRole('alert').textContent).not.toContain('private server details')
  fireEvent.click(screen.getByText('Save'))
  await screen.findByText('Profile saved.')
  expect(updateProfile).toHaveBeenLastCalledWith({
    bio: 'Original',
    website: '',
    fname: 'Alex',
  })
  expect(setProfile).toHaveBeenCalledWith(
    expect.objectContaining({ fname: 'Alex', fullName: 'Alex Lee' }),
  )
})
it('prevents duplicate submissions while saving', async () => {
  let resolve
  updateProfile.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  render(<EditProfileContent />)
  fireEvent.click(screen.getByText('Save'))
  fireEvent.submit(screen.getByText('Saving…').closest('form'))
  expect(updateProfile).toHaveBeenCalledTimes(1)
  resolve({ status: true, data: profile })
  await waitFor(() => expect(screen.getByText('Save').disabled).toBe(false))
})
it('shows loading and retries load failure', () => {
  const retry = vi.fn()
  useProfile.mockReturnValue({ isLoading: true })
  const view = render(<EditProfileContent />)
  expect(screen.getByRole('status').textContent).toContain('Loading')
  useProfile.mockReturnValue({ profile: null, error: new Error(), refreshProfile: retry })
  view.rerender(<EditProfileContent />)
  fireEvent.click(screen.getByText('Retry'))
  expect(retry).toHaveBeenCalledTimes(1)
})

it('uploads media to a draft and saves only changed fields', async () => {
  uploadFile.mockResolvedValue('https://example.org/resume.pdf')
  updateProfile.mockResolvedValue({
    status: true,
    data: { ...profile, resume: 'https://example.org/resume.pdf' },
  })
  render(<EditProfileContent />)
  fireEvent.click(screen.getByRole('button', { name: 'Media' }))
  const file = new File(['test'], 'resume.pdf', { type: 'application/pdf' })
  fireEvent.change(screen.getByLabelText('Resume'), { target: { files: [file] } })
  await screen.findByText('Resume 1')
  expect(updateProfile).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Save'))
  await screen.findByText('Profile saved.')
  expect(updateProfile).toHaveBeenCalledWith({
    bio: 'Original',
    website: '',
    resume: 'https://example.org/resume.pdf',
  })
})

it('rejects unsupported media before requesting upload', async () => {
  render(<EditProfileContent />)
  fireEvent.click(screen.getByRole('button', { name: 'Media' }))
  fireEvent.change(screen.getByLabelText('Profile photo'), {
    target: { files: [new File(['test'], 'file.svg', { type: 'image/svg+xml' })] },
  })
  expect(screen.getByRole('alert').textContent).toContain('supported image')
  expect(uploadFile).not.toHaveBeenCalled()
})

it('removes an entry without losing its siblings on save', async () => {
  const source = {
    ...profile,
    workExperiences: [
      { jobTitle: 'Designer', companyName: 'A' },
      { jobTitle: 'Engineer', companyName: 'B' },
    ],
  }
  useProfile.mockReturnValue({ profile: source, setProfile })
  updateProfile.mockResolvedValue({
    status: true,
    data: { ...source, workExperiences: [source.workExperiences[1]] },
  })
  render(<EditProfileContent />)
  fireEvent.click(screen.getByRole('button', { name: 'Work Experience' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove entry 1' }))
  fireEvent.click(screen.getByText('Save'))
  await screen.findByText('Profile saved.')
  expect(updateProfile).toHaveBeenCalledWith({
    bio: 'Original',
    website: '',
    workExperience: [{ jobTitle: 'Engineer', companyName: 'B' }],
  })
})

it('starts collapsed, preserves edits when collapsed, and Cancel restores saved cards', () => {
  const source = {
    ...profile,
    workExperiences: [
      {
        jobTitle: 'Product Designer',
        companyName: 'WaveStudio',
        employmentType: 'Full-time',
        cityName: 'Bangalore',
        countryName: 'India',
        startDate: '2022-03-01',
        currentlyWorking: true,
      },
    ],
  }
  useProfile.mockReturnValue({ profile: source, setProfile })
  render(<EditProfileContent />)
  fireEvent.click(screen.getByRole('button', { name: 'Work Experience' }))
  expect(screen.queryByLabelText('Job Title')).toBeNull()
  expect(screen.getByText('March 2022, Present')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Edit entry 1' }))
  fireEvent.change(screen.getByLabelText('Job Title'), { target: { value: 'Lead Designer' } })
  fireEvent.click(screen.getByText('Done editing'))
  expect(screen.getByText('Lead Designer')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Edit entry 1' }))
  expect(screen.getByLabelText('Job Title').value).toBe('Lead Designer')
  fireEvent.click(screen.getByText('Cancel'))
  expect(screen.queryByLabelText('Job Title')).toBeNull()
  expect(screen.getByText('Product Designer')).toBeTruthy()
  expect(updateProfile).not.toHaveBeenCalled()
})

it('expands Add, keeps siblings, and Cancel removes the new draft', () => {
  useProfile.mockReturnValue({
    profile: { ...profile, educations: [{ school: 'Saved college', degree: 'Design' }] },
    setProfile,
  })
  render(<EditProfileContent />)
  fireEvent.click(screen.getByRole('button', { name: 'Education', exact: true }))
  fireEvent.click(screen.getByText('Add education'))
  expect(screen.getByLabelText('School / College')).toBeTruthy()
  expect(screen.getByText('Saved college')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('School / College'), {
    target: { value: 'Draft college' },
  })
  fireEvent.click(screen.getByText('Done editing'))
  fireEvent.click(screen.getByText('Save'))
  expect(screen.getByRole('alert').textContent).toContain('required details')
  expect(updateProfile).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Cancel'))
  expect(screen.queryByText('Draft college')).toBeNull()
  expect(screen.getByText('Saved college')).toBeTruthy()
})
