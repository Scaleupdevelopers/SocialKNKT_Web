import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Header } from '../../layouts/Header'
import { AutoLoadMore, LoadingSkeleton } from '../../components/common/RequestState'
import { useProfile } from '../../context/ProfileContext'
import { createChatRoom, deleteChat, getChatRooms, searchChatUsers } from '../../action/action'
import { formatTime, itemId, userName } from './chatModel'
import { useChatList } from './useChatList'
import { CHAT_MESSAGE_LIMIT, useConversation } from './useConversation'
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
      {empty && !list.loading && !list.error && !list.items.length && (
        <p className="chat-empty">{empty}</p>
      )}
      <AutoLoadMore
        hasMore={list.more}
        loading={list.loading}
        error={list.error}
        onLoadMore={list.loadMore}
        label="Chat list pagination"
      />
    </>
  )
}

function NewConversation({ onSelect, query, existingUsers }) {
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
      {users.items
        .filter((user) => !existingUsers.includes(itemId(user)))
        .map((user) => (
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
      <ListFeedback
        list={users}
        empty={existingUsers.length ? null : 'No connections found.'}
      />
    </section>
  )
}

function Conversation({ room, userId, onBack, onDeleted, onRoomsChanged }) {
  const chat = useConversation(room.id, userId, Boolean(room.blockedBy), onRoomsChanged)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [messageQuery, setMessageQuery] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
  const deleteLock = useRef(false)
  const mounted = useRef(true)
  const end = useRef(null)
  const optionsTrigger = useRef(null)
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
      <ConversationHeader
        user={room.user}
        onBack={onBack}
        menuTrigger={optionsTrigger}
        onDelete={() => setConfirmDelete(true)}
        onRefresh={chat.refresh}
        query={messageQuery}
        setQuery={setMessageQuery}
      />
      {confirmDelete && (
        <div className="chat-notice" role="alert">
          <p>Delete this conversation history for your account?</p>
          <button autoFocus disabled={deleting} onClick={remove}>
            {deleting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button
            disabled={deleting}
            onClick={() => {
              setConfirmDelete(false)
              optionsTrigger.current?.focus()
            }}
          >
            Cancel
          </button>
          {deleteError && <p>Unable to delete. Try again.</p>}
        </div>
      )}
      <ConversationHistory chat={chat} userId={userId} end={end} query={messageQuery} />
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

function ConversationHeader({
  user,
  onBack,
  onDelete,
  onRefresh,
  query,
  setQuery,
  menuTrigger,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  return (
    <>
      <div className="chat-title chat-conversation-title">
        <button className="chat-back" aria-label="Back to conversations" onClick={onBack}>
          Back
        </button>
        <div className="chat-identity">
          <Avatar user={user} />
          <div className="chat-identity-text">
            <strong>@{user.username || userName(user)}</strong>
            <span>{userName(user)}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            className="chat-icon-button"
            aria-label="Search messages"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen(!searchOpen)
              setQuery('')
            }}
          >
            <img src="/assets/logo_icons/chat-search.svg" alt="" />
          </button>
          <div
            className="chat-menu-wrap"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setMenuOpen(false)
                menuTrigger.current?.focus()
              }
            }}
          >
            <button
              ref={menuTrigger}
              className="chat-icon-button"
              aria-label="Conversation options"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <img src="/assets/logo_icons/chat-more.svg" alt="" />
            </button>
            {menuOpen && (
              <div className="chat-options">
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    menuTrigger.current?.focus()
                    onRefresh()
                  }}
                >
                  Refresh messages
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete()
                  }}
                >
                  Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {searchOpen && (
        <div className="chat-message-search">
          <input
            autoFocus
            aria-label="Search loaded messages"
            placeholder="Search loaded messages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
    </>
  )
}

function ConversationHistory({ chat, userId, end, query }) {
  const history = useRef(null)
  const scrollAnchor = useRef(null)
  function loadOlder() {
    if (chat.loading || scrollAnchor.current !== null) return
    const element = history.current
    scrollAnchor.current = element.scrollHeight - element.scrollTop
    chat.loadMore()
  }
  useLayoutEffect(() => {
    if (chat.loading || scrollAnchor.current === null) return
    history.current.scrollTop = history.current.scrollHeight - scrollAnchor.current
    scrollAnchor.current = null
  }, [chat.messages, chat.loading, chat.error])
  return (
    <div ref={history} className="chat-history" aria-label="Messages">
      <AutoLoadMore
        hasMore={chat.more && !query}
        loading={chat.loading}
        error={chat.error}
        onLoadMore={loadOlder}
        label="Older messages pagination"
      />
      {chat.loading && <LoadingSkeleton label="Loading messages…" />}
      {chat.error && (
        <p role="alert">
          Unable to load messages. <button onClick={loadOlder}>Retry</button>
        </p>
      )}
      {!chat.loading && !chat.error && !chat.messages.length && (
        <p className="chat-empty">Start your conversation.</p>
      )}
      {chat.messages
        .filter((message) =>
          String(message.message).toLowerCase().includes(query.toLowerCase()),
        )
        .map((message) => (
          <article
            className={`chat-message ${message.userId === userId ? 'chat-mine' : ''}`}
            key={itemId(message)}
          >
            <p>
              {typeof message.message === 'string' ? message.message : 'Unsupported message'}
            </p>
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
  const [emojiOpen, setEmojiOpen] = useState(false)
  const inputRef = useRef(null)
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
        <div className="chat-composer-tools">
          <button
            type="button"
            className="chat-icon-button"
            aria-label="Choose emoji"
            aria-expanded={emojiOpen}
            disabled={Boolean(chat.pending)}
            onClick={() => setEmojiOpen(!emojiOpen)}
          >
            <img src="/assets/logo_icons/chat-emoji.svg" alt="" />
          </button>
          <button
            type="button"
            className="chat-icon-button"
            aria-label="Attachments unavailable"
            title="Attachments unavailable"
            disabled
          >
            <img src="/assets/logo_icons/chat-add.svg" alt="" />
          </button>
          {emojiOpen && (
            <div className="chat-emoji-menu" aria-label="Emojis">
              {['😀', '😊', '❤️', '👍', '🎉', '🙏', '👋', '😂'].map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  aria-label={emoji}
                  disabled={draft.length + emoji.length > CHAT_MESSAGE_LIMIT}
                  onClick={() => {
                    setDraft(draft + emoji)
                    setEmojiOpen(false)
                    inputRef.current?.focus()
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          aria-label="Message"
          placeholder="Message"
          maxLength={CHAT_MESSAGE_LIMIT}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={Boolean(chat.pending)}
        />
        <button
          className="chat-send"
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() || !chat.connected || Boolean(chat.pending)}
        >
          <img src="/assets/logo_icons/chat-send.svg" alt="" />
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
  const room = rooms.items.find((r) => r.id === selected?.id) || selected
  const shown = rooms.items.filter((r) =>
    `${userName(r.user)} ${r.user?.username}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    setSelected(null)
  }, [userId])
  return (
    <div className="chat-page">
      <Header />
      <main className={`chat-shell ${room ? 'chat-selected' : ''}`}>
        <aside className="chat-sidebar">
          <div className="chat-title">
            <h1>All Messages</h1>
          </div>
          <div className="chat-search">
            <img src="/assets/logo_icons/chat-search-field.svg" alt="" />
            <input
              aria-label="Search chat"
              placeholder="Search chat"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
                  <time>
                    <span className="chat-time-icon">
                      <img src="/assets/logo_icons/chat-time.svg" alt="" />
                    </span>
                    {formatTime(r.lastMessageTime)}
                  </time>
                </span>
              </button>
            ))}
            {query.trim() ? (
              <NewConversation
                query={query}
                existingUsers={shown.map((r) => itemId(r.user))}
                onSelect={(next) => {
                  setSelected(next)
                  setQuery('')
                  rooms.refresh()
                }}
              />
            ) : (
              <ListFeedback
                list={rooms}
                empty="No messages yet. Search for a connection to start a conversation."
              />
            )}
          </div>
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
