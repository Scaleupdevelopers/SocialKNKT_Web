import { beforeEach, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  answerConnection,
  getConnectedProfileContent,
  getIncomingConnection,
  removeConnection,
  sendConnection,
  recordPostViews,
  reportUser,
  getOtherUserFlicks,
} from '../src/action/action'
import { pendingConnection } from '../src/utils/helper'
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: true }) }),
  )
})
it('lets the backend select other-profile flicks for the current connection', async () => {
  await getOtherUserFlicks('user-a', 2, 5)
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/v1/user/flick/get-all-other-user-flick',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 'user-a', page: 2, limit: 5, postType: 0 }),
    }),
  )
})
it('uses the verified view and user-report contracts', async () => {
  await recordPostViews(['post-a', 'post-a', 'post-b'])
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/v1/user/post/view',
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ postIds: ['post-a', 'post-b'], viewStatus: true }),
    }),
  )
  await reportUser('user-a', 'Reason')
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/v1/user/chat/report',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ userId: 'user-a', description: 'Reason' }),
    }),
  )
})
it('sends backend connection payloads through shared authenticated helper', async () => {
  localStorage.setItem('socialknkt_auth', JSON.stringify({ token: 'test-token' }))
  await sendConnection('user-2', 'professional')
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/v1/user/connection-request',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      body: JSON.stringify({ connectUserId: 'user-2', connectionType: 'professional' }),
    }),
  )
  await answerConnection('rel-2', 3)
  expect(fetch).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ connectionId: 'rel-2', status: 3 }),
    }),
  )
  await removeConnection('rel-2', 'personal')
  expect(fetch).toHaveBeenLastCalledWith(
    expect.any(String),
    expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ connectionId: 'rel-2', connectionType: 'personal' }),
    }),
  )
})

it.each(['_id', 'id'])(
  'prioritizes an incoming %s over an accepted relationship',
  (idField) => {
    expect(
      pendingConnection(
        { personalConnection: 'accepted', connectionId: 'accepted' },
        { [idField]: 'incoming' },
      ),
    ).toEqual({ id: 'incoming', outgoing: false })
  },
)

it('distinguishes outgoing requests from either accepted relationship id', () => {
  const profile = { personalConnection: 'personal', professionalConnection: 'professional' }
  expect(pendingConnection({ ...profile, connectionId: 'outgoing' }, null)).toEqual({
    id: 'outgoing',
    outgoing: true,
  })
  expect(pendingConnection({ ...profile, connectionId: 'personal' }, null)).toBeNull()
  expect(pendingConnection({ ...profile, connectionId: 'professional' }, null)).toBeNull()
})

it('finds incoming requests beyond the first page using the requester userId', async () => {
  const firstPage = Array.from({ length: 10 }, (_, index) => ({
    _id: `request-${index}`,
    userId: `other-${index}`,
  }))
  const incoming = { _id: 'pending-incoming', userId: 'alex' }
  fetch
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: true, data: firstPage }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: true, data: [incoming] }),
    })
  expect(await getIncomingConnection('alex')).toEqual(incoming)
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    '/api/v1/user/connection-request?page=0&limit=10',
    expect.objectContaining({ method: 'GET' }),
  )
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    '/api/v1/user/connection-request?page=1&limit=10',
    expect.objectContaining({ method: 'GET' }),
  )
})

it('keeps API modules in the existing action.js file', () => {
  const directory = resolve('src/action')
  expect(readdirSync(directory).filter((name) => name.endsWith('.js'))).toEqual(['action.js'])
})

it('keeps HTTP calls out of UI components and hooks', () => {
  const source = resolve('src')
  const files = readdirSync(source, { recursive: true })
  const violations = files.filter((name) => {
    if (!/\.(js|jsx)$/.test(name) || name.includes('.test.')) return false
    if (name === 'action/action.js' || name === 'utils/helper.js') return false
    const code = readFileSync(`${source}/${name}`, 'utf8')
    return /\b(fetch|getRequest|postRequest|putRequest|deleteRequest|PatchRequest)\s*\(/.test(
      code,
    )
  })
  expect(violations).toEqual([])
})

it('reads connected audiences with the mobile GET query, deduplicates shared posts and sorts newest first', async () => {
  const shared = { _id: 'shared', postType: 3, mediaType: 'text', createdAt: 200 }
  fetch
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: true, data: [shared, { id: 'old', createdAt: 100 }] }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: [{ ...shared, id: 'shared' }, { id: 'new', createdAt: 300 }],
      }),
    })
  const result = await getConnectedProfileContent('user-a', 2, [1, 2])
  expect(fetch).toHaveBeenCalledTimes(2)
  for (const [index, audience] of [1, 2].entries()) {
    expect(fetch).toHaveBeenNthCalledWith(
      index + 1,
      `/api/v1/user/profile/posts?userId=user-a&page=2&media=false&postType=${audience}`,
      expect.objectContaining({ method: 'GET' }),
    )
  }
  expect(result.data.map((item) => item.id || item._id)).toEqual(['new', 'shared', 'old'])
  expect(result.hasMore).toBe(false)
})

it.each([
  ['feed', ['image', 'video']],
  ['flicks', ['flick']],
])('filters %s but retains pagination from the raw ten-item page', async (kind, expected) => {
  const types = ['image', 'video', 'flick', 'document', 'text', 'text', 'text', 'text', 'text', 'text']
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      data: types.map((mediaType, index) => ({ id: String(index), mediaType, createdAt: 10 - index })),
    }),
  })
  const result = await getConnectedProfileContent('user-a', 0, [1], kind)
  expect(result.data.map((item) => item.mediaType)).toEqual(expected)
  expect(result.hasMore).toBe(true)
})

it('makes no connected-profile requests without an accepted audience', async () => {
  expect(await getConnectedProfileContent('user-a', 0, [])).toEqual({ data: [], hasMore: false })
  expect(fetch).not.toHaveBeenCalled()
})
