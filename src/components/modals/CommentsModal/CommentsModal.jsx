import { useEffect, useState } from 'react'
import './CommentsModal.css'
import { commentPost, getCommentReplies, getComments, replyToComment, updateCommentLike } from '../../../action/action'
import { useProfile } from '../../../context/ProfileContext'
import { AUTH_STORAGE_KEY } from '../../../utils/helper'

export function CommentsModal({ post, onClose }) {
  const { profile } = useProfile()
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : [])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [loadingReplies, setLoadingReplies] = useState({})
  const commentCount = comments.length || post.commentCount || 0
  const mediaPreview = getMediaPreview(post)

  useEffect(() => {
    const postId = post._id || post.id
    if (!postId) return undefined

    getComments(postId)
      .then((response) => setComments(response.data || []))
      .catch(() => {})
      .finally(() => setIsLoading(false))

    return undefined
  }, [post._id, post.id])

  const handleComment = async () => {
    const text = comment.trim()
    const postId = post._id || post.id
    if (!text || !postId || isSubmitting) return

    const tempId = `pending-${Date.now()}`
    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
    const currentUser = profile || authData?.user || authData?.data || {}
    const username = currentUser.username || profile?.displayUsername?.replace(/^@/, '') || 'You'
    const image = currentUser.image || '/assets/logo_icons/profile_alt.avif'
    const optimisticComment = { _id: tempId, comment: text, username, image }
    const parentComment = replyTarget
    if (parentComment) {
      setComments((current) => current.map((item) => (
        (item._id || item.id) === parentComment._id
          ? { ...item, commentReplies: (item.commentReplies || 0) + 1, replies: [...(item.replies || []), optimisticComment] }
          : item
      )))
    } else {
      setComments((current) => [optimisticComment, ...current])
    }
    setComment('')
    setReplyTarget(null)
    setIsSubmitting(true)
    try {
      const response = parentComment
        ? await replyToComment(postId, parentComment._id, text)
        : await commentPost(postId, text)
      const savedComment = {
        ...optimisticComment,
        ...(response.data || {}),
        username: response.data?.username || username,
        image: response.data?.image || image,
      }
      setComments((current) => parentComment
        ? current.map((item) => item._id === parentComment._id
          ? { ...item, replies: (item.replies || []).map((reply) => reply._id === tempId ? savedComment : reply) }
          : item)
        : current.map((item) => item._id === tempId ? savedComment : item))
    } catch {
      setComments((current) => parentComment
        ? current.map((item) => item._id === parentComment._id
          ? { ...item, commentReplies: Math.max(0, (item.commentReplies || 1) - 1), replies: (item.replies || []).filter((reply) => reply._id !== tempId) }
          : item)
        : current.filter((item) => item._id !== tempId))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCommentLike = (item) => {
    const postId = post._id || post.id
    const commentId = item._id || item.id
    if (!postId || !commentId) return

    const nextLiked = !item.isLiked
    setComments((current) => updateCommentTree(current, commentId, nextLiked))

    updateCommentLike(commentId, postId, nextLiked).catch(() => {
      setComments((current) => updateCommentTree(current, commentId, !nextLiked))
    })
  }

  const handleViewReplies = async (item) => {
    const commentId = item._id || item.id
    if (!commentId) return
    const isExpanded = expandedReplies[commentId]
    if (isExpanded) {
      setExpandedReplies((current) => ({ ...current, [commentId]: false }))
      return
    }

    if (!item.repliesLoaded) {
      setLoadingReplies((current) => ({ ...current, [commentId]: true }))
      try {
        const response = await getCommentReplies(commentId)
        setComments((current) => current.map((commentItem) => (
          (commentItem._id || commentItem.id) === commentId
            ? { ...commentItem, replies: response.data || [], repliesLoaded: true }
            : commentItem
        )))
      } catch {
        return
      } finally {
        setLoadingReplies((current) => ({ ...current, [commentId]: false }))
      }
    }
    setExpandedReplies((current) => ({ ...current, [commentId]: true }))
  }

  return (
    <div className="comments-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-title" onClick={(event) => event.stopPropagation()}>
        <button className="comments-modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="comments-modal-media">
          {mediaPreview ? <img src={mediaPreview} alt="Post" /> : null}
        </div>
        <div className="comments-modal-content">
          <div className="comments-post-header">
            <img src={post.user?.image || post.userImage || ''} alt="" />
            <div>
              <strong>{post.username || post.user?.username || 'Username'}</strong>
              <span>{post.createdAt ? formatTime(post.createdAt) : ''}</span>
            </div>
          </div>
          {post.description ? <p className="comments-post-description">{post.description}</p> : null}
          <h2 id="comments-title">Comments</h2>
          {isLoading ? (
            <div className="comments-skeleton" aria-label="Loading comments">
              {[1, 2, 3, 4].map((item) => (
                <div className="comment-skeleton-item" key={item}>
                  <span className="skeleton-avatar" />
                  <div className="skeleton-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          ) : commentCount === 0 ? (
            <div className="comments-empty">
              <img src="/assets/logo_icons/no_comment.svg" alt="" />
              <h3>No comments</h3>
              <p>Be the first to share your thoughts and engage with the community!</p>
            </div>
          ) : (
            <div className="comments-list">
              {comments.map((item, index) => (
                <div className="comment-item" key={item._id || index}>
                  <img src={item.image || ''} alt="" />
                  <div>
                    <strong>{item.username || item.userName || 'Username'}</strong>
                    <p>{item.comment || item.description || item.text || ''} <span className="comment-time">{formatTime(item.createdAt)}</span></p>
                    <div className="comment-meta">
                      <button type="button" onClick={() => setReplyTarget({ _id: item._id || item.id, username: item.username || 'user' })}>Reply</button>
                      <span className="comment-divider">|</span>
                      <span>{item.likeCount || 0} Likes</span>
                    </div>
                    {item.commentReplies > 0 ? <button className="view-replies" type="button" onClick={() => handleViewReplies(item)}>View {item.commentReplies} Replies <img src="/assets/logo_icons/reply_icon.svg" alt="" /></button> : null}
                    {loadingReplies[item._id || item.id] ? (
                      <div className="reply-skeleton-list">
                        <span /><span /><span />
                      </div>
                    ) : null}
                    {expandedReplies[item._id || item.id] && item.replies?.map((reply) => (
                      <div className="comment-reply" key={reply._id || reply.id}>
                        <img src={reply.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
                        <div>
                          <div className="reply-author-row">
                            <strong>{reply.username || 'Username'}</strong>
                          </div>
                          <p>{reply.comment} <span className="comment-time">{formatTime(reply.createdAt)}</span></p>
                          <div className="comment-meta"><span>{reply.likeCount || 0} Likes</span></div>
                        </div>
                        <button className="comment-like-button" type="button" onClick={() => handleCommentLike(reply)} aria-label={reply.isLiked ? 'Unlike reply' : 'Like reply'}>
                          <img src={reply.isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'} alt="" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="comment-like-button" type="button" onClick={() => handleCommentLike(item)} aria-label={item.isLiked ? 'Unlike comment' : 'Like comment'}>
                    <img src={item.isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'} alt="" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="comments-input-wrap">
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={replyTarget ? `Reply to ${replyTarget.username}...` : 'Comment...'} />
            <button type="button" aria-label="Send comment" onClick={handleComment} disabled={isSubmitting}>➤</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function updateCommentTree(items, commentId, isLiked) {
  return items.map((item) => {
    if ((item._id || item.id) === commentId) {
      return { ...item, isLiked, likeCount: Math.max(0, (item.likeCount || 0) + (isLiked ? 1 : -1)) }
    }
    if (item.replies?.length) return { ...item, replies: updateCommentTree(item.replies, commentId, isLiked) }
    return item
  })
}

function getMediaPreview(post) {
  const url = post.thumbnail || post.media || post.image || ''
  if (!url) return ''

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')
    const videoId = hostname === 'youtu.be'
      ? parsed.pathname.split('/').filter(Boolean)[0]
      : hostname === 'youtube.com' || hostname === 'm.youtube.com'
        ? parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
        : ''

    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : url
  } catch {
    return url
  }
}
