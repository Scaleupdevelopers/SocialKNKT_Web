import { useCallback, useEffect, useRef, useState } from 'react'
import { entityId, mergeResults } from './helper'

function responseItems(response) {
  return Array.isArray(response.data) ? response.data : []
}

// Keep loadPage and custom getId callbacks stable; changing either reloads the list.
export function usePagedList(loadPage, pageSize = 10, getId = entityId) {
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
        const next = responseItems(response)
        setState((s) => ({
          items: mergeResults(reset ? [] : s.items, next, getId),
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
    [loadPage, pageSize, getId],
  )
  const reload = useCallback(() => load(0, true), [load])
  useEffect(() => {
    let cancelled = false
    // StrictMode replays mount effects; only the surviving setup starts the read.
    queueMicrotask(() => {
      if (!cancelled) reload()
    })
    return () => {
      cancelled = true
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
