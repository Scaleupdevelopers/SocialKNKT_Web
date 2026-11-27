import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { AddMedia } from './AddMedia'
import { updateBannerImage, updateProfile, uploadFile } from '../../action/action'
import { useProfile } from '../../context/ProfileContext'

vi.mock('../../action/action', () => ({
  updateBannerImage: vi.fn(),
  updateProfile: vi.fn(),
  uploadFile: vi.fn(),
}))
vi.mock('../../context/ProfileContext', () => ({ useProfile: vi.fn() }))
const profile = { id: 'me', bio: 'Keep bio', website: 'https://example.com' }
const setProfile = vi.fn()
const photo = new File(['photo'], 'photo.png', { type: 'image/png' })
const banner = new File(['banner'], 'banner.jpg', { type: 'image/jpeg' })
function setup() {
  return render(
    <MemoryRouter initialEntries={['/add-media']}>
      <Routes>
        <Route path="/add-media" element={<AddMedia />} />
        <Route path="/home" element={<h1>Home destination</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}
function choose(label, file) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })
}
beforeEach(() => {
  vi.resetAllMocks()
  useProfile.mockReturnValue({ profile, setProfile })
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    }),
  )
  uploadFile.mockImplementation(async (file) => 'https://example.com/' + file.name)
  updateProfile.mockResolvedValue({
    status: true,
    data: { ...profile, image: 'https://example.com/photo.png' },
  })
  updateBannerImage.mockResolvedValue({ status: true })
})
it('saves profile and banner through existing actions preserving unrelated fields', async () => {
  setup()
  choose('Profile Picture', photo)
  choose('Banner', banner)
  fireEvent.click(screen.getByText('Continue'))
  await screen.findByText('Home destination')
  expect(updateProfile).toHaveBeenCalledWith({
    bio: profile.bio,
    website: profile.website,
    image: 'https://example.com/photo.png',
  })
  expect(updateBannerImage).toHaveBeenCalledWith('https://example.com/banner.jpg')
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
})
it('retries partial failure without reuploading or resaving the completed photo', async () => {
  updateBannerImage
    .mockRejectedValueOnce(new Error('Private diagnostics'))
    .mockResolvedValueOnce({ status: true })
  setup()
  choose('Profile Picture', photo)
  choose('Banner', banner)
  fireEvent.click(screen.getByText('Continue'))
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).not.toContain('Private diagnostics')
  fireEvent.click(screen.getByText('Continue'))
  await screen.findByText('Home destination')
  expect(uploadFile).toHaveBeenCalledTimes(2)
  expect(updateProfile).toHaveBeenCalledTimes(1)
  expect(updateBannerImage).toHaveBeenCalledTimes(2)
})
it('locks repeated submissions and skips safely without writes', async () => {
  let done
  uploadFile.mockReturnValueOnce(
    new Promise((resolve) => {
      done = resolve
    }),
  )
  const view = setup()
  choose('Profile Picture', photo)
  fireEvent.click(screen.getByText('Continue'))
  fireEvent.submit(screen.getByText('Saving…').closest('form'))
  expect(uploadFile).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Skip for now').disabled).toBe(true)
  view.unmount()
  await act(async () => done('https://example.com/photo.png'))
  expect(updateProfile).not.toHaveBeenCalled()
  setup()
  fireEvent.click(screen.getByText('Skip for now'))
  await screen.findByText('Home destination')
  expect(updateProfile).not.toHaveBeenCalled()
})
it('rejects unsupported files and keeps content upload unavailable until its mapping is decided', () => {
  setup()
  choose('Profile Picture', new File(['x'], 'script.svg', { type: 'image/svg+xml' }))
  expect(screen.getByRole('alert').textContent).toContain('PNG or JPG')
  expect(uploadFile).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Content photos').disabled).toBe(true)
})
