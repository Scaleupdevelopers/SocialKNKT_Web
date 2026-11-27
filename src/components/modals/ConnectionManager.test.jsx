import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ConnectionManager } from './ConnectionManager'
import {
  getOtherUserProfile,
  answerConnection,
  getIncomingConnection,
  removeConnection,
  sendConnection,
} from '../../action/action'

import { connectionsChanged } from '../../utils/helper'

const { refreshProfile } = vi.hoisted(() => ({ refreshProfile: vi.fn() }))
vi.mock('../../context/ProfileContext', () => ({ useProfile: () => ({ refreshProfile }) }))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  getOtherUserProfile: vi.fn(),
  getIncomingConnection: vi.fn(),
  answerConnection: vi.fn(),
  removeConnection: vi.fn(),
  sendConnection: vi.fn(),
}))

vi.mock('../../utils/helper', async (original) => ({
  ...(await original()),
  connectionsChanged: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  getIncomingConnection.mockResolvedValue(null)
  answerConnection.mockResolvedValue({ status: true })
  removeConnection.mockResolvedValue({ status: true })
  sendConnection.mockResolvedValue({ status: true })
  refreshProfile.mockResolvedValue(null)
})

it('answers the incoming request when an accepted relationship also exists', async () => {
  getOtherUserProfile.mockResolvedValue({
    data: {
      fname: 'Alex',
      personalConnection: 'accepted-personal',
      connectionId: 'accepted-personal',
    },
  })
  getIncomingConnection.mockResolvedValue({ _id: 'pending-incoming', userId: 'alex' })
  render(<ConnectionManager userId="alex" onClose={vi.fn()} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Accept Professional' }))

  await waitFor(() => expect(answerConnection).toHaveBeenCalledWith('pending-incoming', 1))
  expect(answerConnection).toHaveBeenCalledTimes(1)
  expect(removeConnection).not.toHaveBeenCalled()
  expect(sendConnection).not.toHaveBeenCalled()
  expect(connectionsChanged).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Remove personal' })).not.toBeInTheDocument()
})

it('cancels the outgoing pending request id, not the accepted connection or user id', async () => {
  getOtherUserProfile.mockResolvedValue({
    data: {
      fname: 'Alex',
      personalConnection: 'accepted-personal',
      connectionId: 'pending-outgoing',
    },
  })
  render(<ConnectionManager userId="alex" onClose={vi.fn()} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Cancel request' }))

  await waitFor(() => expect(removeConnection).toHaveBeenCalledWith('pending-outgoing', 'both'))
  expect(removeConnection).toHaveBeenCalledTimes(1)
  expect(answerConnection).not.toHaveBeenCalled()
  expect(sendConnection).not.toHaveBeenCalled()
})

it('removes stale actions after a successful mutation while refetch fails, then retries only the read', async () => {
  let rejectRefetch
  const refetch = new Promise((resolve, reject) => {
    rejectRefetch = reject
  })
  getOtherUserProfile
    .mockResolvedValueOnce({ data: { fname: 'Alex' } })
    .mockReturnValueOnce(refetch)
    .mockResolvedValueOnce({
      data: { fname: 'Alex', personalConnection: 'accepted-after-refresh' },
    })
  const onChanged = vi.fn()
  render(<ConnectionManager userId="alex" onClose={vi.fn()} onChanged={onChanged} />)

  fireEvent.click(await screen.findByRole('button', { name: 'Add personal' }))
  await waitFor(() => expect(getOtherUserProfile).toHaveBeenCalledTimes(2))
  expect(screen.getByRole('status')).toHaveTextContent('Loading')
  expect(
    screen.queryByRole('button', { name: /^(Add|Remove|Accept|Cancel request|Decline)/ }),
  ).not.toBeInTheDocument()

  await act(async () => rejectRefetch(new Error('private upstream error')))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this connection.')
  expect(screen.queryByText('private upstream error')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /^(Add|Remove|Accept|Cancel request|Decline)/ }),
  ).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('button', { name: 'Remove personal' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: 'Add personal' })).not.toBeInTheDocument()
  expect(getOtherUserProfile).toHaveBeenCalledTimes(3)
  expect(sendConnection).toHaveBeenCalledExactlyOnceWith('alex', 'personal')
  expect(removeConnection).not.toHaveBeenCalled()
  expect(onChanged).toHaveBeenCalledTimes(1)
  expect(refreshProfile).toHaveBeenCalledTimes(1)
})
