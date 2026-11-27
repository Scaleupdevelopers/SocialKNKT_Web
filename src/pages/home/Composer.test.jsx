import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Header } from '../../layouts/Header'
import { CreatePost } from './Home'
import { Knkt } from '../knkt/Knkt'
import {
  createPost,
  createThread,
  getThreads,
  getTopics,
  uploadFile,
} from '../../action/action'

vi.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { fullName: 'Test Author' } }),
}))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  createPost: vi.fn(),
  createThread: vi.fn(),
  uploadFile: vi.fn(),
  getThreads: vi.fn(),
  getTopics: vi.fn().mockResolvedValue({ data: [{ _id: 'topic-1', topic: 'Technology' }] }),
  getThreadLocations: vi.fn().mockResolvedValue({ data: [] }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Stop after the observable write payload; successful post reload is existing behavior.
  createPost.mockRejectedValue(new Error('Controlled write failure'))
  createThread.mockResolvedValue({ data: {} })
  uploadFile.mockResolvedValue('uploaded.mp4')
  getThreads.mockResolvedValue({ data: [] })
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
