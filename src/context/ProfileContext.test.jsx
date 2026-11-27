import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ProfileProvider, useProfile } from './ProfileContext'
import { getUserProfile } from '../action/action'
vi.mock('../action/action', () => ({ getUserProfile: vi.fn() }))
function Probe() {
  const { profile, refreshProfile, error } = useProfile()
  return (
    <>
      <p>{profile?.fullName || 'No profile'}</p>
      {error && <p>Error</p>}
      <button onClick={refreshProfile}>Retry</button>
    </>
  )
}
function mount() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <Probe />
      </ProfileProvider>
    </MemoryRouter>,
  )
}
let captured
function Capture() {
  captured = useProfile()
  return <Probe />
}
const auth = (token) => localStorage.setItem('socialknkt_auth', JSON.stringify({ token }))
beforeEach(() => vi.clearAllMocks())
it('ignores old account callbacks without cancelling the new account load', async () => {
  let finishNew
  auth('old')
  getUserProfile.mockResolvedValueOnce({ data: { fname: 'Old' } }).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishNew = resolve
      }),
  )
  render(
    <MemoryRouter>
      <ProfileProvider>
        <Capture />
      </ProfileProvider>
    </MemoryRouter>,
  )
  await screen.findByText('Old')
  const old = captured
  await act(async () => {
    auth('new')
    window.dispatchEvent(new StorageEvent('storage', { key: 'socialknkt_auth' }))
  })
  await act(async () => {
    old.setProfile({ fname: 'Delayed old save' })
    await old.refreshProfile()
  })
  expect(getUserProfile).toHaveBeenCalledTimes(2)
  await act(async () => finishNew({ data: { fname: 'New' } }))
  await screen.findByText('New')
  expect(screen.queryByText('Delayed old save')).not.toBeInTheDocument()
})
it('retries rejected profile requests instead of caching a failed promise', async () => {
  auth('one')
  getUserProfile
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: { fname: 'Recovered' } })
  mount()
  await screen.findByText('Error')
  fireEvent.click(screen.getByText('Retry'))
  await screen.findByText('Recovered')
  expect(getUserProfile).toHaveBeenCalledTimes(2)
})
it('discards previous account results and clears profile on cross-tab logout', async () => {
  let finishOld
  auth('old')
  getUserProfile
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve
        }),
    )
    .mockResolvedValueOnce({ data: { fname: 'New member' } })
  mount()
  await act(async () => {
    auth('new')
    window.dispatchEvent(new StorageEvent('storage', { key: 'socialknkt_auth' }))
  })
  await screen.findByText('New member')
  await act(async () => finishOld({ data: { fname: 'Old member' } }))
  expect(screen.queryByText('Old member')).not.toBeInTheDocument()
  await act(async () => {
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'socialknkt_auth' }))
  })
  await waitFor(() => expect(screen.getByText('No profile')).toBeVisible())
})
