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

export const getProfileMedia = async (page = 0, limit = 10) => {
  return getRequest('user/profile/media', { page, limit })
}

export const getPosts = async (page = 0, limit = 10) => {
  return getRequest('user/post', { page, limit })
}

export const deletePost = async (postId) => {
  return deleteRequest(`user/post?postId=${encodeURIComponent(postId)}`)
}

export const updatePostLike = async (postId, likeStatus) => {
  return putRequest('user/post/like', { postId, likeStatus })
}

export const savePost = async (postId) => {
  return postRequest('user/post/saved', { postId })
}

export const reportPost = async (postId, description) => {
  return postRequest('user/post/report', { postId, description })
}

export const getUploadUrl = async (ext) => getRequest('upload/sign', { ext })

export const createPost = async (data) => postRequest('user/post', data)

export const getUserProfile = async () => getRequest('user/profile')

export const getFlicks = async (page = 0, limit = 10) => {
  return getRequest('user/flick', { page, limit })
}

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

