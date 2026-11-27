import { beforeEach, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsContent } from './SettingsContent'
import { getBlockedUsers, blockUser, deleteAccount } from '../../../action/action'

vi.mock('../../../context/ProfileContext', () => ({
  useProfile: () => ({
    profile: { isProfessional: true, profileType: 1 },
    setProfile: vi.fn(),
  }),
}))
vi.mock('../../../action/action', () => ({
  getBlockedUsers: vi.fn(),
  blockUser: vi.fn(),
  deleteAccount: vi.fn(),
  updatePassword: vi.fn(),
  updateAccountStatus: vi.fn(),
  updateProfessionalStatus: vi.fn(),
}))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const renderSettings = () =>
  render(
    <MemoryRouter>
      <SettingsContent />
    </MemoryRouter>,
  )

it('filters orphan block records and unblocks a valid user with the existing contract', async () => {
  getBlockedUsers.mockResolvedValue({
    status: true,
    data: [null, {}, { id: 'blocked', fname: 'Sample', lname: 'Member', username: 'sample' }],
  })
  blockUser.mockResolvedValue({ status: true })
  renderSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Block List', exact: true }))
  await screen.findByText('Sample Member')
  expect(screen.getAllByRole('button', { name: 'Unblock' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Unblock' }))
  await screen.findByText('No blocked users.')
  expect(blockUser).toHaveBeenCalledWith('blocked', false)
})

it('shows failure instead of empty and retries successfully', async () => {
  getBlockedUsers
    .mockRejectedValueOnce(new Error('private server details'))
    .mockResolvedValueOnce({ status: true, data: [] })
  renderSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Block List', exact: true }))
  await screen.findByRole('alert')
  expect(screen.queryByText('No blocked users.')).toBeNull()
  expect(screen.getByRole('alert')).not.toHaveTextContent('private server details')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('No blocked users.')
  expect(getBlockedUsers).toHaveBeenCalledTimes(2)
})

it('warns about immediate permanent deletion and requires confirmation', async () => {
  deleteAccount.mockResolvedValue({ status: true })
  renderSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Account', exact: true }))
  expect(screen.getByRole('dialog')).toHaveTextContent('permanently deleted immediately')
  expect(screen.getByRole('dialog')).not.toHaveTextContent('30 days')
  expect(deleteAccount).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1))
})

it('shows a row shimmer while reading the block list and keeps write feedback intact', async () => {
  let resolveList
  getBlockedUsers.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveList = resolve
    }),
  )
  blockUser.mockReturnValueOnce(new Promise(() => {}))
  renderSettings()
  fireEvent.click(screen.getByRole('button', { name: 'Block List', exact: true }))
  const skeleton = screen.getByRole('status', { name: 'Loading blocked users…' })
  expect(skeleton).toHaveClass('loading-skeleton-rows')
  expect(skeleton.querySelectorAll('.loading-skeleton-item')).toHaveLength(3)
  await act(async () => resolveList({ data: [{ id: 'blocked', fname: 'Sample' }] }))
  expect(skeleton).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Unblock' }))
  expect(screen.getByRole('button', { name: 'Unblocking...' })).toBeDisabled()
})
