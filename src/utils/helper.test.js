import { expect, it, vi } from 'vitest'
import { getRequestAllowFailure, postRequest } from './helper'

function respond(status, body) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  )
}

it.each([400, 401, 403, 429, 500])(
  'rejects HTTP %s even when business failure is allowed',
  async (status) => {
    respond(status, { status: false, message: 'Request rejected', data: [] })
    await expect(getRequestAllowFailure('sso', {})).rejects.toThrow()
  },
)

it('permits a successful HTTP response for incomplete social signup', async () => {
  const body = { status: false, data: { id: 'partial-user', isEmailVerified: false } }
  respond(200, body)
  await expect(getRequestAllowFailure('sso', {})).resolves.toEqual(body)
})

it('preserves normal login success and business-error rejection', async () => {
  const body = { status: true, data: { id: 'user', token: 'synthetic-token' } }
  respond(200, body)
  await expect(
    postRequest('login', { email: 'member@example.com', password: 'synthetic' }),
  ).resolves.toEqual(body)
  respond(200, { status: false, message: 'Invalid email or password' })
  await expect(postRequest('login', {})).rejects.toThrow('Invalid email or password')
})

it('clears the matching session on unauthorized responses', async () => {
  localStorage.setItem('socialknkt_auth', JSON.stringify({ token: 'synthetic-token' }))
  respond(401, { status: false })
  await expect(getRequestAllowFailure('sso', {})).rejects.toThrow()
  expect(localStorage.getItem('socialknkt_auth')).toBeNull()
})

it('rejects HTTP failure even when the response body claims success', async () => {
  respond(500, { status: true })
  await expect(getRequestAllowFailure('sso', {})).rejects.toThrow(
    'Unable to complete this request. Please try again.',
  )
})

it('does not clear a newer session when an old request returns unauthorized', async () => {
  localStorage.setItem('socialknkt_auth', JSON.stringify({ token: 'old-token' }))
  let finish
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    ),
  )
  const pending = getRequestAllowFailure('sso', {})
  localStorage.setItem('socialknkt_auth', JSON.stringify({ token: 'new-token' }))
  finish({ ok: false, status: 401, json: async () => ({ status: false }) })
  await expect(pending).rejects.toThrow()
  expect(JSON.parse(localStorage.getItem('socialknkt_auth')).token).toBe('new-token')
})
