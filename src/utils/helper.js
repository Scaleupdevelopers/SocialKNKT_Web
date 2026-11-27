import config from './config'

const serverPath = config.API_URL
export const AUTH_STORAGE_KEY = 'socialknkt_auth'

// Unverified signup credentials stay in memory, never in URL/history or storage.
let pendingSignupSession = null
let signupVersion = 0
export const getPendingSignupVersion = () => signupVersion

export function rememberSignup(user, fallbackEmail = '') {
  signupVersion++
  pendingSignupSession = user?.token
    ? {
        token: user.token,
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          email: (user.email?.trim() || fallbackEmail).trim().toLowerCase(),
          image: user.image,
          bannerImage: user.banner_image,
        },
      }
    : null
}

export function consumeSignup(email) {
  const session = pendingSignupSession
  pendingSignupSession = null
  signupVersion++
  return session?.user.email === email ? session : null
}

export function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export const request = async (path, data, method, allowFailure = false) => {
  const loginData = readAuth()
  const headers = { 'Content-Type': 'application/json' }

  if (loginData?.token) {
    headers.Authorization = `Bearer ${loginData.token}`
  }

  const requestOptions = { method, headers }

  if (method === 'GET') {
    const query = new URLSearchParams(data || {}).toString()
    path = query ? `${path}?${query}` : path
  } else if (data !== undefined) {
    requestOptions.body = JSON.stringify(data)
  }

  let response
  try {
    response = await fetch(`${serverPath}/${path}`, requestOptions)
  } catch {
    throw new Error('Unable to connect. Check your connection and try again.')
  }

  const responseData = await response.json().catch(() => ({}))

  if (response.status === 401 && loginData?.token === readAuth()?.token) {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    window.dispatchEvent(new Event('auth-change'))
  }

  if ((!response.ok || responseData.status === false) && !allowFailure) {
    const message =
      response.status >= 500
        ? 'Unable to complete this request. Please try again.'
        : responseData.message || 'Unable to complete this request. Please try again.'
    throw new Error(message)
  }

  return responseData
}

export const postRequest = async (path, data) => request(path, data, 'POST')
export const putRequest = async (path, data) => request(path, data, 'PUT')
export const PatchRequest = async (path, data) => request(path, data, 'PATCH')
export const deleteRequest = async (path, data) => request(path, data, 'DELETE')
export const getRequest = async (path, data) => request(path, data, 'GET')
export const getRequestAllowFailure = async (path, data) => request(path, data, 'GET', true)

export const connectionsChanged = () => window.dispatchEvent(new Event('connections-change'))

export function pendingConnection(profile, incoming) {
  if (incoming) return { id: incoming._id || incoming.id, outgoing: false }
  const accepted = [profile.personalConnection, profile.professionalConnection].filter(Boolean)
  if (profile.connectionId && !accepted.includes(profile.connectionId))
    return { id: profile.connectionId, outgoing: true }
  return null
}

export const entityId = (item) => item._id || item.id
export function mergeResults(current, next, getId = entityId) {
  const itemsById = new Map()

  for (const item of [...current, ...next]) {
    itemsById.set(getId(item), item)
  }

  return [...itemsById.values()]
}
export const postLink = (id) =>
  `${window.location.origin}/home?${new URLSearchParams({ postId: id })}`
