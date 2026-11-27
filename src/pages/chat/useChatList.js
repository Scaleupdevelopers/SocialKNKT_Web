import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeItems } from './chatModel'

// A request generation prevents old searches, retries and unmounted reads committing state.
export function useChatList(fetchPage, key, paginated = true) {
  const [state, setState] = useState({ items: [], loading: true, error: false, more: false })
  const generation = useRef(0)
  const page = useRef(-1)
  const busy = useRef(false)
  const initialTimer = useRef(null)
  const loader = useRef(fetchPage)
  useEffect(() => {
    loader.current = fetchPage
  }, [fetchPage])
  const load = useCallback(
    async (reset = false) => {
      if (busy.current && !reset) return
      const version = reset ? ++generation.current : generation.current
      const next = reset ? 0 : page.current + 1
      busy.current = true
      setState((s) => ({ ...s, loading: true, error: false }))
      try {
        const response = await loader.current(next)
        if (version !== generation.current) return
        const items = Array.isArray(response.data) ? response.data : []
        page.current = next
        setState((s) => ({
          items: reset ? items : mergeItems(s.items, items),
          loading: false,
          error: false,
          more: paginated && items.length >= 20,
        }))
      } catch {
        if (version === generation.current)
          setState((s) => ({ ...s, loading: false, error: true }))
      } finally {
        if (version === generation.current) busy.current = false
      }
    },
    [paginated],
  )
  useEffect(() => {
    page.current = -1
    setState({ items: [], loading: true, error: false, more: false })
    initialTimer.current = setTimeout(() => load(true), 250)
    return () => {
      clearTimeout(initialTimer.current)
      generation.current++
      busy.current = false
    }
  }, [key, load]) // The latest callback is installed by the preceding effect.
  useEffect(() => {
    if (paginated) return
    const refreshVisibleRooms = () => {
      if (document.visibilityState !== 'visible' || busy.current) return
      clearTimeout(initialTimer.current)
      load(true)
    }
    window.addEventListener('focus', refreshVisibleRooms)
    document.addEventListener('visibilitychange', refreshVisibleRooms)
    return () => {
      window.removeEventListener('focus', refreshVisibleRooms)
      document.removeEventListener('visibilitychange', refreshVisibleRooms)
    }
  }, [paginated, key, load])
  return { ...state, refresh: () => load(true), loadMore: () => load(page.current < 0) }
}
