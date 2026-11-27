import { deleteRequest, getRequest, getRequestAllowFailure, postRequest, putRequest } from '../utils/helper'

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

export const getProfileConnections = async (page = 0, filter = null, query = '', limit = 10, userId) => {
  return getRequest('user/profile/connections', { page, ...(filter ? { filter } : {}), q: query, limit, ...(userId ? { userId } : {}) })
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
  return postRequest('user/flick/get-all-other-user-flick', { userId, page, limit, postType: 1 })
}

export const getMyAllPosts = async (page = 0, limit = 10, postType) => {
  return getRequest('user/post/get-my-all-post', { page, limit, ...(postType ? { postType } : {}) })
}

export const getOtherUserPosts = async (userId, page = 0, limit = 10, postType) => {
  return postRequest('user/post/get-all-other-user-post', { userId, page, limit, ...(postType ? { postType } : {}) })
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
  return deleteRequest(`user/post/comment?commentId=${encodeURIComponent(commentId)}&postId=${encodeURIComponent(postId)}`)
}

export const getCommentReplies = async (commentId, page = 0) => {
  return getRequest('user/post/comment/reply', { page, commentId })
}

//------------------|| PROFILE ACTIONS & UPLOADS ||------------------//

export const getUploadUrl = async (ext) => getRequest('upload/sign', { ext })

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

export const deleteAccount = async () => deleteRequest('user/delete-account')

export const createPost = async (data) => postRequest('user/post', data)

export const getUserProfile = async () => getRequest('user/profile/get-my-profile')

export const getOtherUserProfile = async (userId) => {
  return postRequest('user/profile/get-other-user-profile', { userId })
}

//------------------|| BLOCKED USERS ||------------------//

export const blockUser = async (blockedUserId, blockStatus) => {
  return postRequest('user/block', { blockedUserId, blockStatus })
}

export const getBlockedUsers = async () => getRequest('user/block')

export const getFlicks = async (page = 0, limit = 10) => {
  return getRequest('user/flick', { page, limit })
}

//------------------|| KNKT ||------------------//

export const getTopics = async () => {
  return getRequest('user/topics')
}

export const getThreadLocations = async (query, page = 0, limit = 10) => {
  return getRequest('user/threads/locations', { page, q: query, limit })
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
  return deleteRequest(`user/thread/comment?commentId=${encodeURIComponent(commentId)}&threadId=${encodeURIComponent(threadId)}`)
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

