import { Navigate, Outlet } from 'react-router-dom'

import { useProfile } from '../../context/ProfileContext'

export function ProtectedRoute() {
  const { authToken } = useProfile()
  if (!authToken) {
    return <Navigate to="/" replace />
  }

  return <Outlet key={authToken} />
}
