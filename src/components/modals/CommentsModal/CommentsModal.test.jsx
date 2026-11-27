import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommentsModal } from './CommentsModal'
import * as api from '../../../action/action'
import { toast } from 'react-toastify'

vi.mock('../../../action/action', () => ({
  commentPost: vi.fn(),
  getCommentReplies: vi.fn(),
  getComments: vi.fn(),
  replyToComment: vi.fn(),
  updateCommentLike: vi.fn(),
  deleteComment: vi.fn(),
  reportComment: vi.fn(),
}))
vi.mock('../../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'me', username: 'Member' } }),
}))
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const observers = []

async function reachEnd(label, container = document) {
  let observer
  await waitFor(() => {
    observer = observers.findLast((item) => item.active && container.contains(item.target) && item.target?.dataset.paginationSentinel === label)
    expect(observer).toBeDefined()
  })
  act(() => {
    observer.callback([{ isIntersecting: true }])
    observer.callback([{ isIntersecting: true }])
  })
  return observer
}

const post = { id: 'post', username: 'Author' }
const row = (text) => screen.getByText(text).closest('.comment-item')
const comment = (id, fields = {}) => ({
  id,
  comment: id,
  username: 'Member',
  userId: 'me',
  ...fields,
})
const send = (text) => {
  fireEvent.change(screen.getByLabelText('Comment'), { target: { value: text } })
  fireEvent.click(screen.getByLabelText('Send comment'))
}

async function offsetCollection(kind, size) {
  let items = Array.from({ length: size }, (_, i) => comment(`item-${i + 1}`))
  const read = kind === 'comments' ? api.getComments : api.getCommentReplies
  const snapshot = (page) => ({
    data: items.slice(page * 10, page * 10 + 10),
    totalCount: items.length,
  })
  read.mockImplementation(async (_id, page) => snapshot(page))
  api.deleteComment.mockImplementation(async (_post, id) => {
    items = items.filter((item) => item.id !== id)
    return { status: true }
  })
  if (kind === 'replies') {
    api.getComments.mockResolvedValue({
      data: [comment('parent', { commentReplies: size })],
      totalCount: 1,
    })
  }
  render(<CommentsModal post={post} />)
  if (kind === 'replies')
    fireEvent.click(await screen.findByRole('button', { name: /View .* Replies/ }))
  await screen.findByText('item-1')
  return {
    read,
    snapshot,
    options: kind === 'comments' ? 'Comment options' : 'Reply options',
    more: `More ${kind}`,
  }
}

function deleteFirst(options) {
  fireEvent.click(screen.getAllByLabelText(options)[0])
  fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
}
beforeEach(() => {
  vi.resetAllMocks()
  observers.length = 0
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback, options) {
      this.callback = callback
      this.options = options
      this.active = true
      observers.push(this)
    }
    observe(target) { this.target = target }
    disconnect() { this.active = false }
  })
  api.getComments.mockResolvedValue({ data: [], totalCount: 0 })
  api.getCommentReplies.mockResolvedValue({ data: [], totalCount: 0 })
  api.updateCommentLike.mockResolvedValue({ status: true })
  api.deleteComment.mockResolvedValue({ status: true })
})

describe('comment mutations', () => {
  it('keeps comments visible beside a single next-page shimmer and guards duplicate intersections', async () => {
    let finish
    api.getComments
      .mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, index) => comment(`c${index}`)),
        totalCount: 11,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
    render(<CommentsModal post={post} />)
    expect(screen.getByLabelText('Loading comments')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await reachEnd('More comments')
    expect(screen.getByText('c0')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Load more comments' })).not.toBeInTheDocument()
    expect(api.getComments).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status', { name: 'Loading more comments...' })).toHaveClass(
      'loading-skeleton-rows',
    )
    await act(async () => finish({ data: [comment('last')], totalCount: 11 }))
    expect(screen.getByText('last')).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows reply shimmers without hiding existing replies during pagination', async () => {
    let finish
    api.getComments.mockResolvedValue({
      data: [comment('parent', { commentReplies: 11 })],
      totalCount: 1,
    })
    api.getCommentReplies.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    render(<CommentsModal post={post} />)
    fireEvent.click(await screen.findByRole('button', { name: /View 11 Replies/ }))
    expect(screen.getByRole('status', { name: 'Loading replies…' })).toHaveClass(
      'loading-skeleton-rows',
    )
    await act(async () =>
      finish({
        data: Array.from({ length: 10 }, (_, index) => comment(`r${index}`)),
        totalCount: 11,
      }),
    )
    await reachEnd('More replies')
    expect(screen.getByText('r0')).toBeVisible()
    expect(screen.getAllByRole('status', { name: 'Loading replies…' })).toHaveLength(1)
    await act(async () => finish({ data: [comment('last reply')], totalCount: 11 }))
    expect(screen.getByText('last reply')).toBeVisible()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('locks each comment like until it settles and rolls back with a sanitized error', async () => {
    let fail
    api.getComments.mockResolvedValue({ data: [comment('mine')], totalCount: 1 })
    api.updateCommentLike.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject
        }),
    )
    render(<CommentsModal post={post} />)
    await screen.findByText('mine')
    fireEvent.click(screen.getByLabelText('Like comment'))
    fireEvent.click(screen.getByLabelText('Unlike comment'))
    expect(api.updateCommentLike).toHaveBeenCalledTimes(1)
    await act(async () => fail(new Error('private server diagnostics')))
    expect(screen.getByLabelText('Like comment')).toBeEnabled()
    expect(screen.getByText('0 Likes')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Unable to update like. Please try again.')
    fireEvent.click(screen.getByLabelText('Like comment'))
    expect(api.updateCommentLike).toHaveBeenCalledTimes(2)
  })
  it('replaces pending IDs, guards duplicate submits, and uses server IDs for like/reply/delete', async () => {
    let finish
    api.commentPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    api.replyToComment.mockResolvedValue({ data: { id: 'server-reply' } })
    const count = vi.fn()
    render(<CommentsModal post={post} onClose={vi.fn()} onCommentCountChange={count} />)
    await screen.findByText('No comments')
    send('New comment')
    fireEvent.click(screen.getByLabelText('Send comment'))
    expect(api.commentPost).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Like comment')).toBeDisabled()
    expect(screen.getByLabelText('Comment options')).toBeDisabled()
    await act(async () => finish({ data: { id: 'server-comment' } }))
    fireEvent.click(screen.getByLabelText('Like comment'))
    expect(api.updateCommentLike).toHaveBeenCalledWith('server-comment', 'post', true)
    fireEvent.click(screen.getByRole('button', { name: 'Reply', exact: true }))
    send('New reply')
    await waitFor(() => expect(screen.getByLabelText('Reply options')).toBeEnabled())
    expect(api.replyToComment).toHaveBeenCalledWith('post', 'server-comment', 'New reply')
    fireEvent.click(screen.getByLabelText('Like reply'))
    expect(api.updateCommentLike).toHaveBeenCalledWith('server-reply', 'post', true)
    fireEvent.click(screen.getByLabelText('Reply options'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
    await waitFor(() => expect(api.deleteComment).toHaveBeenCalledWith('post', 'server-reply'))
    await waitFor(() => expect(screen.queryByText('New reply')).not.toBeInTheDocument())
    expect(count.mock.calls).toEqual([[1]])
    fireEvent.click(screen.getByLabelText('Comment options'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
    await waitFor(() => expect(count.mock.calls).toEqual([[1], [-1]]))
    expect(api.deleteComment).toHaveBeenLastCalledWith('post', 'server-comment')
  })
  it('restores failed drafts and increments the count only on successful retry', async () => {
    api.commentPost
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { id: 'saved' } })
    const count = vi.fn()
    render(<CommentsModal post={post} onCommentCountChange={count} />)
    await screen.findByText('No comments')
    send('Retry me')
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Comment')).toHaveValue('Retry me')
    expect(count).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Send comment'))
    await waitFor(() => expect(count).toHaveBeenCalledWith(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('does not decrement the parent count when delete fails', async () => {
    api.getComments.mockResolvedValue({ data: [comment('mine')], totalCount: 1 })
    api.deleteComment.mockRejectedValue(new Error('offline'))
    const count = vi.fn()
    render(<CommentsModal post={post} onCommentCountChange={count} />)
    await screen.findByText('mine')
    fireEvent.click(screen.getByLabelText('Comment options'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Delete', exact: true })).toBeEnabled(),
    )
    expect(count).not.toHaveBeenCalled()
    expect(screen.getByText('mine')).toBeInTheDocument()
  })
})

describe('comment and reply reads', () => {
  it.each(['comments', 'replies'])(
    'refetches %s offsets after deletion so the original eleventh item is not skipped',
    async (kind) => {
      const collection = await offsetCollection(kind, 11)
      deleteFirst(collection.options)
      await screen.findByText('item-11')
      expect(screen.queryByText('item-1')).not.toBeInTheDocument()
      expect(collection.read.mock.calls.map((call) => call[1])).toEqual([0, 0])
      expect(document.querySelector(`[data-pagination-sentinel="${collection.more}"]`)).not.toBeInTheDocument()
    },
  )
  it.each(['comments', 'replies'])(
    'invalidates pending %s reads on delete and preserves the reset cursor',
    async (kind) => {
      const collection = await offsetCollection(kind, 21)
      let finish
      const stale = collection.snapshot(1)
      collection.read.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      await reachEnd(collection.more)
      deleteFirst(collection.options)
      await waitFor(() =>
        expect(collection.read.mock.calls.map((call) => call[1])).toEqual([0, 1, 0]),
      )
      await screen.findByText('item-11')
      await act(async () => finish(stale))
      await reachEnd(collection.more)
      await screen.findByText('item-21')
      expect(collection.read.mock.calls.map((call) => call[1])).toEqual([0, 1, 0, 1])
      expect(screen.queryByText('item-1')).not.toBeInTheDocument()
    },
  )
  it('blocks submission during a pending first-page retry and retains the subsequently saved comment', async () => {
    let finish
    api.getComments.mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    api.commentPost.mockResolvedValue({ data: { id: 'new', comment: 'Kept comment' } })
    render(<CommentsModal post={post} />)
    await screen.findByRole('button', { name: 'Retry comments' })
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Kept comment' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retry comments' }))
    expect(screen.getByLabelText('Send comment')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Send comment'))
    expect(api.commentPost).not.toHaveBeenCalled()
    await act(async () => finish({ data: [], totalCount: 0 }))
    fireEvent.click(screen.getByLabelText('Send comment'))
    await waitFor(() => expect(screen.getByLabelText('Like comment')).toBeEnabled())
    expect(screen.getByText('Kept comment')).toBeInTheDocument()
  })
  it('blocks submission while the initial read is pending and tolerates malformed auth', async () => {
    localStorage.setItem('socialknkt_auth', '{invalid')
    let finish
    api.getComments.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    render(<CommentsModal post={post} />)
    expect(screen.getByLabelText('Comment')).toBeDisabled()
    expect(screen.getByLabelText('Send comment')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Send comment'))
    expect(api.commentPost).not.toHaveBeenCalled()
    await act(async () => finish({ data: [], totalCount: 0 }))
    expect(screen.getByLabelText('Comment')).toBeEnabled()
  })
  it('shows initial and next-page failures with retry of the same page', async () => {
    const first = Array.from({ length: 10 }, (_, i) => comment(`c${i}`))
    api.getComments
      .mockRejectedValueOnce(new Error('initial'))
      .mockResolvedValueOnce({ data: first, totalCount: 11 })
      .mockRejectedValueOnce(new Error('next'))
      .mockResolvedValueOnce({ data: [comment('last')], totalCount: 11 })
    render(<CommentsModal post={post} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry comments' }))
    await screen.findByText('c0')
    const failedObserver = await reachEnd('More comments')
    await screen.findByRole('button', { name: 'Retry comments' })
    act(() => failedObserver.callback([{ isIntersecting: true }]))
    expect(api.getComments).toHaveBeenCalledTimes(3)
    fireEvent.click(await screen.findByRole('button', { name: 'Retry comments' }))
    await screen.findByText('last')
    expect(api.getComments.mock.calls).toEqual([
      ['post', 0],
      ['post', 0],
      ['post', 1],
      ['post', 1],
    ])
    expect(screen.queryByRole('button', { name: 'Load more comments' })).not.toBeInTheDocument()
  })
  it('paginates replies independently, deduplicates IDs, and retries failed initial/next pages', async () => {
    api.getComments.mockResolvedValue({
      data: [comment('a', { commentReplies: 11 }), comment('b', { commentReplies: 1 })],
      totalCount: 2,
    })
    let aCalls = 0
    api.getCommentReplies.mockImplementation(async (id, page) => {
      if (id === 'b') return { data: [comment('b-reply')], totalCount: 1 }
      aCalls++
      if (aCalls === 1 || aCalls === 3) throw new Error('offline')
      const data =
        page === 0
          ? Array.from({ length: 10 }, (_, i) => comment(`r${i}`))
          : [comment('r9'), comment('r10')]
      return { data, totalCount: 11 }
    })
    render(<CommentsModal post={post} />)
    await screen.findByText('a')
    fireEvent.click(within(row('a')).getByRole('button', { name: /View 11/ }))
    fireEvent.click(await within(row('a')).findByRole('button', { name: 'Retry replies' }))
    await screen.findByText('r0')
    fireEvent.click(within(row('b')).getByRole('button', { name: /View 1/ }))
    await screen.findByText('b-reply')
    await reachEnd('More replies', row('a'))
    fireEvent.click(await within(row('a')).findByRole('button', { name: 'Retry replies' }))
    await screen.findByText('r10')
    expect(screen.getAllByText('r9')).toHaveLength(1)
    expect(api.getCommentReplies.mock.calls).toEqual([
      ['a', 0],
      ['a', 0],
      ['b', 0],
      ['a', 1],
      ['a', 1],
    ])
    expect(screen.queryByRole('button', { name: 'Load more replies' })).not.toBeInTheDocument()
  })
  it('ignores a previous post response after switching posts', async () => {
    let finish
    api.getComments
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      .mockResolvedValueOnce({ data: [comment('current')], totalCount: 1 })
    const view = render(<CommentsModal post={post} />)
    view.rerender(<CommentsModal post={{ id: 'next' }} />)
    await screen.findByText('current')
    await act(async () => finish({ data: [comment('stale')], totalCount: 1 }))
    expect(screen.queryByText('stale')).not.toBeInTheDocument()
  })
})


it('keeps replies lazy and observes only the opened reply list inside the comments scroll area', async () => {
  api.getComments.mockResolvedValue({
    data: [comment('first', { commentReplies: 11 }), comment('collapsed', { commentReplies: 11 })],
    totalCount: 2,
  })
  api.getCommentReplies.mockResolvedValueOnce({
    data: Array.from({ length: 10 }, (_, index) => comment(`reply-${index}`)),
    totalCount: 11,
  }).mockResolvedValueOnce({ data: [comment('last-reply')], totalCount: 11 })
  const { container } = render(<CommentsModal post={post} />)
  await screen.findByText('first')
  expect(api.getCommentReplies).not.toHaveBeenCalled()
  expect(container.querySelector('[data-pagination-sentinel="More replies"]')).toBeNull()
  const scrollArea = container.querySelector('.comments-list')
  scrollArea.style.overflowY = 'auto'
  Object.defineProperties(scrollArea, {
    clientHeight: { value: 300 },
    scrollHeight: { value: 900 },
  })
  fireEvent.click(within(row('first')).getByRole('button', { name: 'View 11 Replies' }))
  await screen.findByText('reply-0')
  expect(api.getCommentReplies).toHaveBeenCalledTimes(1)
  const observer = await reachEnd('More replies', row('first'))
  expect(observer.options.root).toBe(scrollArea)
  await screen.findByText('last-reply')
  expect(api.getCommentReplies.mock.calls).toEqual([['first', 0], ['first', 1]])
  expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument()
})

describe('post-owner moderation', () => {
  it.each(['comments', 'replies'])('lets the post owner delete others %s while retaining Report', async (kind) => {
    const other = comment('other-comment', { userId: 'another-user' })
    api.getComments.mockResolvedValue({
      data: kind === 'comments' ? [other] : [comment('parent', { commentReplies: 1 })],
      totalCount: 1,
    })
    api.getCommentReplies.mockResolvedValue({ data: [other], totalCount: 1 })
    render(<CommentsModal post={post} postOwnerId="me" />)
    if (kind === 'replies')
      fireEvent.click(await screen.findByRole('button', { name: /View 1 Replies/ }))
    await screen.findByText('other-comment')
    fireEvent.click(screen.getByLabelText(kind === 'comments' ? 'Comment options' : 'Reply options'))
    expect(screen.getByRole('button', { name: 'Report', exact: true })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Comment' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
    await waitFor(() => expect(api.deleteComment).toHaveBeenCalledWith('post', 'other-comment'))
  })

  it.each(['other-owner', undefined])('keeps others comments report-only without matching post owner context (%s)', async (postOwnerId) => {
    api.getComments.mockResolvedValue({ data: [comment('other', { userId: 'another-user' })], totalCount: 1 })
    render(<CommentsModal post={{ ...post, userId: 'me' }} postOwnerId={postOwnerId} />)
    fireEvent.click(await screen.findByLabelText('Comment options'))
    expect(screen.getByRole('button', { name: 'Report', exact: true })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Delete Comment' })).not.toBeInTheDocument()
  })

  it('keeps an author able to delete their comment on another owners post without self-report', async () => {
    api.getComments.mockResolvedValue({ data: [comment('mine')], totalCount: 1 })
    render(<CommentsModal post={post} postOwnerId="another-user" />)
    fireEvent.click(await screen.findByLabelText('Comment options'))
    expect(screen.getByRole('button', { name: 'Delete Comment' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Report', exact: true })).not.toBeInTheDocument()
  })
})
