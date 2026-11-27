import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PostCard } from './PostCard'
import { getComments, recordPostShare, recordPostViews, updatePostLike } from '../../../action/action'
vi.mock('../../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'viewer' } }),
}))
vi.mock('../../../action/action', async (original) => ({
  ...(await original()),
  recordPostShare: vi.fn().mockResolvedValue({}),
  recordPostViews: vi.fn().mockResolvedValue({}),
  updatePostLike: vi.fn(),
  getComments: vi.fn(),
}))
const post = { id: '0123456789abcdef01234567', fname: 'Author', description: 'Test post' }
beforeEach(() => vi.clearAllMocks())
it('serializes rapid likes and restores the previous state after failure', async () => {
  let reject
  updatePostLike.mockReturnValueOnce(
    new Promise((resolve, fail) => {
      reject = fail
    }),
  )
  render(<PostCard post={post} />)
  fireEvent.click(screen.getByRole('button', { name: '0 Like', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: '1 Like', exact: true }))
  expect(updatePostLike).toHaveBeenCalledTimes(1)
  await act(async () => reject(new Error()))
  expect(
    screen.getByRole('button', { name: '0 Like', exact: true }).getAttribute('aria-pressed'),
  ).toBe('false')
})
it('records visible posts once and disconnects when removed', async () => {
  let intersect
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        intersect = callback
      }
      observe() {}
      disconnect = disconnect
    },
  )
  const view = render(<PostCard post={post} />)
  expect(recordPostViews).not.toHaveBeenCalled()
  intersect([{ isIntersecting: false }])
  expect(recordPostViews).not.toHaveBeenCalled()
  intersect([{ isIntersecting: true }])
  intersect([{ isIntersecting: true }])
  await waitFor(() => expect(recordPostViews).toHaveBeenCalledTimes(1))
  expect(recordPostViews).toHaveBeenCalledWith([post.id])
  view.unmount()
  expect(disconnect).toHaveBeenCalledTimes(1)
})
it('copies a resolvable URL, recording a successful share only once', async () => {
  const writeText = vi.fn().mockResolvedValue()
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<PostCard post={post} />)
  fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getByText('Copy Link'))
  await waitFor(() => expect(recordPostShare).toHaveBeenCalledWith(post.id))
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/home?postId=${post.id}`)
  fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getByText('Copy Link'))
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
  expect(recordPostShare).toHaveBeenCalledTimes(1)
})
it('does not count cancelled native shares', async () => {
  vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue({ name: 'AbortError' }) })
  render(<PostCard post={post} />)
  fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Share', exact: true })[1])
  await waitFor(() => expect(navigator.share).toHaveBeenCalled())
  expect(recordPostShare).not.toHaveBeenCalled()
})
it('keeps documents accessible through the existing direct link', () => {
  render(
    <PostCard
      post={{ ...post, mediaType: 'document', media: 'https://example.com/resume.pdf' }}
    />,
  )
  const link = screen.getByRole('link', { name: "Open Author's post" })
  expect(link.getAttribute('href')).toBe('https://example.com/resume.pdf')
  expect(link.getAttribute('target')).toBe('_blank')
})


it('passes post ownership to comment moderation while preserving reporting', async () => {
  getComments.mockResolvedValue({
    data: [{ id: 'comment', userId: 'other', comment: 'Other member comment' }],
    totalCount: 1,
  })
  render(<PostCard post={{ ...post, userId: 'viewer' }} />)
  fireEvent.click(screen.getByRole('button', { name: /Comment/ }))
  fireEvent.click(await screen.findByLabelText('Comment options'))
  expect(screen.getByRole('button', { name: 'Delete Comment' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Report', exact: true })).toBeVisible()
})
