import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AskShareModal } from './AskShareModal'
import { createThread, getThreadLocations, getTopics } from '../../../action/action'

vi.mock('../../../action/action', () => ({
  createThread: vi.fn(),
  getThreadLocations: vi.fn(),
  getTopics: vi.fn(),
}))
vi.mock('../../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { fullName: 'Test Author' } }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  getTopics.mockResolvedValue({ data: [{ _id: 'topic-1', topic: 'Technology' }] })
  getThreadLocations.mockResolvedValue({ data: [] })
  createThread.mockResolvedValue({ data: {} })
})

async function fillQuestion() {
  fireEvent.change(screen.getByLabelText('Question'), {
    target: { value: ' How does this work? ' },
  })
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: ' Mumbai, India ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Categories' }))
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Technology' }))
}

it('validates required fields and submits trimmed question text, location and topic IDs once', async () => {
  let finish
  createThread.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const onClose = vi.fn()
  const onCreated = vi.fn()
  render(<AskShareModal onClose={onClose} onCreated={onCreated} />)
  expect(screen.getByText('Test Author')).toBeVisible()
  fireEvent.submit(screen.getByRole('form'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a question')
  expect(createThread).not.toHaveBeenCalled()
  await fillQuestion()
  fireEvent.submit(screen.getByRole('form'))
  fireEvent.submit(screen.getByRole('form'))
  expect(createThread).toHaveBeenCalledExactlyOnceWith({
    type: 1,
    question: 'How does this work?',
    location: 'Mumbai, India',
    topic: ['topic-1'],
  })
  expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()
  expect(onCreated).not.toHaveBeenCalled()
  await act(async () => finish({ data: {} }))
  expect(onCreated).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('preserves the draft after failure and notifies the owner only after a successful retry', async () => {
  createThread.mockRejectedValueOnce(new Error('private failure'))
  const onCreated = vi.fn()
  const onClose = vi.fn()
  render(<AskShareModal onClose={onClose} onCreated={onCreated} />)
  await fillQuestion()
  fireEvent.submit(screen.getByRole('form'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to post your question')
  expect(screen.getByLabelText('Question')).toHaveValue(' How does this work? ')
  expect(onCreated).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.submit(screen.getByRole('form'))
  await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
})

it('retries the topic catalog and limits selection to five IDs', async () => {
  getTopics.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
    data: Array.from({ length: 6 }, (_, index) => ({
      id: `t${index}`,
      title: `Topic ${index}`,
    })),
  })
  render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Categories' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Retry categories' }))
  await screen.findByRole('checkbox', { name: 'Topic 0' })
  for (let index = 0; index < 5; index++) {
    fireEvent.click(screen.getByRole('checkbox', { name: `Topic ${index}` }))
  }
  expect(screen.getByRole('checkbox', { name: 'Topic 5' })).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Topic 0' }))
  expect(screen.getByRole('checkbox', { name: 'Topic 5' })).toBeEnabled()
})

it('shows an empty catalog without inventing categories', async () => {
  getTopics.mockResolvedValue({ data: [] })
  render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Categories' }))
  expect(await screen.findByText('No categories available.')).toBeVisible()
})

it('ignores a stale location response after the query changes', async () => {
  let finishOld
  getThreadLocations.mockImplementation((query) => {
    if (query === 'Old') {
      return new Promise((resolve) => {
        finishOld = resolve
      })
    }
    return Promise.resolve({ data: [{ _id: 'new', city: 'New City', country: 'India' }] })
  })
  const { container } = render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Old' } })
  await waitFor(() => expect(getThreadLocations).toHaveBeenCalledWith('Old'))
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'New' } })
  await waitFor(() => expect(container.querySelector('option')?.value).toBe('New City, India'))
  await act(async () => finishOld({ data: [{ _id: 'old', city: 'Old City' }] }))
  expect(container.querySelector('option').value).toBe('New City, India')
  expect(container.querySelectorAll('option')).toHaveLength(1)
})
