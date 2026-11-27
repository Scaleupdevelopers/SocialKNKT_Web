import { beforeEach, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  answerConnection,
  getIncomingConnection,
  removeConnection,
  sendConnection,
} from '../src/action/action'
import { pendingConnection } from '../src/utils/helper'
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: true }) }),
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

it.each(['_id', 'id'])('prioritizes an incoming %s over an accepted relationship', (idField) => {
  expect(
    pendingConnection(
      { personalConnection: 'accepted', connectionId: 'accepted' },
      { [idField]: 'incoming' },
    ),
  ).toEqual({ id: 'incoming', outgoing: false })
})

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
    return /\b(fetch|getRequest|postRequest|putRequest|deleteRequest|PatchRequest)\s*\(/.test(code)
  })
  expect(violations).toEqual([])
})
