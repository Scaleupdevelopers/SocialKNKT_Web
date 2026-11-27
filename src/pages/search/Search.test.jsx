import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { Search } from './Search'
import { searchContent } from '../../action/action'
vi.mock('../../layouts/Header', () => ({ Header: () => null }))
vi.mock('../home/components/PostCard', () => ({
  PostCard: ({ post }) => <p>{post.description}</p>,
}))
vi.mock('../../components/modals/ConnectionManager', () => ({
  ConnectionManager: ({ userId }) => <div role="dialog">Connection for {userId}</div>,
}))
vi.mock('../../action/action', () => ({ searchContent: vi.fn(), SEARCH_PAGE_SIZE: 10 }))
beforeEach(() => vi.clearAllMocks())
function Navigation() {
  const navigate = useNavigate()
  return <button onClick={() => navigate('/search?q=new&type=people')}>New query</button>
}
it('submits an editable query and replaces results', async () => {
  searchContent.mockImplementation((kind, query) =>
    Promise.resolve({ data: [{ id: query, fname: `Result ${query}` }] }),
  )
  render(
    <MemoryRouter initialEntries={['/search?q=old&type=people']}>
      <Search />
    </MemoryRouter>,
  )
  await screen.findByText('Result old')
  fireEvent.change(screen.getByLabelText('Search people, posts and threads'), {
    target: { value: ' new query ' },
  })
  fireEvent.submit(screen.getByRole('search'))
  await screen.findByText('Result new query')
  expect(screen.queryByText('Result old')).toBeNull()
  expect(searchContent).toHaveBeenLastCalledWith('people', 'new query', 0)
  fireEvent.click(screen.getByText('Connect'))
  expect(screen.getByRole('dialog').textContent).toBe('Connection for new query')
})
it('ignores an old query response after navigation', async () => {
  let resolveOld
  searchContent.mockImplementation((kind, query) =>
    query === 'old'
      ? new Promise((resolve) => {
          resolveOld = resolve
        })
      : Promise.resolve({ data: [{ id: 'new', fname: 'New person' }] }),
  )
  render(
    <MemoryRouter initialEntries={['/search?q=old&type=people']}>
      <Navigation />
      <Search />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('New query'))
  await screen.findByText('New person')
  await act(async () => resolveOld({ data: [{ id: 'old', fname: 'Old person' }] }))
  expect(screen.queryByText('Old person')).toBeNull()
})
it('retries the same failed page and keeps existing results', async () => {
  searchContent
    .mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, i) => ({ id: String(i), fname: `Person ${i}` })),
    })
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce({ data: [{ id: '10', fname: 'Last person' }] })
  render(
    <MemoryRouter initialEntries={['/search?q=person&type=people']}>
      <Search />
    </MemoryRouter>,
  )
  fireEvent.click(await screen.findByText('Load more'))
  fireEvent.click(await screen.findByText('Retry'))
  await screen.findByText('Last person')
  expect(screen.getByText('Person 0')).toBeTruthy()
  await waitFor(() => expect(searchContent).toHaveBeenLastCalledWith('people', 'person', 1))
})
