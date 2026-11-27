import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useState } from 'react'
import { Pronunciation, PronunciationRecorder } from './Pronunciation'
import { ProfileFields } from '../settings/components/ProfileFields'
import { completeProfile, uploadFile } from '../../action/action'

vi.mock('../../action/action', () => ({ completeProfile: vi.fn(), uploadFile: vi.fn() }))
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }))

const audioUrl = 'https://media.example.test/name.webm'
let tracks
let getUserMedia
let recorders
class Recorder {
  static isTypeSupported(type) {
    return type.startsWith('audio/webm')
  }
  constructor() {
    this.mimeType = 'audio/webm;codecs=opus'
    this.state = 'inactive'
    recorders.push(this)
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio bytes'], { type: this.mimeType }) })
    this.onstop?.()
  }
}
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function page() {
  return render(
    <MemoryRouter initialEntries={['/pronunciation']}>
      <Routes>
        <Route path="/pronunciation" element={<Pronunciation />} />
        <Route path="/add-media" element={<h1>Add media</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}
async function record() {
  fireEvent.click(screen.getByRole('button', { name: 'Record name' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Stop recording' }))
}
beforeEach(() => {
  vi.clearAllMocks()
  recorders = []
  tracks = [{ stop: vi.fn() }]
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => tracks })
  vi.stubGlobal('MediaRecorder', Recorder)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  URL.createObjectURL = vi.fn().mockReturnValue('blob:preview')
  URL.revokeObjectURL = vi.fn()
  uploadFile.mockResolvedValue(audioUrl)
  completeProfile.mockResolvedValue({ status: true })
})

describe('pronunciation audio', () => {
  it('uploads audio and saves its URL, then follows the signup media step', async () => {
    page()
    fireEvent.change(screen.getByLabelText(/Phonetic spelling/i), {
      target: { value: 'Ah-purr-vuh' },
    })
    await record()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Pronunciation' })).toBeEnabled(),
    )
    expect(uploadFile).toHaveBeenCalledWith(expect.any(Blob), 'webm', 'audio/webm;codecs=opus')
    expect(screen.getByLabelText('Pronunciation preview')).toHaveAttribute(
      'src',
      'blob:preview',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save Pronunciation' }))
    expect(await screen.findByText('Add media')).toBeInTheDocument()
    expect(completeProfile).toHaveBeenCalledWith({
      phonetic_spelling: 'Ah-purr-vuh',
      record_name: audioUrl,
      stepCount: 4,
    })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    expect(tracks[0].stop).toHaveBeenCalled()
  })

  it('retains failed audio for retry and blocks saving or navigating', async () => {
    uploadFile.mockRejectedValueOnce(new Error('private server error'))
    page()
    await record()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry upload' }))
    await waitFor(() => expect(uploadFile).toHaveBeenCalledTimes(2))
    expect(completeProfile).not.toHaveBeenCalled()
    expect(screen.queryByText('Add media')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Pronunciation' })).toBeEnabled(),
    )
  })

  it('blocks form submission after upload failure', async () => {
    uploadFile.mockRejectedValue(new Error('failed'))
    const view = page()
    await record()
    await screen.findByRole('button', { name: 'Retry upload' })
    fireEvent.submit(view.container.querySelector('form'))
    expect(completeProfile).not.toHaveBeenCalled()
    expect(screen.queryByText('Add media')).not.toBeInTheDocument()
  })

  it('skips to media without saving', async () => {
    page()
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByText('Add media')).toBeInTheDocument()
    expect(completeProfile).not.toHaveBeenCalled()
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('releases late permission streams after unmount without starting recording', async () => {
    const permission = deferred()
    getUserMedia.mockReturnValue(permission.promise)
    const view = page()
    fireEvent.click(screen.getByRole('button', { name: 'Record name' }))
    view.unmount()
    await act(async () => permission.resolve({ getTracks: () => tracks }))
    expect(tracks[0].stop).toHaveBeenCalledOnce()
    expect(recorders).toHaveLength(0)
    expect(uploadFile).not.toHaveBeenCalled()
  })

  it('cleans up recording and its timeout on unmount', async () => {
    vi.useFakeTimers()
    try {
      const view = page()
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Record name' })),
      )
      expect(recorders[0].state).toBe('recording')
      view.unmount()
      expect(recorders[0].state).toBe('inactive')
      expect(tracks[0].stop).toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
      expect(uploadFile).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores upload completion after unmount and revokes the preview', async () => {
    const pending = deferred()
    uploadFile.mockReturnValue(pending.promise)
    const onChange = vi.fn()
    const view = render(<PronunciationRecorder onChange={onChange} />)
    await record()
    view.unmount()
    await act(async () => pending.resolve(audioUrl))
    expect(onChange).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })

  it('prevents duplicate permission, upload, and save requests', async () => {
    const permission = deferred()
    const saving = deferred()
    getUserMedia.mockReturnValue(permission.promise)
    completeProfile.mockReturnValue(saving.promise)
    page()
    const start = screen.getByRole('button', { name: 'Record name' })
    fireEvent.click(start)
    fireEvent.click(start)
    expect(getUserMedia).toHaveBeenCalledOnce()
    await act(async () => permission.resolve({ getTracks: () => tracks }))
    const stop = screen.getByRole('button', { name: 'Stop recording' })
    fireEvent.click(stop)
    fireEvent.click(stop)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Pronunciation' })).toBeEnabled(),
    )
    expect(uploadFile).toHaveBeenCalledOnce()
    const save = screen.getByRole('button', { name: 'Save Pronunciation' })
    fireEvent.click(save)
    fireEvent.click(save)
    expect(completeProfile).toHaveBeenCalledOnce()
    await act(async () => saving.resolve({ status: true }))
  })

  it('offers denied microphone recovery and supports phonetic-only save', async () => {
    getUserMedia.mockRejectedValueOnce({ name: 'NotAllowedError' })
    page()
    fireEvent.click(screen.getByRole('button', { name: 'Record name' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Microphone access denied')
    fireEvent.change(screen.getByLabelText(/Phonetic spelling/i), { target: { value: 'Name' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Pronunciation' }))
    await screen.findByText('Add media')
    expect(completeProfile).toHaveBeenCalledWith({
      phonetic_spelling: 'Name',
      record_name: '',
      stepCount: 4,
    })
  })

  it('explains unsupported recording without disabling phonetic input', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    page()
    expect(screen.getByText(/Audio recording is not supported/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record name' })).toBeDisabled()
    expect(screen.getByLabelText(/Phonetic spelling/i)).toBeEnabled()
  })

  it('stops and uploads automatically at the recording limit', async () => {
    vi.useFakeTimers()
    try {
      const view = page()
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Record name' })),
      )
      await act(async () => vi.advanceTimersByTime(30000))
      expect(recorders[0].state).toBe('inactive')
      expect(uploadFile).toHaveBeenCalledOnce()
      expect(tracks[0].stop).toHaveBeenCalled()
      view.unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows retry after a rejected profile save without uploading again', async () => {
    completeProfile.mockResolvedValueOnce({ status: false })
    page()
    await record()
    const save = screen.getByRole('button', { name: 'Save Pronunciation' })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    await waitFor(() => expect(save).toBeEnabled())
    expect(screen.queryByText('Add media')).not.toBeInTheDocument()
    fireEvent.click(save)
    await screen.findByText('Add media')
    expect(uploadFile).toHaveBeenCalledOnce()
    expect(completeProfile).toHaveBeenCalledTimes(2)
  })

  it('keeps the editor phonetic draft when an upload finishes', async () => {
    const upload = deferred()
    uploadFile.mockReturnValue(upload.promise)
    const changed = vi.fn()
    function Editor() {
      const [draft, setDraft] = useState({ phonetic_spelling: 'Old', record_name: audioUrl })
      return (
        <form>
          <ProfileFields
            section="pronunciation"
            draft={draft}
            onChange={(next) => {
              changed(next)
              setDraft(next)
            }}
          />
        </form>
      )
    }
    render(<Editor />)
    await record()
    fireEvent.change(screen.getByLabelText(/Phonetic spelling/i), { target: { value: 'New' } })
    await act(async () => upload.resolve('https://media.example.test/new.webm'))
    expect(changed).toHaveBeenLastCalledWith({
      phonetic_spelling: 'New',
      record_name: 'https://media.example.test/new.webm',
    })
    expect(completeProfile).not.toHaveBeenCalled()
  })
})
