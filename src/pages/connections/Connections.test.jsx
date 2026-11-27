import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Connections } from './Connections'
import { getProfileConnections, sendConnection } from '../../action/action'

vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'me' }, refreshProfile: vi.fn() }),
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
  it('keeps row and offers retry after API failure', async () => {
    sendConnection.mockRejectedValueOnce(new Error('failure'))
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Add Professional' }))
    await screen.findByRole('alert')
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
