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

it('shows an accessible field shimmer while categories load', async () => {
  let finish
  getTopics.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Categories' }))
  expect(screen.getByRole('status', { name: 'Loading categories…' })).toHaveClass(
    'loading-skeleton-field',
  )
  await waitFor(() => expect(finish).toBeTypeOf('function'))
  await act(async () => finish({ data: [{ id: 'topic', title: 'Technology' }] }))
  expect(screen.queryByRole('status', { name: 'Loading categories…' })).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Technology' })).toBeEnabled()
})

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
  render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Old' } })
  await waitFor(() => expect(getThreadLocations).toHaveBeenCalledWith('Old', 0, 10))
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'New' } })
  await waitFor(() => expect(screen.getByRole('option')).toHaveTextContent('New City'))
  await act(async () => finishOld({ data: [{ _id: 'old', city: 'Old City' }] }))
  expect(screen.getByRole('option')).toHaveTextContent('New City')
  expect(screen.getAllByRole('option')).toHaveLength(1)
})

it('selects a city and country without reopening or requerying the selected value', async () => {
  getThreadLocations.mockResolvedValue({
    data: [{ _id: 'city', city: 'Mumbai', country: 'India' }],
  })
  render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Mum' } })
  expect(screen.getByRole('status', { name: 'Loading locations…' })).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('option', { name: 'Mumbai, India' }))
  expect(screen.getByLabelText('Location')).toHaveValue('Mumbai, India')
  expect(screen.getByLabelText('Location')).toHaveFocus()
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
  })
  expect(getThreadLocations).toHaveBeenCalledExactlyOnceWith('Mum', 0, 10)
})

it('keeps location suggestions and retries a failed next page without duplicate items', async () => {
  const observers = new Set()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback
      }
      observe(target) {
        this.target = target
        observers.add(this)
      }
      disconnect() {
        observers.delete(this)
      }
    },
  )
  const first = Array.from({ length: 10 }, (_, i) => ({
    _id: `city-${i}`,
    city: `City ${i}`,
    country: 'India',
  }))
  getThreadLocations
    .mockResolvedValueOnce({ data: first })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      data: [first[0], { _id: 'last', city: 'Last city', country: 'India' }],
    })
  render(<AskShareModal onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'City' } })
  await screen.findByRole('option', { name: 'City 0, India' })
  await waitFor(() => expect(observers.size).toBe(1))
  await act(async () => {
    const observer = [...observers][0]
    observer.callback([{ isIntersecting: true }])
    observer.callback([{ isIntersecting: true }])
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Retry locations' }))
  await screen.findByRole('option', { name: 'Last city, India' })
  expect(screen.getAllByRole('option')).toHaveLength(11)
  expect(getThreadLocations.mock.calls).toEqual([
    ['City', 0, 10],
    ['City', 1, 10],
    ['City', 1, 10],
  ])
  vi.unstubAllGlobals()
})

it('removes a selected category chip without submitting the form', async () => {
  render(<AskShareModal onClose={vi.fn()} />)
  await fillQuestion()
  expect(screen.getByRole('checkbox', { name: 'Technology' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Remove Technology' }))
  expect(screen.getByRole('checkbox', { name: 'Technology' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  expect(screen.queryByRole('button', { name: 'Remove Technology' })).not.toBeInTheDocument()
  expect(createThread).not.toHaveBeenCalled()
})

it('dismisses the location dropdown with Escape without closing the question draft', async () => {
  const onClose = vi.fn()
  getThreadLocations.mockResolvedValue({
    data: [{ id: 'm', city: 'Mumbai', country: 'India' }],
  })
  render(<AskShareModal onClose={onClose} />)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Mum' } })
  const option = await screen.findByRole('option', { name: 'Mumbai, India' })
  option.focus()
  fireEvent.keyDown(option, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Location')).toHaveFocus()
  expect(onClose).not.toHaveBeenCalled()
})
