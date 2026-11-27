import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { Flicks } from './Flicks'
import {
  getFlicks,
  getSavedPosts,
  recordPostViews,
  deletePost,
  getComments,
  commentPost,
} from '../../action/action'

vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'viewer' } }),
}))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  getFlicks: vi.fn(),
  savePost: vi.fn(),
  deletePost: vi.fn(),
  updatePostLike: vi.fn(),
  getSavedPosts: vi.fn(),
  recordPostViews: vi.fn().mockResolvedValue({}),
  getComments: vi.fn(),
  commentPost: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
it('updates the visible flick comment count after a successful comment', async () => {
  getFlicks.mockResolvedValue({
    data: [{ id: 'mine', description: 'Flick with comments', commentCount: 3 }],
  })
  getComments.mockResolvedValue({ data: [], totalCount: 0 })
  commentPost.mockResolvedValue({ data: { id: 'comment-1', comment: 'New comment' } })
  render(
    <MemoryRouter>
      <Flicks />
    </MemoryRouter>,
  )
  await screen.findByText('Flick with comments')
  const commentsButton = screen.getByRole('button', { name: 'Comments', exact: true })
  expect(commentsButton.textContent).toBe('3')
  fireEvent.click(commentsButton)
  await waitFor(() => expect(screen.getByLabelText('Comment').disabled).toBe(false))
  fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'New comment' } })
  fireEvent.click(screen.getByLabelText('Send comment'))
  await waitFor(() => expect(commentsButton.textContent).toBe('4'))
})
it('batches visible flicks and does not count repeated visibility', async () => {
  let intersect
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
  getFlicks.mockResolvedValue({ data: [{ id: 'flick-1', description: 'Visible flick' }] })
  render(
    <MemoryRouter>
      <Flicks />
    </MemoryRouter>,
  )
  await screen.findByText('Visible flick')
  const target = {
    dataset: { postId: 'flick-1' },
    play: vi.fn().mockResolvedValue(),
    pause: vi.fn(),
  }
  intersect([{ target, isIntersecting: true }])
  intersect([{ target, isIntersecting: true }])
  expect(recordPostViews).toHaveBeenCalledExactlyOnceWith(['flick-1'])
})
it('retains a flick after deletion failure and removes it after retry without reloading', async () => {
  getFlicks.mockResolvedValue({
    data: [{ id: 'mine', userId: 'viewer', description: 'My flick' }],
  })
  deletePost.mockRejectedValueOnce(new Error()).mockResolvedValueOnce({ status: true })
  render(
    <MemoryRouter>
      <Flicks />
    </MemoryRouter>,
  )
  await screen.findByText('My flick')
  fireEvent.click(screen.getByRole('button', { name: 'More', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Delete', exact: true }).disabled).toBe(false),
  )
  expect(screen.getByText('My flick')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(screen.queryByText('My flick')).toBeNull())
  expect(deletePost).toHaveBeenCalledTimes(2)
})
it('removes by ID when overlapping pagination replaces a flick during deletion', async () => {
  const mine = { id: 'mine', userId: 'viewer', description: 'Original flick' }
  getFlicks
    .mockResolvedValueOnce({
      data: [mine, ...Array.from({ length: 9 }, (_, index) => ({ id: `other-${index}` }))],
    })
    .mockResolvedValueOnce({ data: [{ ...mine, description: 'Refreshed flick' }] })
  let resolve
  deletePost.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    }),
  )
  render(
    <MemoryRouter>
      <Flicks />
    </MemoryRouter>,
  )
  await screen.findByText('Original flick')
  fireEvent.click(screen.getAllByRole('button', { name: 'More', exact: true })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  fireEvent.click(screen.getByText('Load more flicks'))
  await screen.findByText('Refreshed flick')
  await act(async () => resolve({ status: true }))
  expect(screen.queryByText('Refreshed flick')).toBeNull()
})
it('loads the next page, retries its failure, and deduplicates overlap', async () => {
  const first = Array.from({ length: 10 }, (_, i) => ({
    _id: String(i),
    description: `Flick ${i}`,
    mediaType: 'flicks',
    media: '/video.mp4',
  }))
  getFlicks
    .mockResolvedValueOnce({ data: first })
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce({
      data: [first[0], { _id: '10', description: 'Next flick', media: '/video.mp4' }],
    })
  render(
    <MemoryRouter>
      <Flicks />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByText('Load more flicks'))
  fireEvent.click(await screen.findByText('Retry'))
  await screen.findByText('Next flick')
  expect(screen.getAllByText('Flick 0')).toHaveLength(1)
  expect(getFlicks).toHaveBeenLastCalledWith(1, 10)
  expect(screen.queryByText('Load more flicks')).toBeNull()
})
it('restarts offset pagination after deletion and ignores an older in-flight page', async () => {
  let rows = Array.from({ length: 11 }, (_, index) => ({
    id: String(index),
    userId: 'viewer',
    description: 'Offset flick ' + index,
  }))
  let oldPage
  getFlicks.mockImplementation((page) => {
    if (page === 1)
      return new Promise((resolve) => {
        oldPage = resolve
      })
    return Promise.resolve({ data: rows.slice(page * 10, page * 10 + 10) })
  })
  deletePost.mockImplementation(async () => {
    rows = rows.slice(1)
    return { status: true }
  })
  render(
    <MemoryRouter>
      <Flicks />
    </MemoryRouter>,
  )
  await screen.findByText('Offset flick 0')
  fireEvent.click(screen.getByText('Load more flicks'))
  fireEvent.click(screen.getAllByRole('button', { name: 'More', exact: true })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
  await waitFor(() => expect(screen.queryByText('Offset flick 0')).toBeNull())
  await act(async () => oldPage({ data: [{ id: '0', description: 'Offset flick 0' }] }))
  expect(screen.queryByText('Offset flick 0')).toBeNull()
  fireEvent.click(screen.getByText('Load more flicks'))
  await screen.findByText('Offset flick 10')
  expect(getFlicks).toHaveBeenLastCalledWith(0, 10)
})
it('reads saved records without calling the ordinary feed or inventing an unsave', async () => {
  getSavedPosts.mockResolvedValue({ data: [] })
  render(
    <MemoryRouter initialEntries={['/flicks?saved=true']}>
      <Flicks />
    </MemoryRouter>,
  )
  await waitFor(() => expect(getSavedPosts).toHaveBeenCalledWith(0, 10))
  expect(getFlicks).not.toHaveBeenCalled()
  expect(await screen.findByText('No saved flicks on this page.')).toBeTruthy()
})
