import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createChatRoom,
  deleteChat,
  getChatMessages,
  getChatRooms,
  searchChatUsers,
} from '../../action/action'
import { getRequest, postRequest, deleteRequest } from '../../utils/helper'
vi.mock('../../utils/helper', () => ({
  getRequest: vi.fn(),
  postRequest: vi.fn(),
  deleteRequest: vi.fn(),
}))
beforeEach(() => vi.clearAllMocks())
describe('verified backend chat contracts', () => {
  it('uses zero-based paginated reads and the non-paginated room endpoint', () => {
    getChatRooms()
    getChatMessages('room', 2)
    searchChatUsers('Alice', 3)
    expect(getRequest.mock.calls).toEqual([
      ['user/chat/room'],
      ['user/chat/messages', { roomId: 'room', page: 2, limit: 20 }],
      ['user/chat/search', { q: 'Alice', page: 3, limit: 20 }],
    ])
  })
  it('passes the required create and delete bodies', () => {
    createChatRoom('person')
    deleteChat('room', 'person')
    expect(postRequest).toHaveBeenCalledWith('user/chat/room', { userId: 'person' })
    expect(deleteRequest).toHaveBeenCalledWith('user/chat/delete', {
      roomId: 'room',
      userId: 'person',
    })
  })
})
