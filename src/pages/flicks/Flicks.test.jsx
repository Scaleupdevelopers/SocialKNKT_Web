import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { Flicks } from './Flicks'
import { getFlicks, getSavedPosts } from '../../action/action'

vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../../context/ProfileContext', () => ({ useProfile: () => ({ profile: {} }) }))
vi.mock('../../action/action', async (original) => ({
  ...(await original()),
  getFlicks: vi.fn(),
  savePost: vi.fn(),
  deletePost: vi.fn(),
  updatePostLike: vi.fn(),
  getSavedPosts: vi.fn(),
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
