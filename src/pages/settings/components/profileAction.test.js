import { afterEach, expect, it, vi } from 'vitest'
import { updateProfile, uploadFile } from '../../../action/action'
import { getRequest, putRequest } from '../../../utils/helper'

vi.mock('../../../utils/helper', async (original) => ({
  ...(await original()),
  getRequest: vi.fn(),
  putRequest: vi.fn(),
}))
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('uses the authenticated existing PUT helper and profile route', async () => {
  putRequest.mockResolvedValue({ status: true })
  await updateProfile({ bio: 'Updated' })
  expect(putRequest).toHaveBeenCalledWith('user/profile', { bio: 'Updated' })
})

it('uploads to the signed URL without forwarding API credentials', async () => {
  getRequest.mockResolvedValue({ data: 'https://storage.example.org/photo.png?signature=test' })
  const fetch = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetch)
  const file = { name: 'photo.PNG', type: 'image/png' }
  expect(await uploadFile(file)).toBe('https://storage.example.org/photo.png')
  expect(getRequest).toHaveBeenCalledWith('upload/sign', { ext: 'png' })
  expect(fetch).toHaveBeenCalledWith('https://storage.example.org/photo.png?signature=test', {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: file,
  })
})

it('does not return an attachment URL after failed storage upload', async () => {
  getRequest.mockResolvedValue({ data: 'https://storage.example.org/cv.pdf?signature=test' })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  await expect(uploadFile({ name: 'cv.pdf', type: 'application/pdf' })).rejects.toThrow(
    'Unable to upload',
  )
})

it('uploads generated thumbnail blobs with the requested extension and content type', async () => {
  getRequest.mockResolvedValue({ data: 'https://storage.example.org/preview.png?signature=test' })
  const fetch = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetch)
  const thumbnail = new Blob(['thumbnail'], { type: 'image/png' })

  expect(await uploadFile(thumbnail, 'png', 'image/png')).toBe('https://storage.example.org/preview.png')
  expect(getRequest).toHaveBeenCalledWith('upload/sign', { ext: 'png' })
  expect(fetch).toHaveBeenCalledWith('https://storage.example.org/preview.png?signature=test', {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: thumbnail,
  })
})
