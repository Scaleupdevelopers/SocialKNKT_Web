import { useCallback, useEffect, useRef, useState } from 'react'

// Memoize loadPage in callers. Changing its identity invalidates older results.
export function usePagedList(loadPage, pageSize = 10) {
  const [state, setState] = useState({
    items: [],
    page: -1,
    loading: true,
    error: '',
    hasMore: false,
  })
  const version = useRef(0)
  const busy = useRef(false)
  const load = useCallback(
    async (page, reset = false) => {
      if (busy.current && !reset) return
      if (reset) version.current++
      const current = version.current
      busy.current = true
      setState((s) => ({
        ...s,
        ...(reset ? { items: [], page: -1, hasMore: false } : {}),
        loading: true,
        error: '',
      }))
      try {
        const response = await loadPage(page)
        if (current !== version.current) return
        const next = Array.isArray(response.data) ? response.data : []
        setState((s) => ({
          items: reset ? next : [...s.items, ...next],
          page,
          loading: false,
          error: '',
          hasMore: next.length >= pageSize,
        }))
      } catch {
        if (current === version.current)
          setState((s) => ({
            ...s,
            loading: false,
            error: 'Unable to load this list. Please try again.',
          }))
      } finally {
        if (current === version.current) busy.current = false
      }
    },
    [loadPage, pageSize],
  )
  const reload = useCallback(() => load(0, true), [load])
  useEffect(() => {
    reload()
    return () => {
      version.current++
      busy.current = false
    }
  }, [reload])
  return {
    ...state,
    reload,
    loadMore: () => load(state.page + 1),
  }
}
