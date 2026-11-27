import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getUserProfile } from '../action/action'
import { readAuth } from '../utils/helper'

const ProfileContext = createContext(null)
const FALLBACK_PROFILE_IMAGE = '/assets/logo_icons/profile_alt.avif'

export function normalizeProfile(data) {
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
  useLocation() // Re-read same-tab authentication after login navigation.
  const [, sessionChanged] = useState(0)
  const authToken = readAuth()?.token || ''
  const [state, setState] = useState({ token: '', profile: null, isLoading: false, error: null })
  const generation = useRef(0)

  useEffect(() => {
    const update = () => sessionChanged((value) => value + 1)
    window.addEventListener('storage', update)
    window.addEventListener('auth-change', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('auth-change', update)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (authToken !== (readAuth()?.token || '')) return null
    const id = ++generation.current
    setState((current) => ({
      token: authToken,
      profile: current.token === authToken ? current.profile : null,
      isLoading: !!authToken,
      error: null,
    }))
    if (!authToken) return null
    try {
      const response = await getUserProfile()
      if (id !== generation.current || authToken !== readAuth()?.token) return null
      const profile = normalizeProfile(response.data)
      setState({ token: authToken, profile, isLoading: false, error: null })
      return profile
    } catch (error) {
      if (id === generation.current)
        setState((current) => ({ ...current, isLoading: false, error }))
      return null
    }
  }, [authToken])

  useEffect(() => {
    refreshProfile()
    return () => {
      generation.current++
    }
  }, [refreshProfile])

  const setProfile = useCallback(
    (update) => {
      if (authToken !== (readAuth()?.token || '')) return
      generation.current++
      setState((current) => {
        const next = typeof update === 'function' ? update(current.profile) : update
        return {
          token: authToken,
          profile: next ? normalizeProfile(next) : null,
          isLoading: false,
          error: null,
        }
      })
    },
    [authToken],
  )
  const profile = state.token === authToken ? state.profile : null
  const isLoading = !!authToken && (state.token !== authToken || state.isLoading)
  const error = state.token === authToken ? state.error : null
  const value = useMemo(
    () => ({ profile, isLoading, error, setProfile, refreshProfile, authToken }),
    [profile, isLoading, error, setProfile, refreshProfile, authToken],
  )
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) throw new Error('useProfile must be used inside ProfileProvider')
  return context
}
