import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ConnectionRequestsPanel } from './ConnectionRequestsPanel'
import { getConnectionRequests, answerConnection } from '../action/action'
vi.mock('../action/action', () => ({
  getConnectionRequests: vi.fn(),
  answerConnection: vi.fn(),
  connectionsChanged: vi.fn(),
}))
vi.mock('../context/ProfileContext', () => ({ useProfile: () => ({ refreshProfile: vi.fn() }) }))
beforeEach(() => {
  vi.clearAllMocks()
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
