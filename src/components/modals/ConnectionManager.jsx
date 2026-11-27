import { useEffect, useRef, useState } from 'react'
import {
  getOtherUserProfile,
  answerConnection,
  getIncomingConnection,
  removeConnection,
  sendConnection,
} from '../../action/action'

import { connectionsChanged, pendingConnection } from '../../utils/helper'
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
            <p>{[relation.fname, relation.lname].filter(Boolean).join(' ') || relation.username}</p>
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
                        act(() => (id ? removeConnection(id, type) : sendConnection(userId, type)))
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
