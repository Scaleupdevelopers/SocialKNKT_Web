import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { Profile } from './Profile'
import { useProfile } from '../../context/ProfileContext'
import * as api from '../../action/action'

let paginationObservers
async function intersectPagination(label) {
  await act(async () => {})
  let observer
  await waitFor(() => {
    observer = [...paginationObservers].find(
      (item) => item.target?.dataset.paginationSentinel === label,
    )
    expect(observer).toBeDefined()
  })
  await act(async () => {
    const entry = { target: observer.target, isIntersecting: true }
    observer.callback([entry])
    observer.callback([entry])
  })
}

vi.mock('../../action/action', () => ({
  getMyAllPosts: vi.fn(),
  getOtherUserPosts: vi.fn(),
  getOtherUserProfile: vi.fn(),
  getAllMyFeed: vi.fn(),
  getOtherUserFeed: vi.fn(),
  getAllMyFlicks: vi.fn(),
  getOtherUserFlicks: vi.fn(),
}))
vi.mock('../../context/ProfileContext', () => ({
  useProfile: vi.fn(),
  normalizeProfile: (data) => data,
}))
vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../home/Home', () => ({ CreatePost: () => <div>Create post</div> }))
vi.mock('../home/components/PostCard', () => ({
  PostCard: ({ post, onDeleted }) => (
    <article>
      {post.title}
      <button onClick={() => onDeleted(post.id)}>Delete {post.title}</button>
    </article>
  ),
}))
vi.mock('../settings/components/ProfileHeader', () => ({
  ProfileHeader: ({ profileOverride, onRelationshipChanged }) => (
    <>
      <h1>{profileOverride?.fname}</h1>
      <button onClick={onRelationshipChanged}>Relationship changed</button>
    </>
  ),
}))
const own = {
  id: 'me',
  fname: 'Own profile',
  educations: [{ school: 'Verified college' }],
  places: [{ cityName: 'Pune', countryName: 'India', currentlyLiving: true }],
  record_name: 'https://example.test/name.mp3',
}
const posts = (prefix) =>
  Array.from({ length: 10 }, (_, i) => ({ id: prefix + i, title: prefix + i }))
const media = (prefix) =>
  Array.from({ length: 10 }, (_, i) => ({
    id: prefix + i,
    media: 'https://example.test/' + prefix + i + '.png',
  }))
function Navigation() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => navigate('/profile?userId=b')}>Visit B</button>
      <Profile />
    </>
  )
}
function mount(path = '/profile') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navigation />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  paginationObservers = new Set()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback
      }
      observe(target) {
        this.target = target
        paginationObservers.add(this)
      }
      disconnect() {
        paginationObservers.delete(this)
      }
    },
  )
  useProfile.mockReturnValue({
    profile: own,
    authToken: 'session',
    isLoading: false,
    refreshProfile: vi.fn(),
  })
  for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue({ data: [] })
  api.getOtherUserProfile.mockImplementation((id) =>
    Promise.resolve({ data: { id, fname: id === 'b' ? 'Profile B' : 'Profile A' } }),
  )
})

it('renders backend/mobile summary fields and recorded name audio', async () => {
  mount()
  expect(screen.getByText('Verified college')).toBeVisible()
  expect(screen.getByText('Pune, India')).toBeVisible()
  expect(screen.getByLabelText('Name pronunciation recording')).toHaveAttribute(
    'src',
    own.record_name,
  )
  await screen.findByText('No posts yet')
})

it('retries a failed viewed profile and refreshes it after relationship changes', async () => {
  api.getOtherUserProfile.mockRejectedValueOnce(new Error('private details'))
  mount('/profile?userId=a')
  fireEvent.click(await screen.findByRole('button', { name: 'Retry profile' }))
  await screen.findByText('Profile A')
  api.getOtherUserProfile.mockResolvedValueOnce({
    data: { id: 'a', fname: 'Updated relationship' },
  })
  fireEvent.click(screen.getByText('Relationship changed'))
  await screen.findByText('Updated relationship')
  expect(api.getOtherUserProfile).toHaveBeenCalledTimes(3)
  api.getOtherUserProfile.mockResolvedValueOnce({
    data: { id: 'a', fname: 'Connection refreshed' },
  })
  act(() => window.dispatchEvent(new Event('connections-change')))
  await screen.findByText('Connection refreshed')
})

it('offers own profile retry instead of empty summaries when context fails', () => {
  const refreshProfile = vi.fn()
  useProfile.mockReturnValue({
    profile: null,
    error: new Error('failed'),
    refreshProfile,
  })
  mount()
  fireEvent.click(screen.getByText('Retry profile'))
  expect(refreshProfile).toHaveBeenCalledOnce()
  expect(api.getMyAllPosts).not.toHaveBeenCalled()
})

it('retries the failed posts page without dropping existing posts or skipping offsets', async () => {
  api.getMyAllPosts
    .mockResolvedValueOnce({ data: posts('first') })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: [{ id: 'last', title: 'Last post' }] })
  mount()
  await intersectPagination('posts pagination')
  expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument()
  expect([...paginationObservers]).toHaveLength(0)
  fireEvent.click(await screen.findByText('Retry posts'))
  await screen.findByText('Last post')
  expect(screen.getByText('first0')).toBeVisible()
  expect(api.getMyAllPosts.mock.calls.map((call) => call[0])).toEqual([0, 1, 1])
})

it('retries initial posts errors without presenting them as empty feeds', async () => {
  api.getMyAllPosts.mockRejectedValueOnce(new Error('offline'))
  mount()
  await screen.findByText('Retry posts')
  expect(screen.queryByText('No posts yet')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('Retry posts'))
  await screen.findByText('No posts yet')
})

it('discards a previous user pagination response after navigation', async () => {
  let finish
  api.getOtherUserPosts.mockImplementation((id, page) => {
    if (id === 'b') return Promise.resolve({ data: [{ id: 'b', title: 'B post' }] })
    return page === 0
      ? Promise.resolve({ data: posts('a') })
      : new Promise((resolve) => {
          finish = resolve
        })
  })
  mount('/profile?userId=a')
  await intersectPagination('posts pagination')
  fireEvent.click(screen.getByText('Visit B'))
  await screen.findByText('B post')
  await act(async () => finish({ data: [{ id: 'stale', title: 'Stale A' }] }))
  expect(screen.queryByText('Stale A')).not.toBeInTheDocument()
  expect(screen.queryByText('a0')).not.toBeInTheDocument()
})

it('uses endpoint filter inputs personal=1 and professional=2 and discards previous tab results', async () => {
  let finish
  api.getMyAllPosts.mockImplementation((page, limit, type) => {
    if (type === 1)
      return new Promise((resolve) => {
        finish = resolve
      })
    return Promise.resolve({
      data: type === 2 ? [{ id: 'pro', title: 'Professional post' }] : [],
    })
  })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Posts', exact: true }))
  fireEvent.click(screen.getByRole('tab', { name: 'Personal' }))
  await waitFor(() => expect(api.getMyAllPosts).toHaveBeenLastCalledWith(0, 10, 1))
  fireEvent.click(screen.getByRole('tab', { name: 'Professional' }))
  await screen.findByText('Professional post')
  expect(api.getMyAllPosts).toHaveBeenLastCalledWith(0, 10, 2)
  await act(async () => finish({ data: [{ id: 'personal', title: 'Old personal' }] }))
  expect(screen.queryByText('Old personal')).not.toBeInTheDocument()
})

it('independently retries and paginates media and flicks without losing successful collections', async () => {
  api.getAllMyFeed
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ data: media('feed') })
    .mockResolvedValueOnce({ data: media('next').slice(0, 1) })
  api.getAllMyFlicks
    .mockResolvedValueOnce({ data: media('flick') })
    .mockResolvedValueOnce({ data: media('last').slice(0, 1) })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  fireEvent.click(await screen.findByText('Retry feed media'))
  await screen.findByAltText('Feed media 1')
  expect(screen.getByLabelText('Preview Flick 1')).toBeVisible()
  await intersectPagination('feed media pagination')
  await intersectPagination('flicks pagination')
  await screen.findByAltText('Feed media 11')
  await screen.findByLabelText('Preview Flick 11')
  expect(api.getAllMyFeed.mock.calls.map((call) => call[0])).toEqual([0, 0, 1])
  expect(api.getAllMyFlicks.mock.calls.map((call) => call[0])).toEqual([0, 1])
})

it('clears media previews and rejects old media results when changing profile', async () => {
  let finish
  api.getOtherUserFeed.mockImplementation((id) =>
    id === 'a'
      ? new Promise((resolve) => {
          finish = resolve
        })
      : Promise.resolve({ data: [] }),
  )
  mount('/profile?userId=a')
  await screen.findByText('Profile A')
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  await waitFor(() => expect(api.getOtherUserFeed).toHaveBeenCalledWith('a', 0, 10))
  fireEvent.click(screen.getByText('Visit B'))
  await screen.findByText('Profile B')
  fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
  await act(async () => finish({ data: media('stale') }))
  await screen.findByText('No records found')
  expect(screen.queryByAltText('Feed media 1')).not.toBeInTheDocument()
})

it.each(['All', 'Personal', 'Professional'])(
  'reloads offset pagination after deletion in %s posts',
  async (tab) => {
    let rows = [...posts('row'), { id: 'last', title: 'Eleventh post' }]
    api.getMyAllPosts.mockImplementation((page, limit) =>
      Promise.resolve({ data: rows.slice(page * limit, (page + 1) * limit) }),
    )
    mount()
    if (tab !== 'All') {
      fireEvent.click(screen.getByRole('button', { name: 'Posts', exact: true }))
      fireEvent.click(screen.getByRole('tab', { name: tab }))
    }
    await screen.findByText('row0')
    api.getMyAllPosts.mockClear()
    rows = rows.filter((row) => row.id !== 'row0')
    fireEvent.click(screen.getByRole('button', { name: 'Delete row0' }))
    await screen.findByText('Eleventh post')
    expect(screen.queryByText('row0')).not.toBeInTheDocument()
    expect(api.getMyAllPosts.mock.calls.map((call) => call[0])).toEqual([0])
    await intersectPagination('posts pagination')
    await waitFor(() => expect([...paginationObservers]).toHaveLength(0))
    expect(api.getMyAllPosts.mock.calls.map((call) => call[0])).toEqual([0, 1])
    expect(screen.getAllByRole('article')).toHaveLength(10)
  },
)

it('invalidates a pending posts page when deletion restarts pagination', async () => {
  let finishOldPage
  api.getMyAllPosts
    .mockResolvedValueOnce({ data: posts('row') })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOldPage = resolve
        }),
    )
    .mockResolvedValueOnce({
      data: [...posts('row').slice(1), { id: 'last', title: 'Eleventh post' }],
    })
    .mockResolvedValueOnce({ data: [] })
  mount()
  await intersectPagination('posts pagination')
  fireEvent.click(screen.getByRole('button', { name: 'Delete row0' }))
  await act(async () => finishOldPage({ data: [{ id: 'stale', title: 'Obsolete page' }] }))
  await screen.findByText('Eleventh post')
  expect(screen.queryByText('Obsolete page')).not.toBeInTheDocument()
  expect(screen.queryByText('row0')).not.toBeInTheDocument()
  await intersectPagination('posts pagination')
  await waitFor(() => expect([...paginationObservers]).toHaveLength(0))
  expect(api.getMyAllPosts.mock.calls.map((call) => call[0])).toEqual([0, 1, 0, 1])
})

it('shows empty posts only after the deletion reload confirms an empty collection', async () => {
  let finishReload
  api.getMyAllPosts
    .mockResolvedValueOnce({ data: [{ id: 'only', title: 'Only post' }] })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishReload = resolve
        }),
    )
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Only post' }))
  expect(screen.queryByText('No posts yet')).not.toBeInTheDocument()
  await waitFor(() => expect(api.getMyAllPosts).toHaveBeenCalledTimes(2))
  await act(async () => finishReload({ data: [] }))
  await screen.findByText('No posts yet')
})

it.each([
  ['feed media pagination', 'getAllMyFeed', 'Loading feed media…', 'My Feed media'],
  ['flicks pagination', 'getAllMyFlicks', 'Loading flicks…', 'Your Flicks media'],
])(
  'appends %s once inside its independent scroll region',
  async (label, action, loadingLabel, regionName) => {
    let finish
    api[action].mockResolvedValueOnce({ data: media('first') }).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Media', exact: true }))
    await intersectPagination(label)
    const region = screen.getByRole('region', { name: regionName })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.querySelector(`[data-pagination-sentinel="${label}"]`)).toBeInTheDocument()
    expect(api[action].mock.calls.map(([page]) => page)).toEqual([0, 1])
    expect(within(region).getByRole('status', { name: loadingLabel })).toBeInTheDocument()
    expect(region.querySelectorAll('.profile-media-cell, video')).toHaveLength(10)
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument()
    await act(async () => finish({ data: [{ id: 'last', media: '/last.png' }] }))
    expect(within(region).queryByRole('status', { name: loadingLabel })).not.toBeInTheDocument()
    expect(region.querySelectorAll('.profile-media-cell, video')).toHaveLength(11)
  },
)
