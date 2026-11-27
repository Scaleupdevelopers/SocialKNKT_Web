import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Header } from '../../layouts/Header'
import { CreatePost, Home } from './Home'
import { usePagedList } from '../../utils/usePagedList'
import { toast } from 'react-toastify'
import { Knkt } from '../knkt/Knkt'
import {
  createPost,
  createThread,
  getThreads,
  getTopics,
  getPopularTopics,
  uploadFile,
  getPosts,
  getFlicks,
  getPost,
} from '../../action/action'

vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('./components/PostCard', () => ({
  PostCard: ({ post, onDeleted }) => (
    <article>
      <p>{post.description}</p>
      <button onClick={() => onDeleted(post.id || post._id)}>Delete {post.description}</button>
    </article>
  ),
}))

vi.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { fullName: 'Test Author' } }),
}))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  createPost: vi.fn(),
  createThread: vi.fn(),
  uploadFile: vi.fn(),
  getThreads: vi.fn(),
  getPosts: vi.fn(),
  getPost: vi.fn(),
  getFlicks: vi.fn(),
  getConnectionCount: vi.fn().mockResolvedValue({ data: 0 }),
  getNotificationCount: vi.fn().mockResolvedValue({ data: 0 }),
  getTopics: vi.fn().mockResolvedValue({ data: [{ _id: 'topic-1', topic: 'Technology' }] }),
  getPopularTopics: vi.fn().mockResolvedValue({ data: [{ _id: 'topic-1', topic: 'Technology' }] }),
  getThreadLocations: vi.fn().mockResolvedValue({ data: [] }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Stop after the observable write payload; successful post reload is existing behavior.
  createPost.mockRejectedValue(new Error('Controlled write failure'))
  createThread.mockResolvedValue({ data: {} })
  uploadFile.mockResolvedValue('uploaded.mp4')
  getThreads.mockResolvedValue({ data: [] })
  getPosts.mockReset().mockResolvedValue({ data: [] })
  getPost.mockReset()
  getFlicks.mockReset().mockResolvedValue({ data: [] })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

describe.each(['Home', 'Header'])('%s composer', (surface) => {
  function openComposer() {
    render(<MemoryRouter>{surface === 'Home' ? <CreatePost /> : <Header />}</MemoryRouter>)
    if (surface === 'Header') fireEvent.click(screen.getByRole('button', { name: 'New Post' }))
  }

  it.each([
    ['Choose flick', 'flicks'],
    ['Choose video', 'video'],
  ])('sends %s as %s', async (label, mediaType) => {
    openComposer()
    const file = new File(['video'], 'clip.mp4', { type: 'video/mp4' })
    fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } })
    const other = label === 'Choose flick' ? 'Choose video' : 'Choose flick'
    fireEvent.change(screen.getByLabelText(other), { target: { files: [] } })
    fireEvent.click(screen.getByRole('button', { name: 'Post', exact: true }))
    await waitFor(() =>
      expect(createPost).toHaveBeenCalledWith(
        expect.objectContaining({ mediaType, media: 'uploaded.mp4' }),
      ),
    )
    expect(uploadFile).toHaveBeenCalledWith(file)
  })

  it('writes canonical link mediaType without uploading a file', async () => {
    openComposer()
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Video Link' }))
    fireEvent.change(screen.getByPlaceholderText('Enter video link'), {
      target: { value: 'https://youtu.be/example' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Link' }))
    await waitFor(() =>
      expect(createPost).toHaveBeenCalledWith(
        expect.objectContaining({ mediaType: 'link', media: 'https://youtu.be/example' }),
      ),
    )
    expect(uploadFile).not.toHaveBeenCalled()
  })
})

it('refreshes the KNKT list after posting a question from its header', async () => {
  render(
    <MemoryRouter initialEntries={['/knkt']}>
      <Knkt />
    </MemoryRouter>,
  )
  await waitFor(() => expect(getThreads).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button', { name: 'New Post' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Create KNKT(n) Thread' }))
  const modal = within(screen.getByRole('dialog', { name: 'Ask or Share on KNKT(n)' }))
  fireEvent.change(modal.getByLabelText('Question'), { target: { value: 'Why test?' } })
  fireEvent.change(modal.getByLabelText('Location'), { target: { value: 'Mumbai' } })
  fireEvent.click(modal.getByRole('button', { name: 'Categories' }))
  fireEvent.click(await modal.findByRole('checkbox', { name: 'Technology' }))
  fireEvent.submit(modal.getByRole('form'))
  await waitFor(() => expect(getThreads).toHaveBeenCalledTimes(2))
  expect(createThread).toHaveBeenCalledWith({
    type: 1,
    question: 'Why test?',
    location: 'Mumbai',
    topic: ['topic-1'],
  })
  expect(
    screen.queryByRole('dialog', { name: 'Ask or Share on KNKT(n)' }),
  ).not.toBeInTheDocument()
})

it('copies a resolvable thread URL rather than notification text', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  getThreads.mockResolvedValue({
    data: [{ _id: 'thread-1', title: 'Thread title', body: 'Body', topic: [] }],
  })
  render(
    <MemoryRouter initialEntries={['/knkt']}>
      <Knkt />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Copy Link' }))
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/knkt?threadId=thread-1`),
  )
})

it('uses id-only topics for navigation, selected chips and thread creation', async () => {
  getTopics.mockResolvedValueOnce({ data: [{ id: 'fallback-topic', topic: 'Technology' }] })
  getPopularTopics.mockResolvedValueOnce({ data: [{ id: 'fallback-topic', topic: 'Technology' }] })
  const { container } = render(
    <MemoryRouter initialEntries={['/knkt']}>
      <Knkt />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByText('Technology'))
  await waitFor(() => expect(getThreads).toHaveBeenCalledWith(0, 1, 10, 'fallback-topic'))
  fireEvent.click(screen.getByRole('button', { name: '＋ New Post' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test thread' } })
  fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'Test body' } })
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Mumbai' } })
  fireEvent.click(screen.getByRole('button', { name: 'Choose categories' }))
  const menu = within(container.querySelector('.knkt-topic-menu'))
  fireEvent.click(menu.getByRole('button', { name: 'Technology' }))
  expect(screen.getByRole('button', { name: 'Remove Technology' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await waitFor(() =>
    expect(createThread).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 2,
        topic: ['fallback-topic'],
      }),
    ),
  )
})

function deferredRead() {
  let resolve
  let reject
  const promise = new Promise((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const feedPost = (index) => ({ id: `post-${index}`, description: `Post ${index}` })
const feedRows = (count) => Array.from({ length: count }, (_, index) => feedPost(index))

function mountFeed(path = '/home') {
  const observers = new Set()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback
      }
      observe(element) {
        if (element.classList.contains('feed-end-marker')) observers.add(this)
      }
      disconnect() {
        observers.delete(this)
      }
    },
  )
  render(
    <MemoryRouter initialEntries={[path]}>
      <Home />
    </MemoryRouter>,
  )
  return async () => {
    await act(async () => {})
    await act(async () => {
      for (const observer of observers) observer.callback([{ isIntersecting: true }])
    })
  }
}

describe('Home feed pagination', () => {
  it('merges overlapping pages by post ID and continues using the raw page length', async () => {
    getPosts
      .mockResolvedValueOnce({ data: [...feedRows(10), feedPost(0)] })
      .mockResolvedValueOnce({ data: feedRows(19).slice(9) })
      .mockResolvedValueOnce({ data: [] })
    const scroll = mountFeed()
    await screen.findByText('Post 9', { exact: true })
    expect(screen.getAllByText('Post 0', { exact: true })).toHaveLength(1)
    await scroll()
    await screen.findByText('Post 18', { exact: true })
    expect(screen.getAllByText('Post 9', { exact: true })).toHaveLength(1)
    await scroll()
    await waitFor(() => expect(getPosts).toHaveBeenLastCalledWith(2, 10))
    expect(screen.getAllByRole('article')).toHaveLength(19)
  })

  it('refetches offset zero after deletion so the original eleventh post is not skipped', async () => {
    let serverRows = feedRows(11)
    getPosts.mockImplementation(async (page, limit) => ({
      data: serverRows.slice(page * limit, page * limit + limit),
    }))
    const scroll = mountFeed()
    await screen.findByText('Post 9', { exact: true })
    serverRows = serverRows.slice(1)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Post 0', exact: true }))
    await screen.findByText('Post 10', { exact: true })
    expect(screen.queryByText('Post 0', { exact: true })).not.toBeInTheDocument()
    expect(getPosts.mock.calls.map(([page]) => page)).toEqual([0, 0])
    await scroll()
    await waitFor(() => expect(getPosts).toHaveBeenLastCalledWith(1, 10))
    expect(screen.getAllByRole('article')).toHaveLength(10)
  })

  it.each(['success', 'failure'])(
    'invalidates a pre-delete read on %s without releasing the new read lock',
    async (outcome) => {
      const oldPage = deferredRead()
      const newPage = deferredRead()
      getPosts
        .mockResolvedValueOnce({ data: feedRows(10) })
        .mockReturnValueOnce(oldPage.promise)
        .mockResolvedValueOnce({ data: feedRows(11).slice(1) })
        .mockReturnValueOnce(newPage.promise)
      const scroll = mountFeed()
      await screen.findByText('Post 9', { exact: true })
      await scroll()
      fireEvent.click(screen.getByRole('button', { name: 'Delete Post 0', exact: true }))
      await screen.findByText('Post 10', { exact: true })
      await scroll()
      const settle = {
        success: () => oldPage.resolve({ data: [feedPost(0), feedPost(99)] }),
        failure: () => oldPage.reject(new Error('stale failure')),
      }
      await act(async () => settle[outcome]())
      expect(screen.getByLabelText('Loading post')).toBeInTheDocument()
      expect(screen.queryByText('Post 99', { exact: true })).not.toBeInTheDocument()
      expect(toast.error).not.toHaveBeenCalled()
      await scroll()
      expect(getPosts.mock.calls.map(([page]) => page)).toEqual([0, 1, 0, 1])
      await act(async () => newPage.resolve({ data: [feedPost(11)] }))
      expect(screen.getByText('Post 11', { exact: true })).toBeInTheDocument()
      expect(screen.queryByLabelText('Loading post')).not.toBeInTheDocument()
    },
  )

  it('removes a deleted detail post without fetching the deleted ID again', async () => {
    getPost.mockResolvedValue({ data: feedPost(0) })
    mountFeed('/home?postId=post-0')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Post 0', exact: true }))
    await screen.findByText('Explore and Connect')
    expect(getPost).toHaveBeenCalledTimes(1)
    expect(getPosts).not.toHaveBeenCalled()
  })
})

describe('shared paged list identity', () => {
  it('preserves userId-only connections and ID-less posts sharing an author with the default identity', async () => {
    const read = vi
      .fn()
      .mockResolvedValue({
        data: [
          { userId: 'a' },
          { userId: 'b' },
          { userId: 'author', description: 'First' },
          { userId: 'author', description: 'Second' },
        ],
      })
    const { result } = renderHook(() => usePagedList(read))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(4)
  })

  it('retains userId-only connections and unknown identities while merging overlapping connections', async () => {
    const first = [
      { userId: 'a', name: 'A' },
      { userId: 'b', name: 'B' },
      { name: 'Unknown A' },
    ]
    const read = vi
      .fn()
      .mockResolvedValueOnce({ data: first })
      .mockResolvedValueOnce({
        data: [
          { userId: 'a', name: 'Updated A' },
          { userId: 'c', name: 'C' },
          { name: 'Unknown B' },
        ],
      })
    const connectionId = (item) => item.userId
    const { result } = renderHook(() => usePagedList(read, 3, connectionId))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toHaveLength(3)
    await act(async () => result.current.loadMore())
    expect(result.current.items.map((item) => item.name)).toEqual([
      'Updated A',
      'B',
      'Unknown A',
      'C',
      'Unknown B',
    ])
    expect(result.current.hasMore).toBe(true)
  })

  it('merges id/_id posts independently of their shared author and deduplicates reload results', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { id: 'a', userId: 'author' },
          { _id: 'b', userId: 'author' },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          { _id: 'a', userId: 'author', description: 'Updated' },
          { id: 'c', userId: 'author' },
        ],
      })
      .mockResolvedValueOnce({ data: [{ id: 'z' }, { _id: 'z' }] })
    const { result } = renderHook(() => usePagedList(read, 2))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => result.current.loadMore())
    expect(result.current.items).toHaveLength(3)
    expect(result.current.items[0].description).toBe('Updated')
    expect(result.current.hasMore).toBe(true)
    await act(async () => result.current.reload())
    expect(result.current.items).toEqual([{ _id: 'z' }])
    expect(result.current.hasMore).toBe(true)
  })
})
