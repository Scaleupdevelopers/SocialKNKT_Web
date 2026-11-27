import { useEffect, useRef, useState } from 'react'
import { Header } from '../../layouts/Header'
import { LoadingSkeleton } from '../../components/common/RequestState'
import { useProfile } from '../../context/ProfileContext'
import { createChatRoom, deleteChat, getChatRooms, searchChatUsers } from '../../action/action'
import { formatTime, itemId, userName } from './chatModel'
import { useChatList } from './useChatList'
import { useConversation } from './useConversation'
import './Chat.css'

function Avatar({ user }) {
  return (
    <img
      className="chat-avatar"
      src={user?.image || '/assets/logo_icons/profile_alt.avif'}
      alt=""
    />
  )
}
function ListFeedback({ list, empty }) {
  return (
    <>
      {list.loading && <LoadingSkeleton />}
      {list.error && (
        <p role="alert">
          Unable to load. <button onClick={list.loadMore}>Retry</button>
        </p>
      )}
      {!list.loading && !list.error && !list.items.length && (
        <p className="chat-empty">{empty}</p>
      )}
      {list.more && (
        <button disabled={list.loading} onClick={list.loadMore}>
          Load more
        </button>
      )}
    </>
  )
}

function NewConversation({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const mounted = useRef(true)
  const lock = useRef(false)
  const users = useChatList((page) => searchChatUsers(query.trim(), page), query)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  async function start(user) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError(false)
    try {
      let id = user.roomId
      if (!id) id = itemId((await createChatRoom(itemId(user))).data)
      if (mounted.current) onSelect({ id, user: { ...user, id: itemId(user) } })
    } catch {
      // Creation can race with another tab. Recover an existing room without creating twice.
      try {
        const response = await getChatRooms()
        const room = response.data.find((r) => itemId(r.user) === itemId(user))
        if (!room) throw new Error('No room')
        if (mounted.current) onSelect(room)
      } catch {
        if (mounted.current) setError(true)
      }
    } finally {
      lock.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return (
    <section className="chat-new" aria-label="New conversation">
      <div className="chat-title">
        <h2>New message</h2>
        <button onClick={onClose}>Cancel</button>
      </div>
      <input
        autoFocus
        aria-label="Search connections"
        placeholder="Search connections"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {users.items.map((user) => (
        <button
          className="chat-room"
          key={itemId(user)}
          disabled={busy}
          onClick={() => start(user)}
        >
          <Avatar user={user} />
          <span>
            {userName(user)}
            <small>@{user.username}</small>
          </span>
        </button>
      ))}
      {error && (
        <p role="alert">Could not start this conversation. Select the person to retry.</p>
      )}
      <ListFeedback list={users} empty="No connections found." />
    </section>
  )
}

function Conversation({ room, userId, onBack, onDeleted, onRoomsChanged }) {
  const chat = useConversation(room.id, userId, Boolean(room.blockedBy), onRoomsChanged)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const deleteLock = useRef(false)
  const mounted = useRef(true)
  const end = useRef(null)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const lastId = itemId(chat.messages.at(-1))
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'nearest' })
  }, [lastId])
  async function remove() {
    if (deleteLock.current) return
    deleteLock.current = true
    setDeleting(true)
    setDeleteError(false)
    try {
      await deleteChat(room.id, itemId(room.user))
      if (mounted.current) onDeleted()
    } catch {
      if (mounted.current) setDeleteError(true)
    } finally {
      deleteLock.current = false
      if (mounted.current) setDeleting(false)
    }
  }
  function submit(event) {
    event.preventDefault()
    if (chat.send(draft)) setDraft('')
  }
  return (
    <section
      className="chat-conversation"
      aria-label={`Conversation with ${userName(room.user)}`}
    >
      <div className="chat-title">
        <button className="chat-back" onClick={onBack}>
          Back
        </button>
        <Avatar user={room.user} />
        <strong>@{room.user.username || userName(room.user)}</strong>
        <span>{userName(room.user)}</span>
        <button className="chat-delete" onClick={() => setConfirmDelete(true)}>
          Delete chat
        </button>
      </div>
      {confirmDelete && (
        <div className="chat-notice" role="alert">
          <p>Delete this conversation history for your account?</p>
          <button disabled={deleting} onClick={remove}>
            {deleting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button disabled={deleting} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          {deleteError && <p>Unable to delete. Try again.</p>}
        </div>
      )}
      <ConversationHistory chat={chat} userId={userId} end={end} />
      <ConversationComposer
        room={room}
        userId={userId}
        chat={chat}
        draft={draft}
        setDraft={setDraft}
        submit={submit}
      />
    </section>
  )
}

function ConversationHistory({ chat, userId, end }) {
  return (
    <div className="chat-history" aria-label="Messages">
      {chat.more && (
        <button disabled={chat.loading} onClick={chat.loadMore}>
          Load older messages
        </button>
      )}
      {chat.loading && <LoadingSkeleton label="Loading messages…" />}
      {chat.error && (
        <p role="alert">
          Unable to load messages. <button onClick={chat.loadMore}>Retry</button>
        </p>
      )}
      {!chat.loading && !chat.error && !chat.messages.length && (
        <p className="chat-empty">Start your conversation.</p>
      )}
      {chat.messages.map((message) => (
        <article
          className={`chat-message ${message.userId === userId ? 'chat-mine' : ''}`}
          key={itemId(message)}
        >
          <p>{typeof message.message === 'string' ? message.message : 'Unsupported message'}</p>
          <time>{formatTime(message.createdAt)}</time>
        </article>
      ))}
      {chat.pending && (
        <article className="chat-message chat-mine">
          <p>{chat.pending.text}</p>
          <small>{chat.uncertain ? 'Delivery unconfirmed' : 'Sending…'}</small>
        </article>
      )}
      <div ref={end} />
    </div>
  )
}

function ConversationComposer({ room, userId, chat, draft, setDraft, submit }) {
  return room.blockedBy ? (
    <div className="chat-blocked">
      <strong>
        {room.blockedBy === userId
          ? 'You Blocked this User'
          : `${userName(room.user)} Blocked You`}
      </strong>
      <p>
        {room.blockedBy === userId
          ? 'You cannot chat with this user. Unblock them from settings to resume.'
          : 'You cannot chat with this user.'}
      </p>
    </div>
  ) : (
    <>
      {!chat.connected && (
        <div className="chat-notice" role="status">
          Chat is offline. <button onClick={chat.reconnect}>Reconnect</button>
          <button onClick={chat.refresh}>Refresh messages</button>
        </div>
      )}
      {chat.uncertain && (
        <div className="chat-notice" role="alert">
          Delivery could not be confirmed. Check messages before sending again; resending may
          duplicate your message.
          <button disabled={chat.loading} onClick={chat.refresh}>
            Check delivery
          </button>
          <button onClick={() => setDraft(chat.restoreDraft())}>Restore draft</button>
        </div>
      )}
      <form className="chat-composer" onSubmit={submit}>
        <input
          aria-label="Message"
          placeholder="Message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={Boolean(chat.pending)}
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() || !chat.connected || Boolean(chat.pending)}
        >
          <img src="/assets/logo_icons/send_icon.svg" alt="" />
        </button>
      </form>
    </>
  )
}

export function Chat() {
  const { profile } = useProfile()
  const userId = itemId(profile)
  const rooms = useChatList(() => getChatRooms(), userId, false)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const room = rooms.items.find((r) => r.id === selected?.id) || selected
  const shown = rooms.items.filter((r) =>
    `${userName(r.user)} ${r.user?.username}`.toLowerCase().includes(query.toLowerCase()),
  )
  useEffect(() => {
    setSelected(null)
    setCreating(false)
  }, [userId])
  return (
    <div className="chat-page">
      <Header />
      <main className={`chat-shell ${room ? 'chat-selected' : ''}`}>
        <aside className="chat-sidebar">
          {creating ? (
            <NewConversation
              onClose={() => setCreating(false)}
              onSelect={(next) => {
                setSelected(next)
                setCreating(false)
                rooms.refresh()
              }}
            />
          ) : (
            <>
              <div className="chat-title">
                <h1>All Messages</h1>
                <button onClick={() => setCreating(true)}>New message</button>
              </div>
              <div className="chat-search">
                <img src="/assets/logo_icons/search.svg" alt="" />
                <input
                  aria-label="Search chat"
                  placeholder="Search chat"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="chat-rooms">
                {shown.map((r) => (
                  <button
                    className={`chat-room ${room?.id === r.id ? 'active' : ''}`}
                    key={r.id}
                    aria-pressed={room?.id === r.id}
                    onClick={() => setSelected(r)}
                  >
                    <Avatar user={r.user} />
                    <span>
                      <strong>{userName(r.user)}</strong>
                      {r.lastMessage && r.readBy !== userId && room?.id !== r.id && (
                        <small className="chat-unread">Unread</small>
                      )}
                      <small>{r.lastMessage || 'Start a conversation'}</small>
                      <time>{formatTime(r.lastMessageTime)}</time>
                    </span>
                  </button>
                ))}
                <ListFeedback list={rooms} empty="No messages yet. Start a new conversation." />
                {query && !shown.length && rooms.items.length > 0 && (
                  <p className="chat-empty">No matching chats.</p>
                )}
              </div>
              <button className="chat-refresh" disabled={rooms.loading} onClick={rooms.refresh}>
                Refresh conversations
              </button>
            </>
          )}
        </aside>
        {room ? (
          <Conversation
            key={`${userId}:${room.id}`}
            room={room}
            userId={userId}
            onRoomsChanged={rooms.refresh}
            onBack={() => {
              setSelected(null)
              rooms.refresh()
            }}
            onDeleted={() => {
              setSelected(null)
              rooms.refresh()
            }}
          />
        ) : (
          <section className="chat-placeholder">
            <h2>Your messages</h2>
            <p>Select a conversation or start a new message.</p>
          </section>
        )}
      </main>
    </div>
  )
}
