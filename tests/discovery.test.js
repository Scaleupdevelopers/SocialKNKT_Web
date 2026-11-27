import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRequest, putRequest, mergeResults, postLink } from '../src/utils/helper'
import { mergeItems, mergeMessages } from '../src/pages/chat/chatModel'
import {
  getPost,
  getThread,
  getSavedPosts,
  recordPostShare,
  searchContent,
} from '../src/action/action'

vi.mock('../src/utils/helper', async (original) => ({
  ...(await original()),
  getRequest: vi.fn(),
  putRequest: vi.fn(),
}))
const id = '0123456789abcdef01234567'
beforeEach(() => vi.clearAllMocks())
describe('discovery API contracts', () => {
  it('preserves chat ID normalization, filtering and chronological order', () => {
    const current = [{ id: 1, _id: 'other', createdAt: 2 }, { createdAt: 0 }]
    const updated = { id: '1', createdAt: 3 }
    const earlier = { _id: '2', createdAt: 1 }
    expect(mergeItems(current, [updated, earlier, {}])).toEqual([updated, earlier])
    expect(mergeMessages(current, [updated, earlier])).toEqual([earlier, updated])
  })
  it('uses people, media posts and dedicated thread search contracts', async () => {
    await searchContent('people', ' A&B ', 2)
    expect(getRequest).toHaveBeenLastCalledWith('user/search', {
      q: 'A&B',
      type: 'people',
      media: false,
      page: 2,
      limit: 10,
    })
    await searchContent('people', 'C++')
    expect(getRequest).toHaveBeenLastCalledWith('user/search', {
      q: 'C++',
      type: 'people',
      media: false,
      page: 0,
      limit: 10,
    })
    await searchContent('posts', 'C++')
    expect(getRequest).toHaveBeenLastCalledWith('user/search', {
      q: 'C\\+\\+',
      type: 'feeds',
      media: true,
      page: 0,
      limit: 10,
    })
    await searchContent('threads', 'hello', 1)
    expect(getRequest).toHaveBeenLastCalledWith('user/threads/search', {
      q: 'hello',
      page: 1,
      limit: 10,
    })
  })
  it('does not search empty queries or request malformed deep links', async () => {
    expect(await searchContent('people', ' ')).toEqual({ data: [] })
    await expect(getPost('../src/saved')).rejects.toThrow('Invalid link')
    expect(getRequest).not.toHaveBeenCalled()
  })
  it('resolves both entity endpoints and rejects missing/deleted records', async () => {
    getRequest.mockResolvedValue({ data: { id } })
    await getPost(id)
    expect(getRequest).toHaveBeenLastCalledWith(`user/post/${id}`)
    await getThread(id)
    expect(getRequest).toHaveBeenLastCalledWith(`user/thread/${id}`)
    getRequest.mockResolvedValue({ data: { id, deletedAt: 123 } })
    await expect(getPost(id)).rejects.toThrow('unavailable')
  })
  it('records shares with explicit true and pages saved records', async () => {
    await recordPostShare(id)
    expect(putRequest).toHaveBeenCalledWith('user/post/share', { postId: id, shareStatus: true })
    await getSavedPosts(2)
    expect(getRequest).toHaveBeenCalledWith('user/post/get-saved-posts', { page: 2, limit: 10 })
    expect(new URL(postLink(id)).searchParams.get('postId')).toBe(id)
  })
  it('deduplicates overlapping pages', () => {
    expect(mergeResults([{ id: '1' }], [{ _id: '1' }, { id: '2' }])).toEqual([
      { _id: '1' },
      { id: '2' },
    ])
  })
})
