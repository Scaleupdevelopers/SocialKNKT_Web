import { Navigate, Outlet } from 'react-router-dom'

import { AUTH_STORAGE_KEY } from '../../utils/helper'

export function PublicOnlyRoute() {
  let authData = null

  try {
    authData = JSON.parse(
      localStorage.getItem(AUTH_STORAGE_KEY) || 'null',
    )
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  if (authData?.token) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}
