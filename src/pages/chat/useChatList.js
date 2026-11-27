import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeItems } from './chatModel'

// A request generation prevents old searches, retries and unmounted reads committing state.
export function useChatList(fetchPage, key, paginated = true) {
  const [state, setState] = useState({ items: [], loading: true, error: false, more: false })
  const generation = useRef(0)
  const page = useRef(-1)
  const busy = useRef(false)
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
        if (version === generation.current) setState((s) => ({ ...s, loading: false, error: true }))
      } finally {
        if (version === generation.current) busy.current = false
      }
    },
    [paginated],
  )
  useEffect(() => {
    page.current = -1
    setState({ items: [], loading: true, error: false, more: false })
    const timer = setTimeout(() => load(true), 250)
    return () => {
      clearTimeout(timer)
      generation.current++
      busy.current = false
    }
  }, [key, load]) // The latest callback is installed by the preceding effect.
  return { ...state, refresh: () => load(true), loadMore: () => load(page.current < 0) }
}
