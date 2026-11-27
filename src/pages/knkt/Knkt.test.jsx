import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { Knkt } from './Knkt'
import {
  createThread,
  getPopularTopics,
  getThreadLocations,
  getTopics,
  getThreads,
  uploadFile,
} from '../../action/action'
import { toast } from 'react-toastify'
import { AUTH_STORAGE_KEY } from '../../utils/helper'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'me', fullName: 'Test Author' } }),
}))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  getTopics: vi.fn(),
  getPopularTopics: vi.fn(),
  createThread: vi.fn(),
  uploadFile: vi.fn(),
  getThreadLocations: vi.fn(),
  getThreads: vi.fn().mockResolvedValue({ data: [] }),
}))

const observers = []

function deferred() {
  let resolve
  let reject
  const promise = new Promise((accept, fail) => {
    resolve = accept
    reject = fail
  })
  return { promise, resolve, reject }
}

function setup({ strict = false } = {}) {
  const route = (
    <MemoryRouter initialEntries={['/knkt']}>
      <Routes>
        <Route path="/knkt" element={<Knkt />} />
      </Routes>
    </MemoryRouter>
  )
  return render(strict ? <StrictMode>{route}</StrictMode> : route)
}

function openComposer() {
  fireEvent.click(screen.getByRole('button', { name: '＋ New Post' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Keep title' } })
  fireEvent.change(screen.getByLabelText('Body'), { target: { value: 'Keep body' } })
}

async function reachLocationEnd() {
  let observer
  await waitFor(() => {
    observer = observers.findLast((item) => item.active && item.target?.dataset.paginationSentinel === 'More locations')
    expect(observer).toBeDefined()
  })
  act(() => {
    observer.callback([{ isIntersecting: true }])
    observer.callback([{ isIntersecting: true }])
  })
  return observer
}

function queryLocation(value) {
  fireEvent.change(screen.getByLabelText('Location'), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  observers.length = 0
  uploadFile.mockReset().mockResolvedValue('https://example.com/photo.png')
  getPopularTopics
    .mockReset()
    .mockResolvedValue({ data: [{ id: 'popular', topic: 'Popular choice' }] })
  createThread.mockReset().mockResolvedValue({ data: { id: 'created' } })
  getThreads.mockReset().mockResolvedValue({ data: [] })
  getTopics.mockReset().mockResolvedValue({ data: [{ id: 'topic', topic: 'Technology' }] })
  getThreadLocations.mockReset().mockResolvedValue({ data: [] })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback
        this.active = true
        observers.push(this)
      }
      observe(target) { this.target = target }
      disconnect() { this.active = false }
    },
  )
})

it('handles a topics failure and retries inside the composer without losing the draft', async () => {
  getTopics.mockRejectedValueOnce(new Error('private catalog failure'))
  const { container } = setup()
  openComposer()
  const composer = within(container.querySelector('.knkt-thread-composer'))
  fireEvent.click(await composer.findByRole('button', { name: 'Retry categories' }))
  await waitFor(() =>
    expect(composer.getByRole('button', { name: 'Choose categories' })).toBeEnabled(),
  )
  fireEvent.click(composer.getByRole('button', { name: 'Choose categories' }))
  fireEvent.click(await composer.findByRole('button', { name: 'Technology' }))
  expect(composer.getByRole('button', { name: 'Remove Technology' })).toBeVisible()
  expect(screen.getByLabelText('Title')).toHaveValue('Keep title')
  expect(screen.getByLabelText('Body')).toHaveValue('Keep body')
  expect(screen.queryByText('private catalog failure')).not.toBeInTheDocument()
  expect(getTopics).toHaveBeenCalledTimes(2)
})

it('ignores a stale topics result after effect cleanup', async () => {
  const old = deferred()
  getTopics.mockReturnValueOnce(old.promise)
  setup({ strict: true })
  openComposer()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Choose categories' })).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Choose categories' }))
  await screen.findByText('Technology')
  await act(async () => old.resolve({ data: [{ id: 'old', topic: 'Old topic' }] }))
  expect(screen.getByText('Technology')).toBeVisible()
  expect(screen.queryByText('Old topic')).not.toBeInTheDocument()
})

it('keeps newer location suggestions when an older request resolves later', async () => {
  const old = deferred()
  getThreadLocations.mockImplementation((query) =>
    query === 'Old'
      ? old.promise
      : Promise.resolve({ data: [{ _id: 'new', city: 'New City', country: 'India' }] }),
  )
  setup()
  openComposer()
  queryLocation('Old')
  await waitFor(() => expect(getThreadLocations).toHaveBeenCalledWith('Old'))
  queryLocation('New')
  await screen.findByRole('button', { name: /New City/ })
  await act(async () => old.resolve({ data: [{ _id: 'old', city: 'Old City', country: 'India' }] }))
  expect(screen.getByRole('button', { name: /New City/ })).toBeVisible()
  expect(screen.queryByText('Old City')).not.toBeInTheDocument()
})

it('clears suggestions on a blank query and ignores its outstanding response', async () => {
  const pending = deferred()
  getThreadLocations.mockReturnValueOnce(pending.promise)
  setup()
  openComposer()
  queryLocation('Mumbai')
  await waitFor(() => expect(getThreadLocations).toHaveBeenCalledTimes(1))
  queryLocation('   ')
  await act(async () => pending.resolve({ data: [{ _id: 'm', city: 'Mumbai', country: 'India' }] }))
  expect(screen.queryByRole('button', { name: /Mumbai/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Retry locations' })).not.toBeInTheDocument()
})

it('handles a location failure and retries the current query while preserving draft and topics', async () => {
  getThreadLocations
    .mockRejectedValueOnce(new Error('private location failure'))
    .mockResolvedValue({ data: [{ _id: 'm', city: 'Mumbai', country: 'India' }] })
  const { container } = setup()
  openComposer()
  const composer = within(container.querySelector('.knkt-thread-composer'))
  await waitFor(() =>
    expect(composer.getByRole('button', { name: 'Choose categories' })).toBeEnabled(),
  )
  fireEvent.click(composer.getByRole('button', { name: 'Choose categories' }))
  fireEvent.click(await composer.findByRole('button', { name: 'Technology' }))
  queryLocation(' Mumbai ')
  fireEvent.click(await screen.findByRole('button', { name: 'Retry locations' }))
  await screen.findByRole('button', { name: /Mumbai/ })
  expect(screen.getByLabelText('Location')).toHaveValue(' Mumbai ')
  expect(screen.getByLabelText('Title')).toHaveValue('Keep title')
  expect(screen.getByRole('button', { name: 'Remove Technology' })).toBeVisible()
  expect(getThreadLocations).toHaveBeenLastCalledWith('Mumbai')
  expect(screen.queryByText('private location failure')).not.toBeInTheDocument()
})

it('ignores an old location failure after newer suggestions succeed', async () => {
  const old = deferred()
  getThreadLocations
    .mockReturnValueOnce(old.promise)
    .mockResolvedValue({ data: [{ _id: 'new', city: 'New City', country: 'India' }] })
  setup()
  openComposer()
  queryLocation('Old')
  await waitFor(() => expect(getThreadLocations).toHaveBeenCalledTimes(1))
  queryLocation('New')
  await screen.findByRole('button', { name: /New City/ })
  await act(async () => old.reject(new Error('stale failure')))
  expect(screen.getByRole('button', { name: /New City/ })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Retry locations' })).not.toBeInTheDocument()
})

it('consumes pending failures after unmount', async () => {
  const topicRequest = deferred()
  const locationRequest = deferred()
  getTopics.mockReturnValueOnce(topicRequest.promise)
  getThreadLocations.mockReturnValueOnce(locationRequest.promise)
  const view = setup()
  openComposer()
  queryLocation('Mumbai')
  await waitFor(() => expect(getThreadLocations).toHaveBeenCalledTimes(1))
  view.unmount()
  await act(async () => {
    topicRequest.reject(new Error('late topics'))
    locationRequest.reject(new Error('late locations'))
  })
})

it('clears already visible location suggestions immediately when the input becomes blank', async () => {
  getThreadLocations.mockResolvedValue({
    data: [{ _id: 'm', city: 'Mumbai', country: 'India' }],
  })
  setup()
  openComposer()
  queryLocation('Mumbai')
  const shimmer = screen.getByRole('status', { name: 'Loading locations…' })
  expect(shimmer).toHaveClass('loading-skeleton-field')
  expect(shimmer.querySelectorAll('.loading-skeleton-item')).toHaveLength(2)
  await screen.findByRole('button', { name: /Mumbai/ })
  queryLocation('')
  expect(screen.queryByRole('button', { name: /Mumbai/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('status', { name: 'Loading locations…' })).not.toBeInTheDocument()
})

it('distinguishes a successful empty catalog from a failed request', async () => {
  getTopics.mockResolvedValue({ data: [] })
  setup()
  openComposer()
  expect(await screen.findByText('No categories available.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Retry categories' })).not.toBeInTheDocument()
})

async function fillThread() {
  openComposer()
  queryLocation('Mumbai')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Choose categories' })).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Choose categories' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Technology' }))
}

it('uses deduplicated popular results independently of the composer catalog', async () => {
  getPopularTopics.mockResolvedValue({
    data: [
      { _id: 'popular', topic: 'Ranked topic' },
      { id: 'popular', topic: 'Ranked topic' },
    ],
  })
  setup()
  expect(await screen.findAllByText('Ranked topic')).toHaveLength(1)
  expect(screen.queryByText('Technology')).not.toBeInTheDocument()
  await fillThread()
  expect(screen.getByRole('button', { name: 'Remove Technology' })).toBeVisible()
})

it('retries popular topics without refetching the composer catalog', async () => {
  getPopularTopics.mockRejectedValueOnce(new Error('private error'))
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry popular topics' }))
  await screen.findByText('Popular choice')
  expect(getPopularTopics).toHaveBeenCalledTimes(2)
  expect(getTopics).toHaveBeenCalledTimes(1)
})

it('preserves a failed create draft and prevents duplicate submissions during retry', async () => {
  createThread.mockRejectedValueOnce(new Error('private create failure'))
  setup()
  await fillThread()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await screen.findByText(/Unable to create thread/)
  expect(screen.getByLabelText('Title')).toHaveValue('Keep title')
  expect(screen.getByRole('button', { name: 'Remove Technology' })).toBeVisible()
  const retry = deferred()
  createThread.mockReturnValueOnce(retry.promise)
  const form = screen.getByRole('button', { name: 'Create Thread' }).closest('form')
  fireEvent.submit(form)
  fireEvent.submit(form)
  await waitFor(() => expect(createThread).toHaveBeenCalledTimes(2))
  await act(async () => retry.resolve({ data: { id: 'created' } }))
  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  expect(screen.queryByText('private create failure')).not.toBeInTheDocument()
})

it('keeps successful create distinct from refresh failure and retries only the feed read', async () => {
  const refresh = deferred()
  getThreads
    .mockResolvedValueOnce({ data: [{ id: 'old', title: 'Existing thread' }] })
    .mockReturnValueOnce(refresh.promise)
    .mockResolvedValue({ data: [{ id: 'created', title: 'Created thread' }] })
  setup()
  await screen.findByText('Existing thread')
  await fillThread()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await screen.findByRole('status', { name: 'Refreshing threads…' })
  expect(screen.getByText('Existing thread')).toBeVisible()
  await act(async () => refresh.reject(new Error('refresh failed')))
  await screen.findByText(/Thread posted, but the feed could not refresh/)
  expect(screen.getByText('Existing thread')).toBeVisible()
  expect(screen.queryByText(/Unable to create thread/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
  await screen.findByText('Created thread')
  expect(createThread).toHaveBeenCalledTimes(1)
})

it('ignores a create-refresh response after the user changes the thread filter', async () => {
  const refresh = deferred()
  getThreads
    .mockResolvedValueOnce({ data: [] })
    .mockReturnValueOnce(refresh.promise)
    .mockResolvedValue({ data: [{ id: 'latest', title: 'Latest result' }] })
  setup()
  await fillThread()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await waitFor(() => expect(getThreads).toHaveBeenCalledTimes(2))
  fireEvent.click(screen.getByRole('button', { name: 'Filter threads' }))
  fireEvent.click(screen.getByRole('button', { name: 'Latest Threads' }))
  await screen.findByText('Latest result')
  await act(async () => refresh.resolve({ data: [{ id: 'old', title: 'Stale result' }] }))
  expect(screen.getByText('Latest result')).toBeVisible()
  expect(screen.queryByText('Stale result')).not.toBeInTheDocument()
})

it('retains location results while paging and retries the failed page without duplicates', async () => {
  const first = Array.from({ length: 10 }, (_, index) => ({
    _id: `city${index}`,
    city: `City ${index}`,
    country: 'India',
  }))
  getThreadLocations
    .mockResolvedValueOnce({ data: first })
    .mockRejectedValueOnce(new Error('page failure'))
    .mockResolvedValue({ data: [first[9], { _id: 'last', city: 'Last City', country: 'India' }] })
  setup()
  openComposer()
  queryLocation('City')
  const failedObserver = await reachLocationEnd()
  await screen.findByRole('button', { name: 'Retry locations' })
  act(() => failedObserver.callback([{ isIntersecting: true }]))
  expect(getThreadLocations).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: /City 0/ })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Retry locations' }))
  await screen.findByRole('button', { name: /Last City/ })
  expect(screen.getAllByRole('button', { name: /City 9/ })).toHaveLength(1)
  expect(getThreadLocations).toHaveBeenNthCalledWith(2, 'City', 1, 10)
  expect(getThreadLocations).toHaveBeenNthCalledWith(3, 'City', 1, 10)
  expect(screen.queryByRole('button', { name: 'Load more locations' })).not.toBeInTheDocument()
})

it('discards an old location page after the query changes', async () => {
  const page = deferred()
  getThreadLocations
    .mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, index) => ({
        _id: `old${index}`,
        city: `Old ${index}`,
      })),
    })
    .mockReturnValueOnce(page.promise)
    .mockResolvedValue({ data: [{ _id: 'new', city: 'New City' }] })
  setup()
  openComposer()
  queryLocation('Old')
  await reachLocationEnd()
  queryLocation('New')
  await screen.findByRole('button', { name: /New City/ })
  await act(async () => page.resolve({ data: [{ _id: 'stale', city: 'Stale City' }] }))
  expect(screen.queryByText('Stale City')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /New City/ })).toBeVisible()
})

function signIn(token) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: { id: token } }))
}

it.each(['account switch', 'unmount'])(
  'does not create from an uploaded old draft after %s',
  async (reason) => {
    signIn('account-a')
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL() {
          return 'blob:photo'
        }
        static revokeObjectURL() {}
      },
    )
    const upload = deferred()
    uploadFile.mockReturnValueOnce(upload.promise)
    const view = setup()
    await fillThread()
    const file = new File(['photo'], 'photo.png', { type: 'image/png' })
    fireEvent.change(view.container.querySelector('input[accept="image/*"]'), {
      target: { files: [file] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(1))
    if (reason === 'account switch') signIn('account-b')
    else view.unmount()
    await act(async () => upload.resolve('https://example.com/photo.png'))
    expect(createThread).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(getThreads).toHaveBeenCalledTimes(1)
  },
)

it('ignores create completion after the session changes', async () => {
  signIn('account-a')
  const create = deferred()
  createThread.mockReturnValueOnce(create.promise)
  setup()
  await fillThread()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await waitFor(() => expect(createThread).toHaveBeenCalledTimes(1))
  signIn('account-b')
  await act(async () => create.resolve({ data: { id: 'created' } }))
  expect(toast.success).not.toHaveBeenCalled()
  expect(getThreads).toHaveBeenCalledTimes(1)
})

it('releases obsolete pagination on create refresh without letting its finally unlock a newer page', async () => {
  const oldPage = deferred()
  const refresh = deferred()
  const newPage = deferred()
  const rows = (prefix) =>
    Array.from({ length: 10 }, (_, index) => ({
      id: `${prefix}${index}`,
      title: `${prefix} ${index}`,
    }))
  getThreads
    .mockResolvedValueOnce({ data: rows('Original') })
    .mockReturnValueOnce(oldPage.promise)
    .mockReturnValueOnce(refresh.promise)
    .mockReturnValueOnce(newPage.promise)
  setup()
  await screen.findByText('Original 0')
  act(() => observers.at(-1).callback([{ isIntersecting: true }]))
  await waitFor(() => expect(getThreads).toHaveBeenCalledTimes(2))
  await fillThread()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await waitFor(() => expect(getThreads).toHaveBeenCalledTimes(3))
  await act(async () => refresh.resolve({ data: rows('Refreshed') }))
  act(() => observers.at(-1).callback([{ isIntersecting: true }]))
  await waitFor(() => expect(getThreads).toHaveBeenCalledTimes(4))
  await act(async () => oldPage.resolve({ data: [{ id: 'old', title: 'Obsolete page' }] }))
  expect(screen.getByLabelText('Loading more threads')).toBeInTheDocument()
  act(() => observers.at(-1).callback([{ isIntersecting: true }]))
  expect(getThreads).toHaveBeenCalledTimes(4)
  expect(screen.queryByText('Obsolete page')).not.toBeInTheDocument()
  await act(async () => newPage.resolve({ data: [{ id: 'new', title: 'Current page' }] }))
  await screen.findByText('Current page')
  expect(screen.queryByLabelText('Loading more threads')).not.toBeInTheDocument()
})

it('ignores an initial read failure superseded by successful create refresh', async () => {
  const initial = deferred()
  getThreads
    .mockReturnValueOnce(initial.promise)
    .mockResolvedValue({ data: [{ id: 'new', title: 'Fresh feed' }] })
  setup()
  await fillThread()
  fireEvent.click(screen.getByRole('button', { name: 'Create Thread' }))
  await screen.findByText('Fresh feed')
  await act(async () => initial.reject(new Error('obsolete initial failure')))
  expect(screen.getByText('Fresh feed')).toBeVisible()
  expect(screen.queryByText(/Unable to load thread/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Retry', exact: true })).not.toBeInTheDocument()
})
