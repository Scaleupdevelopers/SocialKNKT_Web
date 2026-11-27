import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { NotificationsPanel } from './NotificationsPanel'
import { getNotifications, getPostComment } from '../action/action'

vi.mock('../action/action', () => ({ getNotifications: vi.fn(), getPostComment: vi.fn() }))

const postId = '1234567890abcdef12345678'
const commentId = 'abcdef1234567890abcdef12'
const notification = {
  id: 'notice',
  type: 'comment-like',
  entityId: commentId,
  user1: { fname: 'Test' },
}
function Location() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname + location.search}</output>
}
function mount(item = notification) {
  getNotifications.mockResolvedValue({ data: [item] })
  const close = vi.fn()
  return {
    close,
    ...render(
      <MemoryRouter initialEntries={['/home']}>
        <NotificationsPanel onClose={close} />
        <Location />
      </MemoryRouter>,
    ),
  }
}
let intersect
beforeEach(() => {
  vi.resetAllMocks()
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
})

it('automatically pages notifications and stops observing after failure until retry', async () => {
  getNotifications
    .mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, index) => ({ ...notification, id: String(index) })),
    })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      data: [{ ...notification, id: 'last', user1: { fname: 'Final' } }],
    })
  mount()
  await screen.findAllByText('Test liked your comment.')
  expect(screen.queryByRole('button', { name: /Load more/i })).toBeNull()
  act(() => {
    intersect([{ isIntersecting: true }])
    intersect([{ isIntersecting: true }])
  })
  await screen.findByRole('alert')
  act(() => intersect([{ isIntersecting: true }]))
  expect(getNotifications).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByText('Try again'))
  await screen.findByText('Final liked your comment.')
  expect(getNotifications.mock.calls.map((call) => call[0])).toEqual([0, 1, 1])
})

it('resolves a comment-like entity to its parent post and locks repeat clicks', async () => {
  let resolve
  getPostComment.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const { close } = mount()
  const row = await screen.findByRole('button', { name: 'Test liked your comment.' })
  act(() => {
    row.click()
    row.click()
  })
  expect(getPostComment).toHaveBeenCalledExactlyOnceWith(commentId)
  expect(row).toBeDisabled()
  expect(screen.getByRole('status', { name: 'Opening notification…' })).toHaveClass(
    'loading-skeleton',
  )
  await act(async () =>
    resolve({ status: true, data: { id: commentId, postId, isBlocked: false } }),
  )
  expect(screen.getByLabelText('Current location')).toHaveTextContent('/home?postId=' + postId)
  expect(close).toHaveBeenCalledOnce()
})

it.each([undefined, null, {}, [], { postId, deletedAt: 1 }, { postId, isBlocked: true }])(
  'marks missing, deleted or blocked comment unavailable: %j',
  async (data) => {
    getPostComment.mockResolvedValue({ status: true, data })
    const { close } = mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Test liked your comment.' }))
    expect(await screen.findByText('Content is no longer available.')).toBeVisible()
    expect(screen.getByRole('button', { name: /Test liked/ })).toBeDisabled()
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/home')
    expect(close).not.toHaveBeenCalled()
  },
)

it('keeps HTTP lookup failures retryable without exposing raw server errors', async () => {
  getPostComment
    .mockRejectedValueOnce(Object.assign(new Error('internal details'), { status: 503 }))
    .mockResolvedValueOnce({ data: { postId } })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Test liked your comment.' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Select it to retry.')
  expect(screen.queryByText('internal details')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Test liked/ }))
  await waitFor(() =>
    expect(screen.getByLabelText('Current location')).toHaveTextContent(
      '/home?postId=' + postId,
    ),
  )
})

it('ignores a lookup completed after the panel closes', async () => {
  let resolve
  getPostComment.mockReturnValue(
    new Promise((done) => {
      resolve = done
    }),
  )
  const view = mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Test liked your comment.' }))
  view.unmount()
  await act(async () => resolve({ data: { postId } }))
  expect(view.close).not.toHaveBeenCalled()
})

it.each(['thread-like', 'thread-comment'])(
  'labels %s as a thread without requiring parentThreadId',
  async (type) => {
    const { close } = mount({ ...notification, type, entityId: postId })
    const row = await screen.findByRole('button', { name: /Test .* your thread\./ })
    fireEvent.click(row)
    expect(screen.getByLabelText('Current location')).toHaveTextContent(
      '/knkt?threadId=' + postId,
    )
    expect(getPostComment).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  },
)

it('preserves explicit parent routing and inaccessible notification gating', async () => {
  const view = mount({ ...notification, connectionExists: false })
  expect(
    await screen.findByRole('button', { name: /Content is no longer available/ }),
  ).toBeDisabled()
  expect(getPostComment).not.toHaveBeenCalled()
  view.unmount()
  mount({ ...notification, parentPostId: postId })
  fireEvent.click(await screen.findByRole('button', { name: 'Test liked your comment.' }))
  expect(screen.getByLabelText('Current location')).toHaveTextContent('/home?postId=' + postId)
  expect(getPostComment).not.toHaveBeenCalled()
})
