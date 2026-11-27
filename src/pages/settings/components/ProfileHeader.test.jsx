import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ProfileHeader } from './ProfileHeader'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
import { blockUser, reportUser, reportPost } from '../../../action/action'

const { refreshProfile } = vi.hoisted(() => ({ refreshProfile: vi.fn() }))
vi.mock('../../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'me' }, refreshProfile, setProfile: vi.fn() }),
}))
vi.mock('../../../action/action', () => ({
  blockUser: vi.fn(),
  reportUser: vi.fn(),
  reportPost: vi.fn(),
  uploadFile: vi.fn(),
  updateBannerImage: vi.fn(),
}))
vi.mock('../../../components/modals/ConnectionManager', () => ({
  ConnectionManager: () => null,
  ConnectionDropdown: () => <div role="menu" aria-label="Manage Connection"><button role="menuitem">Remove Personal</button></div>,
}))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
  refreshProfile.mockResolvedValue(null)
})

function header(profile = {}, props = {}) {
  return (
    <MemoryRouter>
      <ProfileHeader
        isOtherProfile
        profileOverride={{ id: 'other', fullName: 'Alex', ...profile }}
        {...props}
      />
    </MemoryRouter>
  )
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'More profile actions' }))
}

it('reports a user with required trimmed description, retains failure draft and locks duplicates', async () => {
  let rejectReport
  reportUser.mockReturnValueOnce(
    new Promise((resolve, reject) => {
      rejectReport = reject
    }),
  )
  reportUser.mockResolvedValueOnce({ status: true })
  render(header())
  openMenu()
  fireEvent.click(screen.getByRole('button', { name: 'Report' }))
  const dialog = screen.getByRole('dialog', { name: 'Report User' })
  expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
  const submit = within(dialog).getByRole('button', { name: 'Report' })
  fireEvent.click(submit)
  expect(reportUser).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Enter a description')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Abusive messages  ' } })
  act(() => {
    submit.click()
    submit.click()
  })
  expect(reportUser).toHaveBeenCalledExactlyOnceWith('other', 'Abusive messages')
  fireEvent.click(screen.getByRole('button', { name: 'Close Report User' }))
  expect(dialog).toBeInTheDocument()
  await act(async () => rejectReport(new Error('private server details')))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to report this user. Please try again.',
  )
  expect(screen.getByRole('textbox')).toHaveValue('  Abusive messages  ')
  fireEvent.click(submit)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(reportUser).toHaveBeenCalledTimes(2)
})

it.each(['Post', 'Thread'])('preserves %s reason and Other defaults', async (contentLabel) => {
  const close = vi.fn()
  render(<ReportPostModal postId="post" contentLabel={contentLabel} onClose={close} />)
  fireEvent.click(screen.getByRole('radio', { name: 'Harassment or bullying' }))
  fireEvent.click(screen.getByRole('button', { name: 'Post' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(reportPost).toHaveBeenCalledWith('post', 'Harassment or bullying')
})

it('blocks only after success, locks duplicates and allows retry after failure without changing counts', async () => {
  let rejectBlock
  blockUser.mockReturnValueOnce(
    new Promise((resolve, reject) => {
      rejectBlock = reject
    }),
  )
  blockUser.mockResolvedValueOnce({ status: true })
  const onRelationshipChanged = vi.fn()
  render(header({ connectionCount: 7 }, { onRelationshipChanged }))
  openMenu()
  const block = screen.getByRole('button', { name: 'Block' })
  act(() => {
    block.click()
    block.click()
  })
  expect(blockUser).toHaveBeenCalledExactlyOnceWith('other', true)
  await act(async () => rejectBlock(new Error('sensitive failure')))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Unable to update block status. Please try again.',
  )
  expect(screen.getByRole('button', { name: 'Block' })).toBeEnabled()
  fireEvent.click(block)
  await waitFor(() => expect(onRelationshipChanged).toHaveBeenCalledOnce())
  openMenu()
  expect(screen.getByRole('button', { name: 'Unblock' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '7 Connections' })).toBeInTheDocument()
  expect(refreshProfile).toHaveBeenCalledOnce()
})

it('unblocks only a block owned by the signed-in account and tracks backend field updates', async () => {
  const view = render(header({ isUserBlocked: '1', blockedBy: 'me' }))
  openMenu()
  fireEvent.click(screen.getByRole('button', { name: 'Unblock' }))
  await waitFor(() => expect(blockUser).toHaveBeenCalledWith('other', false))
  view.rerender(header({ isBlocked: true, blockedBy: 'other' }))
  openMenu()
  expect(screen.queryByRole('button', { name: 'Unblock' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Block' })).not.toBeInTheDocument()
})

it('prefers the currently living backend place and supports nested location names', () => {
  render(
    header({
      places: [
        { cityName: 'Old city', currentlyLiving: 'false' },
        {
          city: { name: 'Pune' },
          stateName: 'Maharashtra',
          countryName: 'India',
          currentlyLiving: true,
        },
      ],
    }),
  )
  expect(screen.getByText('Pune, Maharashtra, India')).toBeInTheDocument()
  expect(screen.queryByText('Old city')).not.toBeInTheDocument()
})

it('retains Unblock on failure and retries the same mutation', async () => {
  blockUser
    .mockRejectedValueOnce(new Error('private details'))
    .mockResolvedValueOnce({ status: true })
  render(header({ isBlocked: true, blockedBy: 'me' }))
  openMenu()
  fireEvent.click(screen.getByRole('button', { name: 'Unblock' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Please try again.')
  fireEvent.click(screen.getByRole('button', { name: 'Unblock' }))
  await waitFor(() => expect(refreshProfile).toHaveBeenCalledOnce())
  expect(blockUser.mock.calls).toEqual([
    ['other', false],
    ['other', false],
  ])
  openMenu()
  expect(screen.getByRole('button', { name: 'Block' })).toBeInTheDocument()
})

it('cancels a report without sending and returns focus to the profile menu', () => {
  render(header())
  openMenu()
  fireEvent.click(screen.getByRole('button', { name: 'Report' }))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(reportUser).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'More profile actions' })).toHaveFocus()
})

it('preserves the default Post Other fallback', async () => {
  render(<ReportPostModal postId="post" onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Post' }))
  await waitFor(() => expect(reportPost).toHaveBeenCalledWith('post', 'Other'))
})

it('opens an anchored connection menu and closes on Escape or outside click', async () => {
  render(header({ personalConnection: 'accepted' }))
  const trigger = screen.getByRole('button', { name: 'Manage Connection' })
  fireEvent.click(trigger)
  expect(screen.getByRole('menu', { name: 'Manage Connection' })).toBeVisible()
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menu')).toBeNull()
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  fireEvent.pointerDown(document.body)
  expect(screen.queryByRole('menu')).toBeNull()
})
