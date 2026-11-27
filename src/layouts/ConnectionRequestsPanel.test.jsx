import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ConnectionRequestsPanel } from './ConnectionRequestsPanel'
import { getConnectionRequests, answerConnection } from '../action/action'
vi.mock('../action/action', () => ({
  getConnectionRequests: vi.fn(),
  answerConnection: vi.fn(),
  connectionsChanged: vi.fn(),
}))
vi.mock('../context/ProfileContext', () => ({
  useProfile: () => ({ refreshProfile: vi.fn() }),
}))
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
  getConnectionRequests.mockResolvedValue({
    data: [{ _id: 'rel', fname: 'Test', lname: 'Person' }],
  })
  answerConnection.mockResolvedValue({ status: true })
})
const mount = () =>
  render(
    <MemoryRouter>
      <ConnectionRequestsPanel onClose={vi.fn()} />
    </MemoryRouter>,
  )
it('automatically pages requests without retrying failures in a loop', async () => {
  getConnectionRequests
    .mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, index) => ({
        _id: String(index),
        fname: `Member ${index}`,
      })),
    })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: [{ _id: 'last', fname: 'Final' }] })
  mount()
  await screen.findByText('Member 0 sent a connection request')
  expect(screen.queryByRole('button', { name: /Load more/i })).toBeNull()
  act(() => {
    intersect([{ isIntersecting: true }])
    intersect([{ isIntersecting: true }])
  })
  await screen.findByRole('alert')
  act(() => intersect([{ isIntersecting: true }]))
  expect(getConnectionRequests).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByText('Try again'))
  await screen.findByText('Final sent a connection request')
  expect(getConnectionRequests.mock.calls.map((call) => call[0])).toEqual([0, 1, 1])
})
it('persists chosen acceptance status before removing request', async () => {
  mount()
  fireEvent.click(await screen.findByText('Accept'))
  getConnectionRequests.mockResolvedValue({ data: [] })
  fireEvent.click(screen.getByText('Professional'))
  await waitFor(() => expect(answerConnection).toHaveBeenCalledWith('rel', 1))
  await screen.findByText('No pending requests.')
})
it('keeps declined request visible on failure and can retry', async () => {
  answerConnection.mockRejectedValueOnce(new Error('offline'))
  mount()
  fireEvent.click(await screen.findByText('Decline'))
  await screen.findByRole('alert')
  expect(screen.getByText('Test Person sent a connection request')).toBeVisible()
  getConnectionRequests.mockResolvedValue({ data: [] })
  fireEvent.click(screen.getByText('Decline'))
  await screen.findByText('No pending requests.')
  expect(answerConnection).toHaveBeenLastCalledWith('rel', 4)
})
