import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { Home } from './Home'
import { Knkt } from '../knkt/Knkt'
import { getPost, getThread, getPosts, getThreads } from '../../action/action'

vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../context/ProfileContext', () => ({ useProfile: () => ({ profile: {} }) }))
vi.mock('./components/ProfileCard', () => ({ ProfileCard: () => null }))
vi.mock('./components/PostCard', () => ({ PostCard: ({ post }) => <p>{post.description}</p> }))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  getPost: vi.fn(),
  getThread: vi.fn(),
  getPosts: vi.fn().mockResolvedValue({ data: [] }),
  getFlicks: vi.fn().mockResolvedValue({ data: [] }),
  getThreads: vi.fn().mockResolvedValue({ data: [] }),
  getTopics: vi.fn().mockResolvedValue({ data: [] }),
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
function Navigation() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/home?postId=new')}>Change post</button>
}
it('loads a selected post without requesting the ordinary feed and ignores old responses', async () => {
  let resolveOld
  getPost.mockImplementation((id) =>
    id === 'old'
      ? new Promise((resolve) => {
          resolveOld = resolve
        })
      : Promise.resolve({ data: { id: 'new', description: 'New post' } }),
  )
  render(
    <MemoryRouter initialEntries={['/home?postId=old']}>
      <Navigation />
      <Home />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('Change post'))
  await screen.findByText('New post')
  await act(async () => resolveOld({ data: { id: 'old', description: 'Old post' } }))
  expect(screen.queryByText('Old post')).toBeNull()
  expect(getPosts).not.toHaveBeenCalled()
})
it('shows a safe failure and retries a post deep link', async () => {
  getPost
    .mockRejectedValueOnce(new Error('internal error'))
    .mockResolvedValueOnce({ data: { id: 'a', description: 'Recovered post' } })
  render(
    <MemoryRouter initialEntries={['/home?postId=a']}>
      <Home />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByText('Retry'))
  await screen.findByText('Recovered post')
  expect(screen.queryByText('internal error')).toBeNull()
})
it('opens a single thread and restores the list on Back', async () => {
  getThread.mockResolvedValue({
    data: {
      id: 'thread1',
      title: 'Linked thread',
      body: 'Thread body',
      fname: 'Author',
      topic: [],
    },
  })
  render(
    <MemoryRouter initialEntries={['/knkt?threadId=thread1']}>
      <Knkt />
    </MemoryRouter>,
  )
  await screen.findByText('Linked thread')
  expect(getThread).toHaveBeenCalledWith('thread1')
  expect(getThreads).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Back to threads'))
  await waitFor(() => expect(getThreads).toHaveBeenCalledWith(0, 1, 10, ''))
})
