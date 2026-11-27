import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getChatMessages } from '../../action/action'
import { readAuth } from '../../utils/helper'
import { itemId, mergeMessages } from './chatModel'

export const CHAT_MESSAGE_LIMIT = 1200

function confirmsSend(message, sent, userId) {
  const id = itemId(message)
  return Boolean(
    id &&
      !sent.observedIds.has(id) &&
      message.userId === userId &&
      message.message === sent.text &&
      Number(message.createdAt) >= sent.startedAt,
  )
}

export function useConversation(roomId, userId, blocked, onRoomsChanged) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [more, setMore] = useState(false)
  const [connected, setConnected] = useState(false)
  const [pending, setPending] = useState(null)
  const [uncertain, setUncertain] = useState(false)
  const channel = useRef(null)
  const version = useRef(0)
  const page = useRef(-1)
  const busy = useRef(false)
  const refreshQueued = useRef(false)
  const pendingRef = useRef(null)
  const observedIds = useRef(new Set())
  const timer = useRef(null)
  const roomsTimer = useRef(null)
  const roomsChanged = useRef(onRoomsChanged)
  useEffect(() => {
    roomsChanged.current = onRoomsChanged
  }, [onRoomsChanged])
  // Coalesce history/read/message activity on this socket into one room-list read.
  // read_room is an outgoing command; the mobile contract defines no read acknowledgement.
  const notifyRooms = useCallback(() => {
    clearTimeout(roomsTimer.current)
    roomsTimer.current = setTimeout(() => roomsChanged.current?.(), 300)
  }, [])

  const reconcile = useCallback(
    (incoming) => {
      const sent = pendingRef.current
      incoming.forEach((message) => observedIds.current.add(itemId(message)))
      if (!sent) return
      const found = incoming.some((message) => confirmsSend(message, sent, userId))
      if (found) {
        clearTimeout(timer.current)
        pendingRef.current = null
        setPending(null)
        setUncertain(false)
      }
    },
    [userId],
  )
  const readPage = useCallback(
    async (next, current) => {
      const response = await getChatMessages(roomId, next)
      if (current !== version.current) return
      const incoming = response.data || []
      setMessages((items) => mergeMessages(items, incoming))
      page.current = next
      setMore(incoming.length >= 20)
      reconcile(incoming)
      notifyRooms()
    },
    [roomId, reconcile, notifyRooms],
  )
  const load = useCallback(
    async function loadHistory(reset) {
      if (!roomId) return
      if (busy.current) {
        // Reconnect/manual refresh must run after the in-flight page, even if it fails.
        refreshQueued.current ||= Boolean(reset)
        return
      }
      refreshQueued.current = false
      const current = version.current
      const next = reset ? 0 : page.current + 1
      busy.current = true
      setLoading(true)
      setError(false)
      try {
        await readPage(next, current)
      } catch {
        if (current === version.current) setError(true)
      } finally {
        if (current === version.current) {
          busy.current = false
          if (refreshQueued.current) await loadHistory(true)
          else setLoading(false)
        }
      }
    },
    [roomId, readPage],
  )
  useEffect(() => {
    version.current++
    page.current = -1
    busy.current = false
    refreshQueued.current = false
    pendingRef.current = null
    observedIds.current = new Set()
    setPending(null)
    setUncertain(false)
    setMessages([])
    setConnected(false)
    load(true)
    const token = readAuth()?.token
    const url = import.meta.env.VITE_SOCKET_URL
    if (!url || !token || !roomId)
      return () => {
        version.current++
        clearTimeout(roomsTimer.current)
      }
    const socket = io(url, {
      transports: ['websocket'],
      query: { token },
      autoConnect: false,
      reconnectionAttempts: 5,
    })
    channel.current = socket
    const read = () => {
      if (document.visibilityState === 'visible' && userId) {
        socket.emit('read_room', { roomId, userId })
        notifyRooms()
      }
    }
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_room', { roomId })
      read()
      load(true)
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    socket.on('message', (message) => {
      // If this server also delivers another room's event, refresh its preview too.
      if (message?.roomId) notifyRooms()
      if (message?.roomId !== roomId) return
      setMessages((items) => mergeMessages(items, [message]))
      reconcile([message])
      read()
    })
    document.addEventListener('visibilitychange', read)
    socket.connect()
    return () => {
      version.current++
      clearTimeout(timer.current)
      clearTimeout(roomsTimer.current)
      document.removeEventListener('visibilitychange', read)
      socket.emit('leave_room', { roomId })
      socket.removeAllListeners()
      socket.disconnect()
      channel.current = null
    }
  }, [roomId, userId, load, reconcile, notifyRooms])

  function send(text) {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > CHAT_MESSAGE_LIMIT) return false
    if (blocked || pendingRef.current || !channel.current?.connected) return false
    const value = {
      text: trimmed,
      startedAt: Date.now() - 1000,
      observedIds: new Set(observedIds.current),
    }
    pendingRef.current = value
    setPending(value)
    setUncertain(false)
    timer.current = setTimeout(() => setUncertain(true), 12000)
    channel.current.emit('message', {
      roomId,
      message: value.text,
      access_token: readAuth()?.token,
    })
    return true
  }
  function restoreDraft() {
    const text = pendingRef.current?.text || ''
    clearTimeout(timer.current)
    pendingRef.current = null
    setPending(null)
    setUncertain(false)
    return text
  }
  return {
    messages,
    loading,
    error,
    more,
    connected,
    pending,
    uncertain,
    send,
    restoreDraft,
    loadMore: () => load(),
    refresh: () => load(true),
    reconnect: () => channel.current?.connect(),
  }
}
