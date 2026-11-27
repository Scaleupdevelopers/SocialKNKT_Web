import React from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Chat } from './Chat'
import { useConversation } from './useConversation'
import { useChatList } from './useChatList'
import { mergeMessages } from './chatModel'
import * as api from '../../action/action'
import { io } from 'socket.io-client'

vi.mock('../../action/action', () => ({
  getChatRooms: vi.fn(),
  getChatMessages: vi.fn(),
  searchChatUsers: vi.fn(),
  createChatRoom: vi.fn(),
  deleteChat: vi.fn(),
}))
vi.mock('../../layouts/Header', () => ({ Header: () => <header>Header</header> }))
vi.mock('../../context/ProfileContext', () => ({
  useProfile: () => ({ profile: { id: 'me' } }),
}))
vi.mock('socket.io-client', () => ({ io: vi.fn() }))
let sockets
let intersections
beforeEach(() => {
  vi.resetAllMocks()
  sockets = []
  intersections = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback
        intersections.push(this)
      }
      observe(target) {
        this.target = target
      }
      disconnect() {}
    },
  )
  vi.stubEnv('VITE_SOCKET_URL', 'https://socket.example.test')
  localStorage.setItem('socialknkt_auth', JSON.stringify({ token: 'test-only' }))
  io.mockImplementation(() => {
    const handlers = {}
    const socket = {
      connected: true,
      handlers,
      on: vi.fn((name, cb) => {
        handlers[name] = cb
      }),
      emit: vi.fn(),
      connect: vi.fn(() => handlers.connect?.()),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
    }
    sockets.push(socket)
    return socket
  })
  api.getChatRooms.mockResolvedValue({
    data: [
      {
        id: 'a',
        user: { id: 'other', fname: 'Alice', username: 'alice' },
        lastMessage: 'Hello',
      },
    ],
  })
  api.getChatMessages.mockResolvedValue({ data: [] })
  api.searchChatUsers.mockResolvedValue({ data: [] })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  localStorage.clear()
})

describe('chat flow', () => {
  it('loads older messages at the top, retries the same page and preserves scroll position', async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      id: `message-${index}`,
      message: `Message ${index}`,
      userId: 'other',
      createdAt: index + 1,
    }))
    let failOlder
    let olderCalls = 0
    api.getChatMessages.mockImplementation((room, page) => {
      if (page === 0) return Promise.resolve({ data: messages })
      olderCalls++
      if (olderCalls === 1)
        return new Promise((resolve, reject) => {
          failOlder = reject
        })
      return Promise.resolve({
        data: [{ id: 'oldest', message: 'Older message', userId: 'other', createdAt: -1 }],
      })
    })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    await screen.findByText('Message 0')
    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'Loading messages…' })).toBeNull(),
    )
    const history = screen.getByLabelText('Messages')
    Object.defineProperty(history, 'scrollHeight', {
      configurable: true,
      get: () => (history.querySelectorAll('article').length > 20 ? 1400 : 1000),
    })
    history.scrollTop = 120
    const observer = intersections.findLast(
      (entry) => entry.target?.dataset.paginationSentinel === 'Older messages pagination',
    )
    expect(history.firstElementChild).toBe(observer.target)
    expect(screen.queryByRole('button', { name: /Load older|Load more/i })).toBeNull()
    act(() => {
      observer.callback([{ isIntersecting: true }])
      observer.callback([{ isIntersecting: true }])
    })
    expect(olderCalls).toBe(1)
    expect(screen.getByRole('status', { name: 'Loading messages…' })).toHaveClass(
      'loading-skeleton',
    )
    await act(async () => failOlder(new Error('offline')))
    act(() => observer.callback([{ isIntersecting: true }]))
    expect(olderCalls).toBe(1)
    expect(history.scrollTop).toBe(120)
    fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }))
    await screen.findByText('Older message')
    expect(history.scrollTop).toBe(520)
    expect(api.getChatMessages.mock.calls.filter((call) => call[1] > 0)).toEqual([
      ['a', 1],
      ['a', 1],
    ])
    expect(history.querySelector('[data-pagination-sentinel]')).toBeNull()
  })

  it('automatically pages new-chat search results at the bottom', async () => {
    api.searchChatUsers
      .mockResolvedValueOnce({
        data: Array.from({ length: 20 }, (_, index) => ({
          id: String(index),
          fname: `Person ${index}`,
        })),
      })
      .mockResolvedValueOnce({ data: [{ id: 'last', fname: 'Final person' }] })
    render(<Chat />)
    fireEvent.change(screen.getByLabelText('Search chat'), { target: { value: 'Bob' } })
    await screen.findByRole('button', { name: /^Person 0/ })
    const observer = intersections.findLast(
      (entry) => entry.target?.dataset.paginationSentinel === 'Chat list pagination',
    )
    act(() => observer.callback([{ isIntersecting: true }]))
    await screen.findByRole('button', { name: /^Final person/ })
    expect(api.searchChatUsers).toHaveBeenLastCalledWith('Bob', 1)
    expect(screen.queryByRole('button', { name: /Load more/i })).toBeNull()
  })
  it('shows accessible row shimmers for rooms and message history', async () => {
    let finishRooms
    let finishHistory
    api.getChatRooms.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRooms = resolve
        }),
    )
    api.getChatMessages.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishHistory = resolve
        }),
    )
    render(<Chat />)
    expect(screen.getByRole('status', { name: 'Loading…' })).toHaveClass(
      'loading-skeleton-rows',
    )
    await waitFor(() => expect(finishRooms).toBeTypeOf('function'))
    await act(async () =>
      finishRooms({ data: [{ id: 'a', user: { id: 'other', fname: 'Alice' } }] }),
    )
    fireEvent.click(screen.getByRole('button', { name: /Alice/ }))
    expect(screen.getByRole('status', { name: 'Loading messages…' })).toHaveClass(
      'loading-skeleton-rows',
    )
    await act(async () => finishHistory({ data: [] }))
    expect(screen.queryByRole('status', { name: 'Loading messages…' })).not.toBeInTheDocument()
    expect(screen.getByText('Start your conversation.')).toBeVisible()
  })

  it('renders rooms, opens history and sends only once over the mobile socket contract', async () => {
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    await screen.findByText('Start your conversation.')
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hi Alice' } })
    fireEvent.click(screen.getByLabelText('Send message'))
    expect(sockets[0].emit).toHaveBeenCalledWith('message', {
      roomId: 'a',
      message: 'Hi Alice',
      access_token: 'test-only',
    })
    expect(screen.getByLabelText('Send message').disabled).toBe(true)
    const message = {
      _id: 'm1',
      roomId: 'a',
      message: 'Hi Alice',
      userId: 'me',
      createdAt: Date.now(),
    }
    act(() => {
      sockets[0].handlers.message(message)
      sockets[0].handlers.message(message)
    })
    expect(screen.getAllByText('Hi Alice')).toHaveLength(1)
    expect(screen.queryByText('Sending…')).toBeNull()
  })
  it('blocks sending and explains both block directions', async () => {
    api.getChatRooms.mockResolvedValue({
      data: [{ id: 'a', user: { id: 'other', fname: 'Alice' }, blockedBy: 'me' }],
    })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    expect(screen.getByText('You Blocked this User')).toBeTruthy()
    expect(screen.queryByLabelText('Send message')).toBeNull()
  })
  it('opens an existing searched room without creating a duplicate', async () => {
    api.searchChatUsers.mockResolvedValue({
      data: [{ _id: 'other', fname: 'Alice', roomId: 'a' }],
    })
    render(<Chat />)
    fireEvent.change(screen.getByLabelText('Search chat'), { target: { value: 'Bob' } })
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    await screen.findByText('Start your conversation.')
    expect(api.createChatRoom).not.toHaveBeenCalled()
  })
  it('deletes only after confirmation with both required identifiers', async () => {
    api.deleteChat.mockResolvedValue({ status: true })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Conversation options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }))
    expect(api.deleteChat).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(api.deleteChat).toHaveBeenCalledWith('a', 'other'))
  })
})

describe('conversation consistency', () => {
  it.each(['resolve', 'reject'])(
    'queues one reconnect refresh while history is busy and the old request will %s',
    async (outcome) => {
      let finish, fail
      api.getChatMessages
        .mockImplementationOnce(
          () =>
            new Promise((resolve, reject) => {
              finish = resolve
              fail = reject
            }),
        )
        .mockResolvedValue({
          data: [
            {
              id: 'missed',
              roomId: 'a',
              userId: 'other',
              message: 'Received while offline',
              createdAt: 1719495490679,
            },
          ],
        })
      const { result } = renderHook(() => useConversation('a', 'me', false))
      act(() => {
        sockets[0].handlers.disconnect()
        sockets[0].handlers.connect()
        sockets[0].handlers.connect()
      })
      expect(api.getChatMessages).toHaveBeenCalledTimes(1)
      await act(async () => {
        if (outcome === 'resolve') finish({ data: [] })
        else fail(new Error('offline'))
      })
      await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['missed']))
      expect(api.getChatMessages.mock.calls).toEqual([
        ['a', 0],
        ['a', 0],
      ])
      expect(result.current.error).toBe(false)
      expect(result.current.loading).toBe(false)
    },
  )
  it('does not drain a queued reconnect refresh after unmount', async () => {
    let finish
    api.getChatMessages.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { unmount } = renderHook(() => useConversation('a', 'me', false))
    act(() => sockets[0].handlers.connect())
    unmount()
    await act(async () => finish({ data: [] }))
    expect(api.getChatMessages).toHaveBeenCalledTimes(1)
  })
  it('updates the parent room preview and read state without opening another socket', async () => {
    const room = {
      id: 'a',
      user: { id: 'other', fname: 'Alice', username: 'alice' },
      lastMessage: 'Hello',
      readBy: null,
    }
    api.getChatRooms.mockResolvedValue({ data: [room] })
    render(<Chat />)
    fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
    await screen.findByText('Start your conversation.')
    api.getChatRooms.mockResolvedValue({
      data: [
        {
          ...room,
          lastMessage: 'Updated preview',
          lastMessageTime: 1719495490679,
          readBy: 'me',
        },
      ],
    })
    act(() =>
      sockets[0].handlers.message({
        _id: '667d6b42bc80fd586daf7cc2',
        roomId: 'a',
        userId: 'other',
        message: 'Updated preview',
        createdAt: 1719495490679,
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Alice/ }).textContent).toContain(
        'Updated preview',
      ),
    )
    expect(sockets[0].emit).toHaveBeenCalledWith('read_room', { roomId: 'a', userId: 'me' })
    expect(io).toHaveBeenCalledTimes(1)
    expect(sockets[0].on.mock.calls.map(([event]) => event)).not.toContain('read_room')
  })
  it('coalesces activity, uses the latest callback, and cancels room refresh on unmount', async () => {
    vi.useFakeTimers()
    const first = vi.fn(),
      latest = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ onChanged }) => useConversation('a', 'me', false, onChanged),
      { initialProps: { onChanged: first } },
    )
    await act(async () => {})
    rerender({ onChanged: latest })
    act(() => {
      sockets[0].handlers.message({
        _id: 'm1',
        roomId: 'a',
        userId: 'other',
        message: 'hello',
        createdAt: 1719495490679,
      })
      sockets[0].handlers.message({
        _id: 'm2',
        roomId: 'another',
        userId: 'other',
        message: 'other room',
        createdAt: 1719495490680,
      })
      vi.advanceTimersByTime(300)
    })
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledTimes(1)
    expect(io).toHaveBeenCalledTimes(1)
    act(() =>
      sockets[0].handlers.message({
        _id: 'm3',
        roomId: 'a',
        userId: 'other',
        message: 'bye',
        createdAt: 1719495490681,
      }),
    )
    unmount()
    act(() => vi.advanceTimersByTime(300))
    expect(latest).toHaveBeenCalledTimes(1)
  })
  it('discards old-room HTTP responses and leaves the old socket', async () => {
    let resolveOld
    api.getChatMessages.mockImplementation((room) =>
      room === 'a'
        ? new Promise((resolve) => {
            resolveOld = resolve
          })
        : Promise.resolve({
            data: [{ id: 'new', roomId: 'b', message: 'new room', createdAt: 2 }],
          }),
    )
    const { result, rerender, unmount } = renderHook(
      ({ room }) => useConversation(room, 'me', false),
      { initialProps: { room: 'a' } },
    )
    rerender({ room: 'b' })
    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    await act(async () =>
      resolveOld({ data: [{ id: 'old', roomId: 'a', message: 'old room' }] }),
    )
    expect(result.current.messages[0].id).toBe('new')
    expect(sockets[0].emit).toHaveBeenCalledWith('leave_room', { roomId: 'a' })
    unmount()
    expect(sockets[1].disconnect).toHaveBeenCalled()
  })
  it('retries a failed history page without skipping it', async () => {
    let failPage = true
    api.getChatMessages.mockImplementation(async (_room, page) => {
      if (page === 0)
        return { data: Array.from({ length: 20 }, (_, i) => ({ id: String(i), createdAt: i })) }
      if (failPage) {
        failPage = false
        throw new Error('failed')
      }
      return { data: [{ id: 'older', createdAt: -1 }] }
    })
    const { result } = renderHook(() => useConversation('a', 'me', false))
    await waitFor(() => expect(result.current.more).toBe(true))
    await act(async () => result.current.loadMore())
    expect(result.current.error).toBe(true)
    await act(async () => result.current.loadMore())
    expect(api.getChatMessages.mock.calls.map((c) => c[1])).toEqual([0, 0, 1, 1])
    expect(result.current.messages[0].id).toBe('older')
  })
  it('never automatically resends after an uncertain delivery', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useConversation('a', 'me', false))
    await act(async () => {})
    act(() => result.current.send('hello'))
    act(() => vi.advanceTimersByTime(12000))
    expect(result.current.uncertain).toBe(true)
    act(() => result.current.send('hello'))
    expect(sockets[0].emit.mock.calls.filter(([event]) => event === 'message')).toHaveLength(1)
  })
  it('merges REST id and socket _id without duplicate messages', () => {
    expect(
      mergeMessages(
        [{ id: '1', createdAt: 2 }],
        [
          { _id: '1', createdAt: 2 },
          { id: '2', createdAt: 1 },
        ],
      ),
    ).toHaveLength(2)
  })
  it('cancels stale search results when the query changes', async () => {
    let finishOld
    const fetch = vi.fn((q) =>
      q === 'old'
        ? new Promise((r) => {
            finishOld = r
          })
        : Promise.resolve({ data: [{ id: 'new' }] }),
    )
    const { result, rerender } = renderHook(({ q }) => useChatList(() => fetch(q), q), {
      initialProps: { q: 'old' },
    })
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('old'))
    rerender({ q: 'new' })
    await waitFor(() => expect(result.current.items[0]?.id).toBe('new'))
    await act(async () => finishOld({ data: [{ id: 'old' }] }))
    expect(result.current.items[0].id).toBe('new')
  })
})

it('uses the design header icons, hides delete in options and searches loaded messages', async () => {
  api.getChatMessages.mockResolvedValue({
    data: [
      { id: 'm1', userId: 'other', message: 'First message' },
      { id: 'm2', userId: 'other', message: 'Second message' },
    ],
  })
  render(<Chat />)
  fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
  await screen.findByText('First message')
  expect(screen.queryByRole('button', { name: 'Delete chat' })).not.toBeInTheDocument()
  const search = screen.getByRole('button', { name: 'Search messages' })
  expect(search.querySelector('img')).toHaveAttribute(
    'src',
    '/assets/logo_icons/chat-search.svg',
  )
  fireEvent.click(search)
  fireEvent.change(screen.getByLabelText('Search loaded messages'), {
    target: { value: 'Second' },
  })
  expect(screen.queryByText('First message')).not.toBeInTheDocument()
  expect(screen.getByText('Second message')).toBeInTheDocument()
  fireEvent.click(search)
  expect(screen.getByText('First message')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Conversation options' }))
  expect(screen.getByRole('button', { name: 'Delete chat' })).toBeVisible()
  expect(api.deleteChat).not.toHaveBeenCalled()
})

it('adds an emoji to the draft without sending and keeps unsupported attachments disabled', async () => {
  render(<Chat />)
  fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Choose emoji' }))
  fireEvent.click(screen.getByRole('button', { name: '😊' }))
  expect(screen.getByLabelText('Message')).toHaveValue('Hello 😊')
  expect(screen.getByLabelText('Message')).toHaveFocus()
  expect(screen.getByRole('button', { name: 'Attachments unavailable' })).toBeDisabled()
  expect(sockets[0].emit.mock.calls.some(([event]) => event === 'message')).toBe(false)
})

it('does not auto-page history while searching loaded messages and restores menu focus', async () => {
  api.getChatMessages.mockResolvedValue({
    data: Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      userId: 'other',
      message: `Message ${i}`,
    })),
  })
  render(<Chat />)
  fireEvent.click(await screen.findByRole('button', { name: /Alice/ }))
  await screen.findByText('Message 0')
  fireEvent.click(screen.getByRole('button', { name: 'Search messages' }))
  fireEvent.change(screen.getByLabelText('Search loaded messages'), {
    target: { value: 'Missing' },
  })
  expect(
    document.querySelector('[data-pagination-sentinel="Older messages pagination"]'),
  ).toBeNull()
  const before = api.getChatMessages.mock.calls.length
  await act(async () => {})
  expect(api.getChatMessages).toHaveBeenCalledTimes(before)
  const options = screen.getByRole('button', { name: 'Conversation options' })
  fireEvent.click(options)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh messages' }))
  expect(options).toHaveFocus()
  fireEvent.click(options)
  fireEvent.click(screen.getByRole('button', { name: 'Delete chat' }))
  expect(screen.getByRole('button', { name: 'Confirm delete' })).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(options).toHaveFocus()
})

it('keeps matching existing conversations searchable without duplicate connection results', async () => {
  api.searchChatUsers.mockResolvedValue({
    data: [{ id: 'other', fname: 'Alice', username: 'alice' }],
  })
  render(<Chat />)
  await screen.findByRole('button', { name: /Alice/ })
  fireEvent.change(screen.getByLabelText('Search chat'), { target: { value: 'Alice' } })
  await waitFor(() => expect(api.searchChatUsers).toHaveBeenCalledWith('Alice', 0))
  await act(async () => {})
  expect(screen.getAllByRole('button', { name: /Alice/ })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: /Alice/ }))
  expect(api.createChatRoom).not.toHaveBeenCalled()
})
