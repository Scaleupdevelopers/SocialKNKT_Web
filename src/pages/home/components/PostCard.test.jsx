import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PostCard } from './PostCard'
import { recordPostShare } from '../../../action/action'
vi.mock('../../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'viewer' } }),
}))
vi.mock('../../../action/action', async (original) => ({
  ...(await original()),
  recordPostShare: vi.fn().mockResolvedValue({}),
}))
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {} }))
const post = { id: '0123456789abcdef01234567', fname: 'Author', description: 'Test post' }
beforeEach(() => vi.clearAllMocks())
it('copies a resolvable URL, recording a successful share only once', async () => {
  const writeText = vi.fn().mockResolvedValue()
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  render(<PostCard post={post} />)
  fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getByText('Copy Link'))
  await waitFor(() => expect(recordPostShare).toHaveBeenCalledWith(post.id))
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/home?postId=${post.id}`)
  fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getByText('Copy Link'))
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
  expect(recordPostShare).toHaveBeenCalledTimes(1)
})
it('does not count cancelled native shares', async () => {
  vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue({ name: 'AbortError' }) })
  render(<PostCard post={post} />)
  fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Share', exact: true })[1])
  await waitFor(() => expect(navigator.share).toHaveBeenCalled())
  expect(recordPostShare).not.toHaveBeenCalled()
})
