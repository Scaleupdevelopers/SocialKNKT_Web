import { useCallback, useEffect, useRef, useState } from 'react'
import './CommentsModal.css'
import {
  commentPost,
  getCommentReplies,
  getComments,
  replyToComment,
  updateCommentLike,
} from '../../../action/action'
import { deleteComment, reportComment } from '../../../action/action'
import { toast } from 'react-toastify'
import { useProfile } from '../../../context/ProfileContext'
import { readAuth } from '../../../utils/helper'
import { LoadingSkeleton } from '../../common/RequestState'

export function CommentsModal(props) {
  const defaults = {
    getCommentsAction: getComments,
    commentAction: commentPost,
    replyAction: replyToComment,
    repliesAction: getCommentReplies,
    commentDeleteAction: deleteComment,
  }
  const actions = Object.fromEntries(
    Object.entries(defaults).map(([key, action]) => [key, props[key] ?? action]),
  )
  return <CommentsContent key={getId(props.post)} {...props} {...actions} />
}

function CommentsContent({
  post,
  postOwnerId,
  onClose,
  onCommentCountChange,
  getCommentsAction,
  commentAction,
  replyAction,
  repliesAction,
  commentReportAction,
  commentDeleteAction,
  commentLikeAction,
}) {
  const { profile } = useProfile()
  const authData = readAuth()
  const currentUserId = getId(profile) || getAuthUserId(authData)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(() => normalizeList(post.comments))
  const commentsPage = useRef(-1)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyTarget, setReplyTarget] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [replyPages, setReplyPages] = useState({})
  const [commentsError, setCommentsError] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const listBusy = useRef(false)
  const listRequest = useRef(null)
  const submitBusy = useRef(false)
  const deleteBusy = useRef(false)
  const likeRequests = useRef(new Set())
  const replyRequests = useRef(new Map())
  const mounted = useRef(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const postId = getId(post)
  const loadComments = useCallback(async () => {
    if (listBusy.current || !postId) return
    const nextPage = commentsPage.current + 1
    const request = {}
    listRequest.current = request
    const isCurrent = () => mounted.current && listRequest.current === request
    listBusy.current = true
    setIsLoading(nextPage === 0)
    setCommentsError(false)
    setIsLoadingMoreComments(true)
    try {
      const response = await getCommentsAction(postId, nextPage)
      if (!isCurrent()) return
      const nextComments = normalizeList(response.data)
      setComments((current) =>
        nextPage === 0 ? nextComments : mergeComments(current, nextComments),
      )
      commentsPage.current = nextPage
      setHasMoreComments(hasNextPage(response, nextPage))
    } catch {
      if (isCurrent()) setCommentsError(true)
    } finally {
      if (isCurrent()) {
        listBusy.current = false
        setIsLoading(false)
        setIsLoadingMoreComments(false)
      }
    }
  }, [getCommentsAction, postId])

  useEffect(() => {
    mounted.current = true
    loadComments()
    return () => {
      mounted.current = false
    }
  }, [loadComments])

  const handleCommentsScroll = (event) => {
    const element = event.currentTarget
    if (!hasMoreComments || commentsError) return
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 80) loadComments()
  }

  const handleComment = () => {
    const text = comment.trim()
    if (!text || !postId || submitBusy.current || isLoading || initialReadPending()) return
    submitBusy.current = true
    setSubmitError(false)

    const optimisticComment = makePendingComment(profile, authData, currentUserId, text)
    const parentComment = replyTarget
    setComments((current) => insertComment(current, parentComment, optimisticComment))
    if (parentComment)
      setExpandedReplies((current) => ({ ...current, [parentComment._id]: true }))
    setComment('')
    setReplyTarget(null)
    setIsSubmitting(true)
    persistComment(optimisticComment, parentComment)
  }

  const initialReadPending = () => commentsPage.current < 0 && listBusy.current

  const persistComment = async (optimisticComment, parentComment) => {
    const text = optimisticComment.comment
    const tempId = optimisticComment._id
    try {
      const response = parentComment
        ? await replyAction(postId, parentComment._id, text)
        : await commentAction(postId, text)
      if (!mounted.current) return
      const savedComment = savedServerComment(optimisticComment, response.data)
      setComments((current) => replaceComment(current, tempId, savedComment))
      if (!parentComment) onCommentCountChange?.(1)
    } catch {
      if (!mounted.current) return
      setComments((current) => removeCommentTree(current, tempId))
      setComment(text)
      setReplyTarget(parentComment)
      setSubmitError(true)
    } finally {
      submitBusy.current = false
      if (mounted.current) setIsSubmitting(false)
    }
  }

  const handleCommentLike = (item) => {
    const commentId = getId(item)
    if (!canLikeComment(item, postId) || likeRequests.current.has(commentId)) return
    likeRequests.current.add(commentId)

    const nextLiked = !item.isLiked
    setComments((current) => updateCommentTree(current, commentId, nextLiked))

    const likeRequest = commentLikeAction
      ? commentLikeAction(postId, commentId, nextLiked)
      : updateCommentLike(commentId, postId, nextLiked)
    likeRequest
      .catch(() => {
        if (!mounted.current) return
        setComments((current) => updateCommentTree(current, commentId, !nextLiked))
        toast.error('Unable to update like. Please try again.')
      })
      .finally(() => likeRequests.current.delete(commentId))
  }

  const loadReplies = async (item, reset = false) => {
    const commentId = getId(item)
    if (!commentId || replyRequests.current.has(commentId)) return
    const nextPage = nextReplyPage(replyPages[commentId], reset)
    const request = {}
    replyRequests.current.set(commentId, request)
    const isCurrent = () => mounted.current && replyRequests.current.get(commentId) === request
    setReplyPages((current) => ({
      ...current,
      [commentId]: {
        ...current[commentId],
        ...replyResetState(reset),
        loading: true,
        error: false,
      },
    }))
    try {
      const response = await repliesAction(commentId, nextPage)
      if (!isCurrent()) return
      setComments((current) => mergeReplies(current, commentId, normalizeList(response.data)))
      setReplyPages((current) => ({
        ...current,
        [commentId]: {
          page: nextPage,
          more: hasNextPage(response, nextPage),
          loading: false,
          error: false,
        },
      }))
    } catch {
      if (isCurrent())
        setReplyPages((current) => ({
          ...current,
          [commentId]: { ...current[commentId], loading: false, error: true },
        }))
    } finally {
      if (isCurrent()) replyRequests.current.delete(commentId)
    }
  }

  const handleViewReplies = (item) => {
    const commentId = item._id || item.id
    const expanded = !expandedReplies[commentId]
    setExpandedReplies((current) => ({ ...current, [commentId]: expanded }))
    if (expanded && !item.repliesLoaded) loadReplies(item)
  }

  const submitCommentReport = async (description) => {
    try {
      if (commentReportAction)
        await commentReportAction(post._id || post.id, reportTarget, description)
      else await reportComment(post._id || post.id, reportTarget, description)
      toast.success('Comment reported successfully.')
      setReportTarget(null)
    } catch {
      toast.error('Unable to report comment. Please try again.')
    }
  }

  const isPostOwner = Boolean(
    currentUserId && postOwnerId && String(postOwnerId) === String(currentUserId),
  )
  const isOwnComment = (item) =>
    Boolean(currentUserId && item.userId && String(item.userId) === String(currentUserId))

  const refreshAfterDelete = (deletedId) => {
    const parent = comments.find((item) =>
      item.replies?.some((reply) => getId(reply) === deletedId),
    )
    setComments((current) => removeCommentTree(current, deletedId))
    if (parent) {
      replyRequests.current.delete(getId(parent))
      setComments((current) => clearReplies(current, getId(parent)))
      loadReplies(parent, true)
      return
    }
    listRequest.current = null
    listBusy.current = false
    commentsPage.current = -1
    replyRequests.current.clear()
    setReplyPages({})
    setExpandedReplies({})
    loadComments()
  }

  const confirmDeleteComment = async () => {
    if (!deleteTarget || deleteBusy.current) return
    deleteBusy.current = true
    const isTopLevel = comments.some((item) => (item._id || item.id) === deleteTarget)
    setIsDeleting(true)
    try {
      await commentDeleteAction(postId, deleteTarget)
      if (!mounted.current) return
      refreshAfterDelete(deleteTarget)
      if (isTopLevel) onCommentCountChange?.(-1)
      setDeleteTarget(null)
      toast.success('Comment deleted successfully.')
    } catch {
      toast.error('Unable to delete comment. Please try again.')
    } finally {
      deleteBusy.current = false
      setIsDeleting(false)
    }
  }

  const rowActions = {
    currentUserId,
    openMenuId,
    setOpenMenuId,
    setReportTarget,
    setDeleteTarget,
    setReplyTarget,
    handleCommentLike,
    isOwnComment,
    isPostOwner,
  }
  const list = {
    comments,
    isLoading,
    commentsError,
    isLoadingMoreComments,
    hasMoreComments,
    loadComments,
    handleCommentsScroll,
    expandedReplies,
    replyPages,
    loadReplies,
    handleViewReplies,
    rowActions,
  }
  return (
    <CommentsView
      post={post}
      onClose={onClose}
      currentUserId={currentUserId}
      list={list}
      composer={{
        comment,
        setComment,
        replyTarget,
        isSubmitting,
        isLoading,
        handleComment,
        submitError,
      }}
      reportTarget={reportTarget}
      onCloseReport={() => setReportTarget(null)}
      onReport={submitCommentReport}
      deleteTarget={deleteTarget}
      onCloseDelete={() => setDeleteTarget(null)}
      onDelete={confirmDeleteComment}
      isDeleting={isDeleting}
    />
  )
}

function CommentsView({
  post,
  onClose,
  currentUserId,
  list,
  composer,
  reportTarget,
  onCloseReport,
  onReport,
  deleteTarget,
  onCloseDelete,
  onDelete,
  isDeleting,
}) {
  return (
    <div className="comments-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="comments-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="comments-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <CommentMedia post={post} />
        <div className="comments-modal-content">
          <CommentPostHeader post={post} currentUserId={currentUserId} />
          <h2 id="comments-title">Comments</h2>
          <CommentList {...list} />
          <CommentComposer {...composer} />
        </div>
      </section>
      {reportTarget && <CommentReportModal onClose={onCloseReport} onSubmit={onReport} />}
      {deleteTarget && (
        <DeleteCommentModal
          onClose={onCloseDelete}
          onConfirm={onDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}

function CommentMedia({ post }) {
  const preview = getMediaPreview(post)
  const video =
    isVideoPost(post) && !post.thumbnail && !post.videoThumbnail && !post.mediaThumbnail
  return (
    <div className="comments-modal-media">
      {preview &&
        (video ? (
          <video
            src={preview}
            controls
            playsInline
            preload="metadata"
            aria-label="Thread video preview"
          />
        ) : (
          <img src={preview} alt="Post" />
        ))}
    </div>
  )
}

function postAuthor(post) {
  return {
    image: post.user?.image || post.userImage || '',
    username: post.username || post.user?.username || 'Username',
    id: post.userId || post.user?.id,
  }
}

function CommentPostHeader({ post, currentUserId }) {
  const [expanded, setExpanded] = useState(false)
  const author = postAuthor(post)
  const ownsPost = Boolean(currentUserId && currentUserId === author.id)
  return (
    <>
      <div className="comments-post-header">
        <img src={author.image} alt="" />
        <div>
          <strong>{author.username}</strong>
          <span>{formatTime(post.createdAt)}</span>
        </div>
        {ownsPost && (
          <button className="comments-more-button" type="button" aria-label="Post options">
            ⋮
          </button>
        )}
      </div>
      <CommentDescription
        text={post.description}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
    </>
  )
}

function CommentDescription({ text, expanded, onToggle }) {
  if (!text) return null
  const description =
    expanded || text.length <= 160 ? text : `${text.slice(0, 160).trimEnd()}...`
  return (
    <p className="comments-post-description">
      {description}{' '}
      {text.length > 160 && (
        <button className="comments-description-more" type="button" onClick={onToggle}>
          {expanded ? 'Less' : 'More'}
        </button>
      )}
    </p>
  )
}

function CommentSkeleton() {
  return (
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
  )
}

function CommentList(list) {
  if (list.isLoading) return <CommentSkeleton />
  return (
    <>
      {list.commentsError && (
        <div className="comments-request-error" role="alert">
          Unable to load comments.{' '}
          <button type="button" onClick={list.loadComments}>
            Retry comments
          </button>
        </div>
      )}
      <CommentListBody list={list} />
    </>
  )
}

function CommentListBody({ list }) {
  if (list.comments.length === 0 && !list.commentsError) {
    return (
      <div className="comments-empty">
        <img src="/assets/logo_icons/no_comment.svg" alt="" />
        <h3>No comments</h3>
        <p>Be the first to share your thoughts and engage with the community!</p>
      </div>
    )
  }
  return (
    <div className="comments-list" onScroll={list.handleCommentsScroll}>
      {list.comments.map((item) => (
        <CommentRow key={getId(item)} item={item} list={list} />
      ))}
      {list.isLoadingMoreComments && <LoadingSkeleton label="Loading more comments..." />}
      {list.hasMoreComments && !list.commentsError && (
        <button
          className="comments-load-more"
          type="button"
          disabled={list.isLoadingMoreComments}
          onClick={list.loadComments}
        >
          Load more comments
        </button>
      )}
    </div>
  )
}

function CommentRow({ item, list }) {
  const id = getId(item)
  return (
    <div className="comment-item">
      <img src={item.image || ''} alt="" />
      <div>
        <strong>{item.username || item.userName || 'Username'}</strong>
        <p>
          {item.comment || item.description || item.text || ''}{' '}
          <span className="comment-time">{formatTime(item.createdAt)}</span>
        </p>
        <CommentControls item={item} actions={list.rowActions} />
        <Replies item={item} list={list} id={id} />
      </div>
      <CommentLike item={item} onLike={list.rowActions.handleCommentLike} />
    </div>
  )
}

function Replies({ item, list, id }) {
  return (
    <>
      {item.commentReplies > 0 && (
        <button
          className="view-replies"
          type="button"
          onClick={() => list.handleViewReplies(item)}
        >
          View {item.commentReplies} Replies{' '}
          <img src="/assets/logo_icons/reply_icon.svg" alt="" />
        </button>
      )}
      {list.expandedReplies[id] && (
        <>
          <ReplyPagination state={list.replyPages[id]} onLoad={() => list.loadReplies(item)} />
          {item.replies?.map((reply) => (
            <ReplyRow key={getId(reply)} reply={reply} actions={list.rowActions} />
          ))}
        </>
      )}
    </>
  )
}

function ReplyRow({ reply, actions }) {
  return (
    <div className="comment-reply">
      <img src={reply.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
      <div>
        <div className="reply-author-row">
          <strong>{reply.username || 'Username'}</strong>
        </div>
        <p>
          {reply.comment} <span className="comment-time">{formatTime(reply.createdAt)}</span>
        </p>
        <CommentControls item={reply} actions={actions} isReply />
      </div>
      <CommentLike item={reply} onLike={actions.handleCommentLike} isReply />
    </div>
  )
}

function CommentControls({ item, actions, isReply }) {
  const id = getId(item)
  const target = { _id: id, username: item.username || 'user' }
  return (
    <div className="comment-meta">
      {!isReply && (
        <>
          <button
            type="button"
            disabled={item.pending}
            onClick={() => actions.setReplyTarget(target)}
          >
            Reply
          </button>
          <span className="comment-divider">|</span>
        </>
      )}
      <span>{item.likeCount || 0} Likes</span>
      <button
        className="comment-meta-more"
        type="button"
        disabled={item.pending}
        aria-label={isReply ? 'Reply options' : 'Comment options'}
        onClick={() => actions.setOpenMenuId(actions.openMenuId === id ? null : id)}
      >
        •••
      </button>
      {actions.openMenuId === id && (
        <CommentMenu
          canDelete={actions.isPostOwner || actions.isOwnComment(item)}
          canReport={!actions.isOwnComment(item)}
          onReport={() => {
            actions.setReportTarget(id)
            actions.setOpenMenuId(null)
          }}
          onDelete={() => {
            actions.setDeleteTarget(id)
            actions.setOpenMenuId(null)
          }}
        />
      )}
    </div>
  )
}

function CommentLike({ item, onLike, isReply }) {
  const action = item.isLiked ? 'Unlike' : 'Like'
  const kind = isReply ? 'reply' : 'comment'
  return (
    <button
      className="comment-like-button"
      type="button"
      disabled={item.pending}
      onClick={() => onLike(item)}
      aria-label={`${action} ${kind}`}
    >
      <img
        src={item.isLiked ? '/assets/logo_icons/heartLike.svg' : '/assets/logo_icons/like.svg'}
        alt=""
      />
    </button>
  )
}

function CommentComposer({
  comment,
  setComment,
  replyTarget,
  isSubmitting,
  isLoading,
  handleComment,
  submitError,
}) {
  const disabled = isSubmitting || isLoading
  return (
    <>
      <div className="comments-input-wrap">
        <input
          aria-label="Comment"
          disabled={disabled}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={replyTarget ? `Reply to ${replyTarget.username}...` : 'Comment...'}
        />
        <button
          type="button"
          aria-label="Send comment"
          onClick={handleComment}
          disabled={disabled}
        >
          ➤
        </button>
      </div>
      {submitError && (
        <p className="comments-request-error" role="alert">
          Unable to send. Your draft is restored; try Send again.
        </p>
      )}
    </>
  )
}

function ReplyPagination({ state, onLoad }) {
  if (!state) return null
  if (state.loading) return <LoadingSkeleton label="Loading replies…" />
  if (state.error)
    return (
      <div className="comments-request-error" role="alert">
        Unable to load replies.{' '}
        <button type="button" onClick={onLoad}>
          Retry replies
        </button>
      </div>
    )
  if (state.more)
    return (
      <button className="comments-load-more" type="button" onClick={onLoad}>
        Load more replies
      </button>
    )
  return null
}

function normalizeList(items) {
  if (!Array.isArray(items)) return []
  return items.map((item) => ({ ...item, _id: item.id || item._id }))
}

function nextReplyPage(state, reset) {
  return reset ? 0 : (state?.page ?? -1) + 1
}

function replyResetState(reset) {
  return reset ? { page: -1, more: true } : {}
}

function clearReplies(items, commentId) {
  return items.map((item) =>
    getId(item) === commentId ? { ...item, replies: [], repliesLoaded: false } : item,
  )
}

function getId(item) {
  return item?._id || item?.id || item?.userId
}

function getAuthUserId(authData) {
  return authData?.user?.id || authData?.data?.id
}

function canLikeComment(item, postId) {
  return Boolean(postId && getId(item) && !item.pending)
}

function makePendingComment(profile, authData, userId, text) {
  const currentUser = profile || authData?.user || authData?.data || {}
  return {
    _id: `pending-${Date.now()}`,
    comment: text,
    username: currentUser.username || 'You',
    image: currentUser.image || '/assets/logo_icons/profile_alt.avif',
    userId,
    pending: true,
  }
}

function savedServerComment(optimistic, data) {
  const serverId = data?.id || data?._id
  if (!serverId) throw new Error('Missing saved comment identifier')
  return { ...optimistic, ...data, _id: serverId, id: serverId, pending: false }
}

function mergeComments(current, incoming) {
  return [
    ...new Map([...current, ...incoming].map((item) => [item._id || item.id, item])).values(),
  ]
}

function mergeReplies(items, commentId, incoming) {
  return items.map((item) => {
    if ((item._id || item.id) !== commentId) return item
    return {
      ...item,
      replies: mergeComments(item.replies || [], incoming),
      repliesLoaded: true,
    }
  })
}

function hasNextPage(response, page) {
  const length = response.data?.length || 0
  if (response.totalCount === undefined) return length >= 10
  return length > 0 && page * 10 + length < Number(response.totalCount)
}

function insertComment(items, parent, comment) {
  if (!parent) return [comment, ...items]
  return items.map((item) => {
    if ((item._id || item.id) !== parent._id) return item
    return {
      ...item,
      commentReplies: (item.commentReplies || 0) + 1,
      replies: [...(item.replies || []), comment],
    }
  })
}

function replaceComment(items, tempId, saved) {
  return items.map((item) => {
    if ((item._id || item.id) === tempId) return saved
    if (item.replies) return { ...item, replies: replaceComment(item.replies, tempId, saved) }
    return item
  })
}

function CommentMenu({ canDelete, canReport, onReport, onDelete }) {
  return (
    <div className="comment-options-menu">
      {canDelete && (
        <button type="button" onClick={onDelete}>
          <img src="/assets/logo_icons/red_delete_icon.svg" alt="" />
          <span>Delete Comment</span>
        </button>
      )}
      {canReport && (
        <button type="button" onClick={onReport}>
          <img src="/assets/logo_icons/report.svg" alt="" />
          <span>Report</span>
        </button>
      )}
    </div>
  )
}

function DeleteCommentModal({ onClose, onConfirm, isDeleting }) {
  return (
    <div
      className="comment-report-backdrop"
      role="presentation"
      onClick={isDeleting ? undefined : onClose}
    >
      <div
        className="comment-delete-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="comment-report-close"
          type="button"
          onClick={onClose}
          disabled={isDeleting}
        >
          ×
        </button>
        <h2>Delete Comment</h2>
        <p>Are you sure you want to delete this comment?</p>
        <div className="comment-delete-actions">
          <button type="button" onClick={onClose} disabled={isDeleting}>
            No
          </button>
          <button type="button" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentReportModal({ onClose, onSubmit }) {
  const reasons = [
    'Spam or misleading content',
    'Harassment or bullying',
    'Hate speech or discrimination',
    'Inappropriate or offensive content',
    'Violence or dangerous content',
    'Other',
  ]
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const handleSubmit = () =>
    onSubmit(reason === 'Other' ? description.trim() || 'Other' : reason || 'Other')

  return (
    <div className="comment-report-backdrop" role="presentation" onClick={onClose}>
      <div
        className="comment-report-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="comment-report-close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>Report Comment</h2>
        <p>Why are you reporting this Comment?</p>
        <div className="comment-report-reasons">
          {reasons.map((item) => (
            <label key={item}>
              <input
                type="radio"
                name="comment-report-reason"
                checked={reason === item}
                onChange={() => setReason(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        {reason === 'Other' ? (
          <textarea
            placeholder="Describe..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        ) : null}
        <button className="comment-report-submit" type="button" onClick={handleSubmit}>
          Report
        </button>
      </div>
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
      return {
        ...item,
        isLiked,
        likeCount: Math.max(0, (item.likeCount || 0) + (isLiked ? 1 : -1)),
      }
    }
    if (item.replies?.length)
      return { ...item, replies: updateCommentTree(item.replies, commentId, isLiked) }
    return item
  })
}

function removeCommentTree(items, commentId) {
  return items
    .filter((item) => (item._id || item.id) !== commentId)
    .map((item) =>
      item.replies?.length
        ? {
            ...item,
            replies: removeCommentTree(item.replies, commentId),
            commentReplies: item.replies.some((reply) => (reply._id || reply.id) === commentId)
              ? Math.max(0, (item.commentReplies || 1) - 1)
              : item.commentReplies,
          }
        : item,
    )
}

function getMediaPreview(post) {
  const url = post.thumbnail || post.media || post.image || ''
  if (!url) return ''

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')
    const videoId = youtubeId(parsed, hostname)

    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : url
  } catch {
    return url
  }
}

function youtubeId(parsed, hostname) {
  if (hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0]
  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop()
  }
  return ''
}

function isVideoPost(post) {
  const mediaType = String(post.mediaType || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '')
  const media = String(post.media || '').toLowerCase()
  return (
    ['video', 'videolink', 'flicks', 'link'].includes(mediaType) ||
    /\.(mp4|webm|ogg)(\?|$)/.test(media)
  )
}
