import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { Connections } from './Connections'
import { getProfileConnections, sendConnection } from '../../action/action'
import { useProfile } from '../../context/ProfileContext'

vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }))
vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../context/ProfileContext', () => ({
  useProfile: vi.fn(),
}))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  getProfileConnections: vi.fn(),
  getOtherUserProfile: vi.fn(),
  sendConnection: vi.fn(),
  connectionsChanged: vi.fn(),
  answerConnection: vi.fn(),
  removeConnection: vi.fn(),
}))

const connection = {
  userId: 'other',
  connectionId: 'rel',
  fname: 'Sample',
  lname: 'Member',
  username: 'sample',
  personalConnection: true,
  professionalConnection: false,
}
const mount = (url = '/connections') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Connections />
    </MemoryRouter>,
  )
let intersect
beforeEach(() => {
  vi.clearAllMocks()
  useProfile.mockReturnValue({ profile: { id: 'me' }, authToken: 'session-a', refreshProfile: vi.fn() })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        intersect = callback
      }
      observe() {}
      disconnect() {}
    },
  )
  getProfileConnections.mockResolvedValue({ data: [connection] })
  sendConnection.mockResolvedValue({ status: true })
})
describe('Connections integration', () => {
  it('automatically appends pages, pauses on errors and resets the filter to page zero', async () => {
    getProfileConnections
      .mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, index) => ({
          ...connection,
          userId: String(index),
          fname: `Member ${index}`,
        })),
      })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: [{ ...connection, fname: 'Final' }] })
    mount()
    await screen.findByText('Member 0 Member')
    expect(screen.queryByRole('button', { name: /Load more/i })).toBeNull()
    act(() => {
      intersect([{ isIntersecting: true }])
      intersect([{ isIntersecting: true }])
    })
    await screen.findByRole('alert')
    act(() => intersect([{ isIntersecting: true }]))
    expect(getProfileConnections).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByText('Try again'))
    await screen.findByText('Final Member')
    expect(screen.getByText('Member 0 Member')).toBeVisible()
    expect(getProfileConnections.mock.calls.map((call) => call[0])).toEqual([0, 1, 1])
    fireEvent.click(screen.getByLabelText('Filter connections'))
    fireEvent.click(screen.getByText('Personal'))
    await waitFor(() =>
      expect(getProfileConnections).toHaveBeenLastCalledWith(0, 2, '', 10, 'me'),
    )
  })
  it('uses professional=1 and personal=2 contract filters', async () => {
    mount()
    await screen.findByText('Sample Member')
    fireEvent.click(screen.getByLabelText('Filter connections'))
    fireEvent.click(screen.getByText('Professional'))
    await waitFor(() =>
      expect(getProfileConnections).toHaveBeenLastCalledWith(0, 1, '', 10, 'me'),
    )
    fireEvent.click(screen.getByLabelText('Filter connections'))
    fireEvent.click(screen.getByText('Personal'))
    await waitFor(() =>
      expect(getProfileConnections).toHaveBeenLastCalledWith(0, 2, '', 10, 'me'),
    )
  })
  it('persists request and prevents repeat submission while pending', async () => {
    let resolve
    sendConnection.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    mount()
    const button = await screen.findByRole('button', { name: 'Add Professional' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(sendConnection).toHaveBeenCalledExactlyOnceWith('other', 'professional')
    resolve({ status: true })
    expect(await screen.findByRole('button', { name: 'Request sent' })).toBeDisabled()
  })
  it.each(['Request already exists', 'Requests already exists', ''])('shows backend error toast and allows retry: %s', async (message) => {
    sendConnection.mockRejectedValueOnce(new Error(message))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Add Professional' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      message || 'Unable to send request. Please try again.',
    ))
    expect(document.querySelector('.connection-row [role="alert"]')).toBeNull()
    expect(screen.getByText('Sample Member')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add Professional' }))
    await screen.findByRole('button', { name: 'Request sent' })
  })
  it('does not expose relationship mutations on another user connection list', async () => {
    mount('/connections?userId=someone')
    await screen.findByText('Sample Member')
    expect(screen.queryByRole('button', { name: 'Add Professional' })).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Manage connection with Sample Member'),
    ).not.toBeInTheDocument()
  })
})

it('renders actual designation, count and full location from the API', async () => {
  getProfileConnections.mockResolvedValue({ data: [{ ...connection,
    jobTitle: 'Product Designer', totalNoOfConnections: 24,
    cityName: 'Indore', countryName: 'India', image: 'https://example.test/avatar.png',
  }] })
  mount()
  await screen.findByText('Product Designer • 24 Connections')
  expect(screen.getByText('@sample')).toBeVisible()
  expect(screen.getByText('Indore, India')).toBeVisible()
  expect(document.querySelector('.connection-avatar')).toHaveAttribute('src', 'https://example.test/avatar.png')
  expect(screen.queryByText(/SocialKNKT member/)).toBeNull()
})

it('does not invent missing designation, count, username or location', async () => {
  getProfileConnections.mockResolvedValue({ data: [{ ...connection, username: null }] })
  mount()
  await screen.findByText('Sample Member')
  expect(document.querySelector('.connection-info p')).toBeNull()
  expect(document.querySelector('.connection-location')).toBeNull()
  expect(document.querySelector('.connection-name-line span')).toBeNull()
})

it('preserves a real zero connection count without a dangling separator', async () => {
  getProfileConnections.mockResolvedValue({ data: [{ ...connection,
    totalNoOfConnections: 0, countryName: 'India',
  }] })
  mount()
  await screen.findByText('0 Connections')
  expect(screen.getByText('India')).toBeVisible()
  expect(document.querySelector('.connection-info p')).toHaveTextContent(/^0 Connections$/)
})

it.each([
  [true, false, 'Add Professional'],
  [false, true, 'Add Personal'],
  [false, false, 'Add Personal'],
  [true, true, null],
  [undefined, undefined, null],
])('matches mobile CTA visibility for personal=%s professional=%s', async (personal, professional, label) => {
  getProfileConnections.mockResolvedValue({ data: [{ ...connection,
    personalConnection: personal, professionalConnection: professional,
  }] })
  mount()
  await screen.findByText('Sample Member')
  if (label) expect(screen.getByRole('button', { name: label })).toBeVisible()
  else expect(screen.queryByRole('button', { name: /^Add / })).toBeNull()
})

it('sends the personal upgrade using the peer ID, not the relationship ID', async () => {
  getProfileConnections.mockResolvedValue({ data: [{ ...connection,
    personalConnection: false, professionalConnection: true,
  }] })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Personal' }))
  await screen.findByRole('button', { name: 'Request sent' })
  expect(sendConnection).toHaveBeenCalledExactlyOnceWith('other', 'personal')
})

it('retains successful request state across filters and resets filtering for search', async () => {
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Professional' }))
  await screen.findByRole('button', { name: 'Request sent' })
  fireEvent.click(screen.getByLabelText('Filter connections'))
  fireEvent.click(screen.getByText('Professional'))
  expect(await screen.findByRole('button', { name: 'Request sent' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Search connections'), { target: { value: 'Sample' } })
  expect(screen.queryByLabelText('Filter connections')).toBeNull()
  await waitFor(() => expect(getProfileConnections).toHaveBeenLastCalledWith(0, null, 'Sample', 10, 'me'))
  expect(await screen.findByRole('button', { name: 'Request sent' })).toBeDisabled()
  expect(sendConnection).toHaveBeenCalledTimes(1)
})

it('keeps an in-flight upgrade locked when filters remount its row', async () => {
  let finish
  sendConnection.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Professional' }))
  fireEvent.click(screen.getByLabelText('Filter connections'))
  fireEvent.click(screen.getByText('Personal'))
  const pending = await screen.findByRole('button', { name: 'Sending…' })
  expect(pending).toBeDisabled()
  fireEvent.click(pending)
  expect(sendConnection).toHaveBeenCalledTimes(1)
  await act(async () => finish({ status: true }))
  expect(await screen.findByRole('button', { name: 'Request sent' })).toBeDisabled()
})

it('isolates pending request state when the signed-in account changes', async () => {
  let finishOld
  sendConnection.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
  const view = mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Professional' }))
  useProfile.mockReturnValue({ profile: { id: 'new-account' }, authToken: 'session-b', refreshProfile: vi.fn() })
  view.rerender(<MemoryRouter><Connections /></MemoryRouter>)
  const newButton = await screen.findByRole('button', { name: 'Add Professional' })
  expect(newButton).toBeEnabled()
  await act(async () => finishOld({ status: true }))
  expect(screen.queryByRole('button', { name: 'Request sent' })).toBeNull()
  expect(newButton).toBeEnabled()
})

it('does not toast a stale request failure after switching accounts', async () => {
  let reject
  sendConnection.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
  const view = mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Add Professional' }))
  useProfile.mockReturnValue({ profile: { id: 'new-account' }, authToken: 'session-b', refreshProfile: vi.fn() })
  view.rerender(<MemoryRouter><Connections /></MemoryRouter>)
  await screen.findByRole('button', { name: 'Add Professional' })
  await act(async () => reject(new Error('Request already exists')))
  expect(toast.error).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Add Professional' })).toBeEnabled()
})
