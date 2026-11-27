import {
  deleteRequest,
  getRequest,
  getRequestAllowFailure,
  mergeResults,
  postRequest,
  putRequest,
} from '../utils/helper'

//------------------|| USER AUTH ||------------------//

export const login = async (data) => {
  return postRequest('login', data)
}

export const signUp = async (data) => {
  return postRequest('user/signup', data)
}

export const googleSignup = async (data) => {
  return postRequest('user/signup', data)
}

export const ssoCheck = async (data) => {
  return getRequestAllowFailure('sso', data)
}

export const checkUser = async (data) => {
  return postRequest('check-user', data)
}

export const completeProfile = async (data) => {
  return postRequest('user/complete-profile', data)
}

export const getCountries = async () => {
  return getRequest('user/get-country')
}

export const getStates = async (data) => {
  return postRequest('user/get-states', data)
}

export const getCities = async (data) => {
  return postRequest('user/get-cities', data)
}

//------------------|| PROFILE ||------------------//

export const getProfileMedia = async (page = 0, limit = 10, userId) => {
  return getRequest('user/profile/media', { page, limit, ...(userId ? { userId } : {}) })
}

function matchesProfileMedia(item, mediaKind) {
  if (mediaKind === 'feed') return ['image', 'video'].includes(item.mediaType)
  if (mediaKind === 'flicks') return item.mediaType === 'flick'
  return true
}

function newestProfileContent(first, second) {
  const firstTime = new Date(first.createdAt).getTime() || 0
  const secondTime = new Date(second.createdAt).getTime() || 0
  return secondTime - firstTime
}

// Accepted private connections use the mobile audience endpoint, one ten-item page per audience.
export async function getConnectedProfileContent(userId, page, audiences, mediaKind = 'posts') {
  const postTypes = [...new Set(audiences)].filter((audience) => [1, 2].includes(audience))
  if (!postTypes.length) return { data: [], hasMore: false }
  const responses = await Promise.all(
    postTypes.map((postType) =>
      getRequest('user/profile/posts', { userId, page, media: false, postType }),
    ),
  )
  const pages = responses.map((response) => (Array.isArray(response.data) ? response.data : []))
  const data = mergeResults([], pages.flat())
    .filter((item) => matchesProfileMedia(item, mediaKind))
    .sort(newestProfileContent)
  return { data, hasMore: pages.some((items) => items.length >= 10) }
}

export const getProfileConnections = async (
  page = 0,
  filter = null,
  query = '',
  limit = 10,
  userId,
) => {
  return getRequest('user/profile/connections', {
    page,
    ...(filter ? { filter } : {}),
    q: query,
    limit,
    ...(userId ? { userId } : {}),
  })
}

export const getPosts = async (page = 0, limit = 10) => {
  return getRequest('user/post', { page, limit })
}

//------------------|| HOME FEED & POSTS ||------------------//

export const getAllMyFeed = async (page = 0, limit = 10) => {
  return getRequest('user/post/get-all-my-feed', { page, limit })
}

export const getOtherUserFeed = async (userId, page = 0, limit = 10) => {
  return postRequest('user/post/get-all-other-feed', { userId, page, limit })
}

//------------------|| FLICKS ||------------------//

export const getAllMyFlicks = async (page = 0, limit = 10) => {
  return getRequest('user/flick/get-all-my-flick', { page, limit })
}

export const getOtherUserFlicks = async (userId, page = 0, limit = 10) => {
  return postRequest('user/flick/get-all-other-user-flick', {
    userId,
    page,
    limit,
    postType: 0,
  })
}

export const getMyAllPosts = async (page = 0, limit = 10, postType) => {
  return getRequest('user/post/get-my-all-post', {
    page,
    limit,
    ...(postType ? { postType } : {}),
  })
}

export const getOtherUserPosts = async (userId, page = 0, limit = 10, postType) => {
  return postRequest('user/post/get-all-other-user-post', {
    userId,
    page,
    limit,
    ...(postType ? { postType } : {}),
  })
}

export const deletePost = async (postId) => {
  return deleteRequest(`user/post?postId=${encodeURIComponent(postId)}`)
}

export const updatePostLike = async (postId, likeStatus) => {
  return putRequest('user/post/like', { postId, likeStatus })
}

//------------------|| POST ACTIONS ||------------------//

export const savePost = async (postId) => {
  return postRequest('user/post/saved', { postId })
}

export const reportPost = async (postId, description) => {
  return postRequest('user/post/report', { postId, description })
}

export const commentPost = async (postId, comment) => {
  return postRequest('user/post/comment', { postId, comment })
}

export const getComments = async (postId, page = 0) => {
  return getRequest('user/post/comment', { page, postId })
}

export const getPostComment = async (commentId) => {
  if (typeof commentId !== 'string' || !/^[a-f\d]{24}$/i.test(commentId)) {
    throw new Error('Invalid comment link.')
  }
  return getRequest(`user/post/comment/${commentId}`)
}

export const updateCommentLike = async (commentId, postId, likeStatus) => {
  return putRequest('user/post/comment/like', { commentId, postId, likeStatus })
}

export const replyToComment = async (postId, commentId, comment) => {
  return postRequest('user/post/comment/reply', { postId, commentId, comment })
}

export const reportComment = async (postId, commentId, description) => {
  return postRequest('user/post/comment/report', { postId, commentId, description })
}

export const deleteComment = async (postId, commentId) => {
  return deleteRequest(
    `user/post/comment?commentId=${encodeURIComponent(commentId)}&postId=${encodeURIComponent(postId)}`,
  )
}

export const getCommentReplies = async (commentId, page = 0) => {
  return getRequest('user/post/comment/reply', { page, commentId })
}

//------------------|| PROFILE ACTIONS & UPLOADS ||------------------//

export const getUploadUrl = async (ext) => {
  return getRequest('upload/sign', { ext })
}

export const updateBannerImage = async (banner_image) => {
  return postRequest('user/update-banner-image', { banner_image })
}

export const updateProfessionalStatus = async (isProfessional) => {
  return postRequest('user/update-professional-status', { isProfessional })
}

export const updateAccountStatus = async (profileType) => {
  return postRequest('user/update-account-status', { profileType })
}

export const updatePassword = async (data) => {
  return putRequest('user/password', data)
}

export const deleteAccount = async () => {
  return deleteRequest('user/delete-account')
}

export const createPost = async (data) => {
  return postRequest('user/post', data)
}

export const getUserProfile = async () => {
  return getRequest('user/profile/get-my-profile')
}

export const getOtherUserProfile = async (userId) => {
  return postRequest('user/profile/get-other-user-profile', { userId })
}

//------------------|| BLOCKED USERS ||------------------//

export const blockUser = async (blockedUserId, blockStatus) => {
  return postRequest('user/block', { blockedUserId, blockStatus })
}

export const reportUser = async (userId, description) => {
  return postRequest('user/chat/report', { userId, description })
}

export const getBlockedUsers = async () => {
  return getRequest('user/block')
}

export const getFlicks = async (page = 0, limit = 10) => {
  return getRequest('user/flick', { page, limit })
}

//------------------|| KNKT ||------------------//

export const getTopics = async () => {
  return getRequest('user/topics')
}

export const getPopularTopics = async () => {
  return getRequest('user/popular/topics')
}

export const getThreadLocations = async (query, page = 0, limit = 10) => {
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return getRequest('user/threads/locations', { page, q, limit })
}

export const getThreads = async (page = 0, filter = 1, limit = 10, topicId) => {
  return getRequest('user/threads', { page, filter, limit, ...(topicId ? { topicId } : {}) })
}

export const createThread = async (data) => {
  return postRequest('user/thread', data)
}

export const reportThread = async (threadId, description) => {
  return postRequest('user/thread/report', { threadId, description })
}

export const deleteThread = async (threadId) => {
  return deleteRequest(`user/thread?threadId=${encodeURIComponent(threadId)}`)
}

export const updateThreadLike = async (threadId, likeStatus) => {
  return putRequest('user/thread/like', { threadId, likeStatus })
}

export const getThreadComments = async (threadId, page = 0) => {
  return getRequest('user/thread/comment', { page, threadId })
}

export const createThreadComment = async (threadId, comment) => {
  return postRequest('user/thread/comment', { comment, threadId })
}

export const createThreadCommentReply = async (threadId, commentId, comment) => {
  return postRequest('user/thread/comment/reply', { comment, threadId, commentId })
}

export const getThreadCommentReplies = async (commentId, page = 0) => {
  return getRequest('user/thread/comment/reply', { page, commentId, limit: 10, createdAt: 1 })
}

export const reportThreadComment = async (threadId, commentId, description) => {
  return postRequest('user/thread/comment/report', { threadId, commentId, description })
}

export const deleteThreadComment = async (threadId, commentId) => {
  return deleteRequest(
    `user/thread/comment?commentId=${encodeURIComponent(commentId)}&threadId=${encodeURIComponent(threadId)}`,
  )
}

export const updateThreadCommentLike = async (threadId, commentId, likeStatus) => {
  return putRequest('user/thread/comment/like', { commentId, threadId, likeStatus })
}

//------------------|| PASSWORD & OTP ||------------------//

export const sendForgotPasswordOtp = async (data) => {
  return postRequest('forget-password/send-otp', data)
}

export const verifyOtp = async (data) => {
  return postRequest('user/verify-otp', data)
}

export const resendOtp = async (data) => {
  return postRequest('user/resend-otp', data)
}

export const changePassword = async (data) => {
  return postRequest('forget-password/change-password', data)
}

//------------------|| CHAT ||------------------//

// Keep authentication and response handling in the existing request layer.
// Reads are cancelled at the consumer boundary because the shared helper has no signal option.
export const getChatRooms = () => {
  return getRequest('user/chat/room')
}

export const searchChatUsers = (q, page = 0, limit = 20) => {
  return getRequest('user/chat/search', { q, page, limit })
}

export const createChatRoom = (userId) => {
  return postRequest('user/chat/room', { userId })
}

export const getChatMessages = (roomId, page = 0, limit = 20) => {
  return getRequest('user/chat/messages', { roomId, page, limit })
}

export const deleteChat = (roomId, userId) => {
  return deleteRequest('user/chat/delete', { roomId, userId })
}

//------------------|| CONNECTIONS ||------------------//

export const getConnectionRequests = (page = 0) => {
  return getRequest('user/connection-request', { page, limit: 10 })
}

export const getConnectionCount = () => {
  return getRequest('user/connection-request/count')
}

export const sendConnection = (connectUserId, connectionType) => {
  return postRequest('user/connection-request', { connectUserId, connectionType })
}

export const answerConnection = (connectionId, status) => {
  return putRequest('user/connection-request', { connectionId, status })
}

export const removeConnection = (connectionId, connectionType) => {
  return deleteRequest('user/connection-request', { connectionId, connectionType })
}

export async function getIncomingConnection(userId) {
  let page = 0
  while (true) {
    const { data } = await getConnectionRequests(page++)
    const requests = Array.isArray(data) ? data : []
    const incoming = requests.find((item) => String(item.userId) === String(userId))
    if (incoming || requests.length < 10) return incoming || null
  }
}

//------------------|| DISCOVERY ||------------------//

async function getEntity(kind, id) {
  if (!/^[a-f\d]{24}$/i.test(id || '')) {
    throw new Error('Invalid link.')
  }
  const response = await getRequest(`user/${kind}/${encodeURIComponent(id)}`)
  if (!response.data || Array.isArray(response.data) || response.data.deletedAt) {
    throw new Error('Content unavailable.')
  }
  return response
}

export const getPost = (id) => {
  return getEntity('post', id)
}

export const getThread = (id) => {
  return getEntity('thread', id)
}

export const getSavedPosts = (page = 0, limit = 10) => {
  return getRequest('user/post/get-saved-posts', { page, limit })
}

export const recordPostShare = (postId) => {
  return putRequest('user/post/share', { postId, shareStatus: true })
}

export const recordPostViews = (postIds) => {
  return putRequest('user/post/view', { postIds: [...new Set(postIds)], viewStatus: true })
}

//------------------|| NOTIFICATIONS ||------------------//

export const getNotifications = (page = 0) => {
  return getRequest('user/notifications', { page })
}

export const getNotificationCount = () => {
  return getRequest('user/notifications/count')
}

//------------------|| PROFILE ||------------------//

export const updateProfile = (payload) => {
  return putRequest('user/profile', payload)
}

export async function uploadFile(
  file,
  extension = file.name.split('.').pop().toLowerCase(),
  contentType = file.type || 'application/octet-stream',
) {
  const response = await getUploadUrl(extension)
  const upload = await fetch(response.data, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!upload.ok) {
    throw new Error('Unable to upload file. Please try again.')
  }
  return response.data.split('?')[0]
}

//------------------|| SEARCH ||------------------//

export const SEARCH_PAGE_SIZE = 10
export function searchContent(kind, query, page = 0) {
  const q = query.trim()
  if (!q) {
    return Promise.resolve({ data: [] })
  }

  if (kind === 'people') {
    return getRequest('user/search', {
      q,
      type: 'people',
      media: false,
      page,
      limit: SEARCH_PAGE_SIZE,
    })
  }
  // These endpoints interpret q as a regular expression. Search literal user input.
  const literalQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (kind === 'threads') {
    return getRequest('user/threads/search', { q: literalQuery, page, limit: SEARCH_PAGE_SIZE })
  }
  // media=false currently returns threads, not posts, at backend main 854ad9a.
  return getRequest('user/search', {
    q: literalQuery,
    type: 'feeds',
    media: true,
    page,
    limit: SEARCH_PAGE_SIZE,
  })
}

export const getContactDetails = async () => {
  return getRequest('user/profile/admin')
}
