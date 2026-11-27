import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  getOtherUserProfile,
  answerConnection,
  getIncomingConnection,
  removeConnection,
  sendConnection,
} from '../../action/action'

import { connectionsChanged, pendingConnection, readAuth } from '../../utils/helper'
import { useProfile } from '../../context/ProfileContext'
import { ModalShell } from './ModalShell'
import { RequestState } from '../common/RequestState'

const types = ['personal', 'professional']
export function ConnectionManager({ userId, onClose, onChanged = () => {} }) {
  const { refreshProfile } = useProfile()
  const [relation, setRelation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [pending, setPending] = useState(false)
  const [request, setRequest] = useState(null)
  const busy = useRef(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setRelation(null)
    Promise.all([getOtherUserProfile(userId), getIncomingConnection(userId)])
      .then(([response, incoming]) => {
        if (active) {
          setRelation(response.data)
          setRequest(pendingConnection(response.data, incoming))
        }
      })
      .catch(() => {
        if (active) setError('Unable to load this connection.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId, revision])

  async function act(operation) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      await operation()
      connectionsChanged()
      refreshProfile()
      onChanged()
      setRevision((value) => value + 1)
    } catch {
      setError('Unable to update this connection. Please try again.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  const pendingRequest = request?.id
  const outgoing = request?.outgoing
  return (
    <ModalShell title="Manage Connection" onClose={onClose} className="connection-manager">
      <RequestState
        loading={loading}
        error={!relation && error}
        retry={() => setRevision((value) => value + 1)}
      >
        {relation && (
          <>
            <p>
              {[relation.fname, relation.lname].filter(Boolean).join(' ') || relation.username}
            </p>
            {pendingRequest ? (
              <div>
                <p>
                  {outgoing
                    ? 'Your request is pending.'
                    : 'This person sent you a connection request.'}
                </p>
                {outgoing ? (
                  <button
                    disabled={pending}
                    onClick={() => act(() => removeConnection(request.id, 'both'))}
                  >
                    Cancel request
                  </button>
                ) : (
                  <>
                    <button
                      disabled={pending}
                      onClick={() => act(() => answerConnection(request.id, 2))}
                    >
                      Accept Personal
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => act(() => answerConnection(request.id, 1))}
                    >
                      Accept Professional
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => act(() => answerConnection(request.id, 3))}
                    >
                      Accept Both
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => act(() => answerConnection(request.id, 4))}
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            ) : (
              types.map((type) => {
                const id = relation[type + 'Connection']
                return (
                  <div className="connection-manager-row" key={type}>
                    <span>{type}</span>
                    <button
                      type="button"
                      disabled={pending || relation.isUserBlocked}
                      onClick={() =>
                        act(() =>
                          id ? removeConnection(id, type) : sendConnection(userId, type),
                        )
                      }
                    >
                      {id ? 'Remove ' : 'Add '}
                      {type}
                    </button>
                  </div>
                )
              })
            )}
            {error && <p role="alert">{error}</p>}
            {pending && <p role="status">Updating connection…</p>}
          </>
        )}
      </RequestState>
    </ModalShell>
  )
}

function removalSteps(profile, type) {
  if (type !== 'both') return [[profile[type + 'Connection'], type]]
  if (profile.personalConnection === profile.professionalConnection) {
    return [[profile.personalConnection, 'initial']]
  }
  return [
    [profile.professionalConnection, 'professional'],
    [profile.personalConnection, 'personal'],
  ]
}

function moveConnectionFocus(event) {
  const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]:not(:disabled)')]
  const index = items.indexOf(document.activeElement)
  const targets = {
    ArrowDown: (index + 1) % items.length,
    ArrowUp: (index - 1 + items.length) % items.length,
    Home: 0,
    End: items.length - 1,
  }
  if (!(event.key in targets)) return
  event.preventDefault()
  event.stopPropagation()
  items[targets[event.key]]?.focus()
}

function useConnectionMutation(userId, refreshProfile, onChanged, onClose, onPendingChange) {
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const generation = useRef(0)
  useEffect(() => {
    generation.current++
    return () => {
      generation.current++
    }
  }, [userId])

  async function refresh(current) {
    if (!current()) return
    connectionsChanged()
    try {
      await refreshProfile()
    } finally {
      if (current()) await onChanged?.()
    }
  }

  async function finish(current, changed, failure) {
    if (!current()) return
    if (failure) {
      toast.error(failure.message || 'Unable to update this connection. Please try again.')
    } else toast.success('Connection updated successfully.')
    if (!changed) return
    await refresh(current)
  }

  function release(current, changed) {
    busy.current = false
    if (!current()) return
    setPending(false)
    onPendingChange?.(false)
    if (changed) onClose?.()
  }

  async function mutate(steps) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    onPendingChange?.(true)
    const version = generation.current
    const token = readAuth()?.token
    const current = () => generation.current === version && readAuth()?.token === token
    let changed = false
    let failure
    try {
      for (const operation of steps) {
        if (!current()) return
        await operation()
        changed = true
      }
    } catch (error) {
      failure = error
    } finally {
      await finish(current, changed, failure).catch(() => {})
      release(current, changed)
    }
  }
  return { pending, mutate, isPending: () => busy.current }
}

export function ConnectionDropdown({ profile, userId, onClose, onChanged, onPendingChange }) {
  const { refreshProfile } = useProfile()
  const [confirmation, setConfirmation] = useState(null)
  const menu = useRef(null)
  const { pending, mutate, isPending } = useConnectionMutation(
    userId,
    refreshProfile,
    onChanged,
    onClose,
    onPendingChange,
  )
  useEffect(() => {
    menu.current?.querySelector('[role="menuitem"]')?.focus()
  }, [])
  const options = [...types]
  if (profile.personalConnection && profile.professionalConnection) options.push('both')

  function choose(type) {
    if (type === 'both' || profile[type + 'Connection']) setConfirmation(type)
    else mutate([() => sendConnection(userId, type)])
  }
  function closeConfirmation() {
    if (!isPending()) setConfirmation(null)
  }
  function confirm() {
    const steps = removalSteps(profile, confirmation)
    mutate(
      steps.map(
        ([id, type]) =>
          () =>
            removeConnection(id, type),
      ),
    )
  }
  return (
    <div className="connection-dropdown">
      <div
        ref={menu}
        className="profile-connection-menu"
        role="menu"
        aria-label="Manage Connection"
        onKeyDown={moveConnectionFocus}
      >
        {options.map((type) => (
          <button
            key={type}
            role="menuitem"
            type="button"
            disabled={pending}
            onClick={() => choose(type)}
          >
            {type === 'both' || profile[type + 'Connection'] ? 'Remove' : 'Add'}{' '}
            {type[0].toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>
      {confirmation && (
        <ModalShell title="Remove Connection" onClose={closeConfirmation}>
          <p>Are you sure you want to remove this connection?</p>
          <button type="button" disabled={pending} onClick={confirm}>
            Remove
          </button>
        </ModalShell>
      )}
    </div>
  )
}
