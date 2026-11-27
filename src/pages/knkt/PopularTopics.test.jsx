import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { PopularTopics } from './PopularTopics'
import { getPopularTopics, getTopics } from '../../action/action'

vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../action/action', () => ({ getPopularTopics: vi.fn(), getTopics: vi.fn() }))

function Destination() {
  return <p>{useLocation().search}</p>
}

function setup() {
  return render(
    <MemoryRouter initialEntries={['/knkt/topics']}>
      <Routes>
        <Route path="/knkt/topics" element={<PopularTopics />} />
        <Route path="/knkt" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  getPopularTopics.mockResolvedValue({ data: [] })
})

it('uses the ranked endpoint, deduplicates mixed IDs and navigates to the selected topic', async () => {
  getPopularTopics.mockResolvedValue({
    data: [
      { _id: 'ranked', topic: 'Ranked topic' },
      { id: 'ranked', topic: 'Ranked topic' },
    ],
  })
  setup()
  expect(await screen.findAllByText('Ranked topic')).toHaveLength(1)
  fireEvent.click(screen.getByText('Ranked topic'))
  expect(await screen.findByText('?topicId=ranked')).toBeVisible()
  expect(getTopics).not.toHaveBeenCalled()
})

it('offers retry after failure and displays the successful empty state', async () => {
  getPopularTopics.mockRejectedValueOnce(new Error('private error'))
  const { container } = setup()
  expect(container.querySelector('.popular-topic-skeleton')).toBeInTheDocument()
  fireEvent.click(await screen.findByRole('button', { name: 'Retry popular topics' }))
  expect(await screen.findByText('No popular topics available.')).toBeVisible()
  expect(getPopularTopics).toHaveBeenCalledTimes(2)
})

it('consumes a failure after route unmount', async () => {
  let fail
  getPopularTopics.mockReturnValueOnce(
    new Promise((resolve, reject) => {
      fail = reject
    }),
  )
  const view = setup()
  view.unmount()
  await act(async () => fail(new Error('late failure')))
})
