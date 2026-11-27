import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ConnectionDropdown, ConnectionManager } from './ConnectionManager'
import {
  getOtherUserProfile,
  answerConnection,
  getIncomingConnection,
  removeConnection,
  sendConnection,
} from '../../action/action'

import { toast } from 'react-toastify'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

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

it.each(['personal', 'professional'])('adds %s without fetching a profile', async (type) => {
  const onChanged = vi.fn(), onClose = vi.fn()
  render(<ConnectionDropdown profile={{}} userId="alex" onChanged={onChanged} onClose={onClose} />)
  fireEvent.click(screen.getByRole('menuitem', { name: `Add ${type[0].toUpperCase() + type.slice(1)}` }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(sendConnection).toHaveBeenCalledExactlyOnceWith('alex', type)
  expect(getOtherUserProfile).not.toHaveBeenCalled()
  expect(connectionsChanged).toHaveBeenCalledTimes(1)
  expect(refreshProfile).toHaveBeenCalledTimes(1)
  expect(onChanged).toHaveBeenCalledTimes(1)
  expect(toast.success).toHaveBeenCalledTimes(1)
})

it.each(['personal', 'professional'])('confirms removal using the accepted %s id', async (type) => {
  render(<ConnectionDropdown profile={{ [type + 'Connection']: 'accepted', connectionId: 'unrelated' }} userId="alex" />)
  fireEvent.click(screen.getByRole('menuitem', { name: `Remove ${type[0].toUpperCase() + type.slice(1)}` }))
  expect(removeConnection).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Remove Connection' })).toHaveTextContent('Are you sure you want to remove this connection?')
  fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  await waitFor(() => expect(removeConnection).toHaveBeenCalledExactlyOnceWith('accepted', type))
})

it('removes a shared accepted id once with the mobile initial type', async () => {
  render(<ConnectionDropdown profile={{ personalConnection: 'same', professionalConnection: 'same' }} userId="alex" />)
  expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Remove Personal', 'Remove Professional', 'Remove Both'])
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove Both' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  await waitFor(() => expect(removeConnection).toHaveBeenCalledExactlyOnceWith('same', 'initial'))
})

it('refreshes authoritative state after partial distinct-id removal without a success toast', async () => {
  removeConnection.mockResolvedValueOnce({ status: true }).mockRejectedValueOnce(new Error('Connection cannot be removed.'))
  const onChanged = vi.fn(), onClose = vi.fn()
  render(<ConnectionDropdown profile={{ personalConnection: 'personal-id', professionalConnection: 'professional-id' }} userId="alex" onChanged={onChanged} onClose={onClose} />)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove Both' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(removeConnection.mock.calls).toEqual([['professional-id', 'professional'], ['personal-id', 'personal']])
  expect(refreshProfile).toHaveBeenCalledTimes(1)
  expect(onChanged).toHaveBeenCalledTimes(1)
  expect(toast.success).not.toHaveBeenCalled()
  expect(toast.error).toHaveBeenCalledWith('Connection cannot be removed.')
})

it('locks duplicate adds and shows the backend failure using the default toast', async () => {
  let reject
  sendConnection.mockImplementation(() => new Promise((resolve, fail) => { reject = fail }))
  render(<ConnectionDropdown profile={{}} userId="alex" />)
  const add = screen.getByRole('menuitem', { name: 'Add Personal' })
  fireEvent.click(add)
  fireEvent.click(add)
  expect(sendConnection).toHaveBeenCalledTimes(1)
  await act(async () => reject(new Error('Request already exists.')))
  expect(toast.error).toHaveBeenCalledExactlyOnceWith('Request already exists.')
  expect(add).toBeEnabled()
  expect(refreshProfile).not.toHaveBeenCalled()
})

it.each(['unmount', 'session'])('stops remaining writes and callbacks after %s', async (reason) => {
  let finish
  removeConnection.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
  const onClose = vi.fn(), onChanged = vi.fn()
  const { unmount } = render(<ConnectionDropdown profile={{ personalConnection: 'p', professionalConnection: 'q' }} userId="alex" onClose={onClose} onChanged={onChanged} />)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove Both' }))
  const remove = screen.getByRole('button', { name: 'Remove', exact: true })
  fireEvent.click(remove)
  fireEvent.click(remove)
  if (reason === 'unmount') unmount()
  else localStorage.setItem('socialknkt_auth', JSON.stringify({ token: 'different' }))
  await act(async () => finish({ status: true }))
  expect(removeConnection).toHaveBeenCalledTimes(1)
  expect(onChanged).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  expect(refreshProfile).not.toHaveBeenCalled()
  expect(toast.success).not.toHaveBeenCalled()
  localStorage.clear()
})

it('focuses the first item and supports arrow, Home and End menu navigation', () => {
  render(<ConnectionDropdown profile={{}} userId="alex" />)
  const menu = screen.getByRole('menu', { name: 'Manage Connection' })
  const [first, last] = screen.getAllByRole('menuitem')
  expect(first).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  expect(last).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'Home' })
  expect(first).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'End' })
  expect(last).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'ArrowUp' })
  expect(first).toHaveFocus()
})

it('refreshes the target after partial removal even when the current profile refresh fails', async () => {
  removeConnection.mockResolvedValueOnce({ status: true }).mockRejectedValueOnce(new Error('Try again.'))
  refreshProfile.mockRejectedValueOnce(new Error('offline'))
  const onChanged = vi.fn(), onClose = vi.fn()
  render(<ConnectionDropdown profile={{ personalConnection: 'p', professionalConnection: 'q' }} userId="alex" onChanged={onChanged} onClose={onClose} />)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove Both' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  expect(onChanged).toHaveBeenCalledTimes(1)
  expect(toast.success).not.toHaveBeenCalled()
})

it('locks the parent synchronously and keeps confirmation open until removal settles', async () => {
  let finish
  const onPendingChange = vi.fn(), onClose = vi.fn()
  removeConnection.mockImplementationOnce(() => {
    expect(onPendingChange).toHaveBeenLastCalledWith(true)
    return new Promise((resolve) => { finish = resolve })
  })
  render(<ConnectionDropdown profile={{ personalConnection: 'p' }} userId="alex" onClose={onClose} onPendingChange={onPendingChange} />)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove Personal' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  const dialog = screen.getByRole('dialog', { name: 'Remove Connection' })
  fireEvent.click(screen.getByRole('button', { name: 'Close Remove Connection' }))
  fireEvent.keyDown(dialog, { key: 'Escape' })
  fireEvent.click(dialog.parentElement)
  expect(dialog).toBeInTheDocument()
  expect(onPendingChange.mock.calls).toEqual([[true]])
  expect(onClose).not.toHaveBeenCalled()
  await act(async () => finish({ status: true }))
  expect(onPendingChange.mock.calls).toEqual([[true], [false]])
  expect(onPendingChange.mock.invocationCallOrder[1]).toBeLessThan(onClose.mock.invocationCallOrder[0])
})

it('releases the parent lock after failure and permits confirmation dismissal', async () => {
  let reject
  const onPendingChange = vi.fn()
  removeConnection.mockImplementationOnce(() => new Promise((resolve, fail) => { reject = fail }))
  render(<ConnectionDropdown profile={{ personalConnection: 'p' }} userId="alex" onPendingChange={onPendingChange} />)
  fireEvent.click(screen.getByRole('menuitem', { name: 'Remove Personal' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove', exact: true }))
  await act(async () => reject(new Error('Try again.')))
  expect(onPendingChange.mock.calls).toEqual([[true], [false]])
  fireEvent.click(screen.getByRole('button', { name: 'Close Remove Connection' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
