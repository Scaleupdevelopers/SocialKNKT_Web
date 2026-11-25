import { useEffect, useRef, useState } from 'react'
import './CommentsModal.css'
import { commentPost, getCommentReplies, getComments, replyToComment, updateCommentLike } from '../../../action/action'
import { deleteComment, reportComment } from '../../../action/action'
import { toast } from 'react-toastify'
import { useProfile } from '../../../context/ProfileContext'
import { AUTH_STORAGE_KEY } from '../../../utils/helper'

export function CommentsModal({ post, onClose, onCommentCountChange, getCommentsAction = getComments, commentAction = commentPost, replyAction = replyToComment, repliesAction = getCommentReplies, commentReportAction, commentDeleteAction, commentLikeAction }) {
  const { profile } = useProfile()
  const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
  const currentUserId = profile?._id || profile?.id || profile?.userId || authData?.user?.id || authData?.data?.id
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(Array.isArray(post.comments) ? post.comments : [])
  const [commentsPage, setCommentsPage] = useState(0)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [loadingReplies, setLoadingReplies] = useState({})
  const [openMenuId, setOpenMenuId] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const commentCount = comments.length || post.commentCount || 0
  const mediaPreview = getMediaPreview(post)
  const showVideoPreview = isVideoPost(post) && !post.thumbnail && !post.videoThumbnail && !post.mediaThumbnail
  const commentsListRef = useRef(null)

  useEffect(() => {
    const postId = post._id || post.id
    if (!postId) return undefined

    setCommentsPage(0)
    setHasMoreComments(true)
    getCommentsAction(postId, 0)
      .then((response) => {
        const nextComments = response.data || []
        setComments(nextComments)
        setHasMoreComments(response.totalCount !== undefined ? nextComments.length < response.totalCount : nextComments.length >= 10)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))

    return undefined
  }, [post._id, post.id])

  const loadMoreComments = async () => {
    const postId = post._id || post.id
    if (!postId || isLoading || isLoadingMoreComments || !hasMoreComments) return
    const nextPage = commentsPage + 1
    setIsLoadingMoreComments(true)
    try {
      const response = await getCommentsAction(postId, nextPage)
      const nextComments = response.data || []
      setComments((current) => [...current, ...nextComments])
      setCommentsPage(nextPage)
      setHasMoreComments(response.totalCount !== undefined ? comments.length + nextComments.length < response.totalCount : nextComments.length >= 10)
    } finally {
      setIsLoadingMoreComments(false)
    }
  }

  const handleCommentsScroll = (event) => {
    const element = event.currentTarget
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 80) loadMoreComments()
  }

  const handleComment = async () => {
    const text = comment.trim()
    const postId = post._id || post.id
    if (!text || !postId || isSubmitting) return

    const tempId = `pending-${Date.now()}`
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
      onCommentCountChange?.(1)
    }
    setComment('')
    setReplyTarget(null)
    setIsSubmitting(true)
    try {
      const response = parentComment
        ? await replyAction(postId, parentComment._id, text)
        : await commentAction(postId, text)
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
      if (!parentComment) onCommentCountChange?.(-1)
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

    const likeRequest = commentLikeAction
      ? commentLikeAction(postId, commentId, nextLiked)
      : updateCommentLike(commentId, postId, nextLiked)
    likeRequest.catch(() => {
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
        const response = await repliesAction(commentId)
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

  const submitCommentReport = async (description) => {
    try {
      if (commentReportAction) await commentReportAction(post._id || post.id, reportTarget, description)
      else await reportComment(post._id || post.id, reportTarget, description)
      toast.success('Comment reported successfully.')
      setReportTarget(null)
    } catch (error) {
      toast.error(error.message || 'Unable to report comment.')
    }
  }

  const isOwnComment = (item) => Boolean(currentUserId && item.userId && String(item.userId) === String(currentUserId))

  const confirmDeleteComment = async () => {
    if (!deleteTarget || isDeleting) return
    setIsDeleting(true)
    try {
      if (commentDeleteAction) await commentDeleteAction(post._id || post.id, deleteTarget)
      else await deleteComment(post._id || post.id, deleteTarget)
      setComments((current) => removeCommentTree(current, deleteTarget))
      setDeleteTarget(null)
      toast.success('Comment deleted successfully.')
    } catch (error) {
      toast.error(error.message || 'Unable to delete comment.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="comments-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="comments-modal" role="dialog" aria-modal="true" aria-labelledby="comments-title" onClick={(event) => event.stopPropagation()}>
        <button className="comments-modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="comments-modal-media">
          {mediaPreview ? (showVideoPreview ? <video src={mediaPreview} controls playsInline preload="metadata" aria-label="Thread video preview" /> : <img src={mediaPreview} alt="Post" />) : null}
        </div>
        <div className="comments-modal-content">
          <div className="comments-post-header">
            <img src={post.user?.image || post.userImage || ''} alt="" />
            <div>
              <strong>{post.username || post.user?.username || 'Username'}</strong>
              <span>{post.createdAt ? formatTime(post.createdAt) : ''}</span>
            </div>
            {currentUserId && (post.userId || post.user?.id) === currentUserId ? <button className="comments-more-button" type="button" aria-label="Post options">⋮</button> : null}
          </div>
          {post.description ? <p className="comments-post-description">{isDescriptionExpanded || post.description.length <= 160 ? post.description : `${post.description.slice(0, 160).trimEnd()}...`} {post.description.length > 160 ? <button className="comments-description-more" type="button" onClick={() => setIsDescriptionExpanded((value) => !value)}>{isDescriptionExpanded ? 'Less' : 'More'}</button> : null}</p> : null}
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
            <div className="comments-list" ref={commentsListRef} onScroll={handleCommentsScroll}>
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
                      <button className="comment-meta-more" type="button" aria-label="Comment options" onClick={() => setOpenMenuId(openMenuId === (item._id || item.id) ? null : (item._id || item.id))}>•••</button>
                      {openMenuId === (item._id || item.id) ? <CommentMenu canDelete={isOwnComment(item)} onReport={() => { setReportTarget(item._id || item.id); setOpenMenuId(null) }} onDelete={() => { setDeleteTarget(item._id || item.id); setOpenMenuId(null) }} /> : null}
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
                          <div className="comment-meta"><span>{reply.likeCount || 0} Likes</span><button className="comment-meta-more" type="button" aria-label="Reply options" onClick={() => setOpenMenuId(openMenuId === (reply._id || reply.id) ? null : (reply._id || reply.id))}>•••</button>{openMenuId === (reply._id || reply.id) ? <CommentMenu canDelete={isOwnComment(reply)} onReport={() => { setReportTarget(reply._id || reply.id); setOpenMenuId(null) }} onDelete={() => { setDeleteTarget(reply._id || reply.id); setOpenMenuId(null) }} /> : null}</div>
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
              {isLoadingMoreComments ? <div className="comments-loading-more">Loading more comments...</div> : null}
            </div>
          )}
          <div className="comments-input-wrap">
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder={replyTarget ? `Reply to ${replyTarget.username}...` : 'Comment...'} />
            <button type="button" aria-label="Send comment" onClick={handleComment} disabled={isSubmitting}>➤</button>
          </div>
        </div>
      </section>
      {reportTarget ? <CommentReportModal onClose={() => setReportTarget(null)} onSubmit={submitCommentReport} /> : null}
      {deleteTarget ? <DeleteCommentModal onClose={() => setDeleteTarget(null)} onConfirm={confirmDeleteComment} isDeleting={isDeleting} /> : null}
    </div>
  )
}

function CommentMenu({ canDelete, onReport, onDelete }) {
  return <div className="comment-options-menu">{canDelete ? <button type="button" onClick={onDelete}><img src="/assets/logo_icons/red_delete_icon.svg" alt="" /><span>Delete Comment</span></button> : <button type="button" onClick={onReport}><img src="/assets/logo_icons/report.svg" alt="" /><span>Report</span></button>}</div>
}

function DeleteCommentModal({ onClose, onConfirm, isDeleting }) {
  return <div className="comment-report-backdrop" role="presentation" onClick={isDeleting ? undefined : onClose}><div className="comment-delete-modal" role="dialog" onClick={(event) => event.stopPropagation()}><button className="comment-report-close" type="button" onClick={onClose} disabled={isDeleting}>×</button><h2>Delete Comment</h2><p>Are you sure you want to delete this comment?</p><div className="comment-delete-actions"><button type="button" onClick={onClose} disabled={isDeleting}>No</button><button type="button" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</button></div></div></div>
}

function CommentReportModal({ onClose, onSubmit }) {
  const reasons = ['Spam or misleading content', 'Harassment or bullying', 'Hate speech or discrimination', 'Inappropriate or offensive content', 'Violence or dangerous content', 'Other']
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const handleSubmit = () => onSubmit(reason === 'Other' ? description.trim() || 'Other' : reason || 'Other')

  return <div className="comment-report-backdrop" role="presentation" onClick={onClose}><div className="comment-report-modal" role="dialog" onClick={(event) => event.stopPropagation()}><button className="comment-report-close" type="button" onClick={onClose}>×</button><h2>Report Comment</h2><p>Why are you reporting this Comment?</p><div className="comment-report-reasons">{reasons.map((item) => <label key={item}><input type="radio" name="comment-report-reason" checked={reason === item} onChange={() => setReason(item)} /><span>{item}</span></label>)}</div>{reason === 'Other' ? <textarea placeholder="Describe..." value={description} onChange={(event) => setDescription(event.target.value)} /> : null}<button className="comment-report-submit" type="button" onClick={handleSubmit}>Report</button></div></div>
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

function removeCommentTree(items, commentId) {
  return items.filter((item) => (item._id || item.id) !== commentId).map((item) => (
    item.replies?.length ? { ...item, replies: removeCommentTree(item.replies, commentId), commentReplies: item.replies.some((reply) => (reply._id || reply.id) === commentId) ? Math.max(0, (item.commentReplies || 1) - 1) : item.commentReplies } : item
  ))
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

function isVideoPost(post) {
  const mediaType = String(post.mediaType || '').toLowerCase().replace(/[-_\s]/g, '')
  const media = String(post.media || '').toLowerCase()
  return ['video', 'videolink', 'flicks', 'link'].includes(mediaType) || /\.(mp4|webm|ogg)(\?|$)/.test(media)
}
