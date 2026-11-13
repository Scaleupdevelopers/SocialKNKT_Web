import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getUserProfile } from '../action/action'
import { AUTH_STORAGE_KEY } from '../utils/helper'

const ProfileContext = createContext(null)
const FALLBACK_PROFILE_IMAGE = '/assets/logo_icons/profile_alt.avif'
let profileRequest = null

function normalizeProfile(data) {
  const fullName = `${data?.fname || ''} ${data?.lname || ''}`.trim() || data?.username || ''
  const work = data?.workExperiences?.find((item) => item.jobTitle?.trim())

  return {
    ...data,
    fullName,
    displayUsername: data?.username ? `@${data.username}` : '',
    image: data?.image || FALLBACK_PROFILE_IMAGE,
    profession: work?.jobTitle?.trim() || '',
    company: work?.companyName || '',
  }
}

export function ProfileProvider({ children }) {
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')

    if (!authData?.token) {
      setIsLoading(false)
      return () => { isMounted = false }
    }

    if (!profileRequest) profileRequest = getUserProfile()

    profileRequest
      .then((response) => {
        if (isMounted) setProfile(normalizeProfile(response.data))
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [location.pathname])

  const value = useMemo(() => ({ profile, isLoading, error, setProfile }), [profile, isLoading, error])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error('useProfile must be used inside ProfileProvider')
  return context
}
