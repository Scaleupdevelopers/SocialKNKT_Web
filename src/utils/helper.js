import config from './config'

const serverPath = config.API_URL
export const AUTH_STORAGE_KEY = 'socialknkt_auth'

export const request = async (path, data, method) => {
  const loginData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
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

  const response = await fetch(`${serverPath}/${path}`, requestOptions)

  const responseData = await response.json().catch(() => ({}))

  if (!response.ok || responseData.status === false) {
    const message = responseData.message || 'Something went wrong.'
    throw new Error(message)
  }

  return responseData
}

export const postRequest = async (path, data) => request(path, data, 'POST')
export const putRequest = async (path, data) => request(path, data, 'PUT')
export const PatchRequest = async (path, data) => request(path, data, 'PATCH')
export const deleteRequest = async (path, data) => request(path, data, 'DELETE')
export const getRequest = async (path, data) => request(path, data, 'GET')
