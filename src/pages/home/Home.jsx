import { useEffect, useRef, useState } from 'react'
import { AskShareModal } from '../../components/modals/AskShareModal/AskShareModal'
import { createPost, getFlicks, getPosts, uploadFile, getPost } from '../../action/action'
import { createPdfThumbnail } from '../../utils/pdfThumbnail'
import { toast } from 'react-toastify'
import { Header } from '../../layouts/Header'
import { FlicksSection } from './components/FlicksSection'
import { PostCard } from './components/PostCard'
import { ProfileCard } from './components/ProfileCard'
import { SidebarMenu } from './components/SidebarMenu'
import './Home.css'
import { useProfile } from '../../context/ProfileContext'
import { Link, useSearchParams } from 'react-router-dom'
import { mergeResults } from '../../utils/helper'

const FEED_PAGE_SIZE = 10

const postIdentity = (post) => post._id || post.id || post

const professionalIcon = '/assets/logo_icons/Professional.svg'
const connectionIcon = '/assets/logo_icons/connection.svg'
const dropdownIcon = '/assets/logo_icons/postadddropdown.svg'

async function uploadComposerMedia(file, link) {
  if (link.trim()) {
    return { media: link.trim(), thumbnail: link.trim() }
  }
  if (!file) return {}

  const media = await uploadFile(file)
  const extension = file.name.split('.').pop().toLowerCase()
  if (file.type !== 'application/pdf' && extension !== 'pdf') return { media }

  const thumbnailBlob = await createPdfThumbnail(file)
  const thumbnail = await uploadFile(thumbnailBlob, 'png', 'image/png')
  return { media, thumbnail }
}

function composerMediaType(file, link, videoType) {
  if (link.trim()) return 'link'
  if (!file) return undefined
  if (file.type.startsWith('video/')) return videoType
  return file.type.startsWith('image/') ? 'image' : 'document'
}

const addOptions = [
  ['post_card_img.svg', 'Add a photo'],
  ['post_card_chat.svg', 'Create KNKT(n) Thread'],
  ['post_card_video.svg', 'Add flicks'],
  ['post_card_video.svg', 'Add a video'],
  ['post_card_video_link.svg', 'Add Video Link'],
  ['post_card_doc.svg', 'Add a document'],
]

function PostSkeleton() {
  return (
    <article className="feed-post feed-post-skeleton" aria-label="Loading post">
      <div className="post-skeleton-author">
        <span className="post-skeleton-avatar" />

        <div className="post-skeleton-author-copy">
          <span className="post-skeleton-line post-skeleton-name" />
          <span className="post-skeleton-line post-skeleton-meta" />
        </div>
      </div>

      <span className="post-skeleton-line post-skeleton-content" />
      <span className="post-skeleton-media" />

      <div className="post-skeleton-actions">
        <span className="post-skeleton-action" />
        <span className="post-skeleton-action" />
        <span className="post-skeleton-action" />
      </div>
    </article>
  )
}

function EmptyFeedState() {
  return (
    <div className="empty-feed-state">
      <img src="/assets/logo_icons/noposticon.svg" alt="" />
      <h2>Explore and Connect</h2>
      <p>
        Looks like you've just joined KNKT. Connect with people
        <br />
        whose content you find intriguing.
      </p>
    </div>
  )
}

export function Home() {
  const [searchParams] = useSearchParams()
  const postId = searchParams.get('postId')
  const [feedError, setFeedError] = useState(false)
  const [retry, setRetry] = useState(0)
  const feedRequest = useRef(0)
  const moreRequest = useRef(null)
  const [feedPosts, setFeedPosts] = useState([])
  const [isLoadingFeed, setIsLoadingFeed] = useState(true)
  const [feedPage, setFeedPage] = useState(0)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false)
  const [flicks, setFlicks] = useState([])
  const [isLoadingFlicks, setIsLoadingFlicks] = useState(true)
  const feedEndRef = useRef(null)

  useEffect(() => {
    const requestId = ++feedRequest.current
    let active = true
    const isCurrent = () => active && requestId === feedRequest.current
    moreRequest.current = null
    setIsLoadingMoreFeed(false)
    setIsLoadingFeed(true)
    setFeedError(false)
    setFeedPosts([])
    const loadProfileMedia = async () => {
      try {
        const response =
          postId !== null ? await getPost(postId) : await getPosts(0, FEED_PAGE_SIZE)
        if (!isCurrent()) return
        const posts = postId !== null ? [response.data] : response.data || []

        setFeedPosts(mergeResults([], posts, postIdentity))
        setFeedPage(0)
        setHasMoreFeed(postId === null && posts.length >= FEED_PAGE_SIZE)
      } catch {
        if (isCurrent()) setFeedError(true)
      } finally {
        if (isCurrent()) setIsLoadingFeed(false)
      }
    }

    loadProfileMedia()
    return () => {
      active = false
      feedRequest.current++
    }
  }, [postId, retry])

  const canLoadMore = postId === null && !isLoadingFeed && !isLoadingMoreFeed && hasMoreFeed
  useEffect(() => {
    const loadMoreFeed = async () => {
      if (!canLoadMore || moreRequest.current) return
      const request = {}
      moreRequest.current = request
      const requestId = feedRequest.current
      const isCurrent = () =>
        requestId === feedRequest.current && moreRequest.current === request
      setIsLoadingMoreFeed(true)

      try {
        const nextPage = feedPage + 1
        const response = await getPosts(nextPage, FEED_PAGE_SIZE)
        if (!isCurrent()) return
        const nextPosts = response.data || []

        setFeedPosts((currentPosts) => mergeResults(currentPosts, nextPosts, postIdentity))
        setFeedPage(nextPage)
        setHasMoreFeed(nextPosts.length >= FEED_PAGE_SIZE)
      } catch {
        if (isCurrent()) toast.error('Unable to load more posts. Please try again.')
      } finally {
        if (isCurrent()) {
          moreRequest.current = null
          setIsLoadingMoreFeed(false)
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreFeed()
        }
      },
      { rootMargin: '280px' },
    )

    if (feedEndRef.current) {
      observer.observe(feedEndRef.current)
    }

    return () => observer.disconnect()
  }, [canLoadMore, feedPage])

  const handleDeleted = (deletedId) => {
    feedRequest.current++
    moreRequest.current = null
    setIsLoadingMoreFeed(false)
    setFeedPosts((posts) => posts.filter((post) => (post._id || post.id) !== deletedId))
    if (postId !== null) return
    setIsLoadingFeed(true)
    setFeedPage(0)
    setHasMoreFeed(false)
    setRetry((value) => value + 1)
  }

  useEffect(() => {
    const loadFlicks = async () => {
      try {
        const response = await getFlicks(0)
        setFlicks(response.data || [])
      } catch (error) {
        toast.error(error.message || 'Unable to load flicks.')
      } finally {
        setIsLoadingFlicks(false)
      }
    }

    loadFlicks()
  }, [])

  return (
    <main className="home-page">
      <Header />

      <div className="home-layout">
        <aside className="home-left-column">
          <ProfileCard />
          <SidebarMenu />
        </aside>

        <section className="home-feed" aria-label="Home feed">
          {postId === null ? <CreatePost /> : <Link to="/home">Back to feed</Link>}
          <div className="feed-posts">
            <FeedPosts
              loading={isLoadingFeed}
              error={feedError}
              posts={feedPosts}
              onRetry={() => setRetry((value) => value + 1)}
              onDeleted={handleDeleted}
            />
            <div ref={feedEndRef} className="feed-end-marker" aria-hidden="true" />
            {isLoadingMoreFeed && <PostSkeleton />}
          </div>

          {postId === null && flicks.length > 0 && (
            <FlicksSection flicks={flicks} isLoading={isLoadingFlicks} />
          )}
        </section>
      </div>
    </main>
  )
}

function FeedPosts({ loading, error, posts, onRetry, onDeleted }) {
  return (
    <>
      {loading && <PostSkeleton />}
      {error && (
        <div role="alert">
          Unable to load this post or feed. It may no longer be available.{' '}
          <button onClick={onRetry}>Retry</button>
        </div>
      )}
      {!loading && !error && posts.length === 0 && <EmptyFeedState />}
      {!loading && posts.map((post) => (
        <PostCard key={post._id || post.id} post={post} onDeleted={onDeleted} />
      ))}
    </>
  )
}

export function CreatePost() {
  const { profile, isLoading } = useProfile()
  const [profileType, setProfileType] = useState('Professional')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isAskShareOpen, setIsAskShareOpen] = useState(false)
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [postText, setPostText] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [videoType, setVideoType] = useState('video')
  const [videoLink, setVideoLink] = useState('')
  const [isVideoLinkModalOpen, setIsVideoLinkModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const editorRef = useRef(null)
  const createPostRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const flickInputRef = useRef(null)
  const documentInputRef = useRef(null)

  const handlePost = async (linkOverride = videoLink) => {
    if (isSubmitting) return
    const link = typeof linkOverride === 'string' ? linkOverride : ''
    setIsSubmitting(true)
    try {
      const payload = {
        postType: profileType === 'Professional' ? 1 : profileType === 'Personal' ? 2 : 3,
        description: postText,
        mediaType: composerMediaType(selectedFile, link, videoType),
      }
      Object.assign(payload, await uploadComposerMedia(selectedFile, link))
      await createPost(payload)
      toast.success('Post created successfully.')
      window.location.reload()
    } catch (error) {
      toast.error(error.message || 'Unable to create post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (createPostRef.current?.contains(event.target)) {
        return
      }

      setIsProfileMenuOpen(false)
      setIsAddMenuOpen(false)

      if (!postText.trim()) {
        setIsEditorFocused(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [postText])

  function renderComposerUser() {
    return (
      <div className="feed-user-row">
        <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
        <div>
          <h2>
            {isLoading ? (
              <span className="profile-skeleton-line profile-skeleton-create-name" />
            ) : (
              profile?.fullName
            )}
          </h2>
          <ProfileTypeSelector
            value={profileType}
            isOpen={isProfileMenuOpen}
            onToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            onSelect={(type) => {
              setProfileType(type)
              setIsProfileMenuOpen(false)
            }}
          />
        </div>
      </div>
    )
  }

  function renderVideoLink() {
    return (
      <>
        {isVideoLinkModalOpen && (
          <div
            className="video-link-modal-backdrop"
            role="presentation"
            onClick={() => setIsVideoLinkModalOpen(false)}
          >
            <div
              className="video-link-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="video-link-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="video-link-modal-close"
                type="button"
                onClick={() => setIsVideoLinkModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 id="video-link-title">Add Video Link</h2>
              <p>Paste a YouTube or video link to add it to your post.</p>
              <input
                autoFocus
                value={videoLink}
                onChange={(event) => setVideoLink(event.target.value)}
                placeholder="Enter video link"
              />
              <div className="video-link-modal-actions">
                <button type="button" onClick={() => setIsVideoLinkModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handlePost(videoLink)}
                  disabled={!videoLink.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Posting...' : 'Add Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <section ref={createPostRef} className="create-post">
      {renderComposerUser()}
      <div className="post-editor">
        <textarea
          ref={editorRef}
          placeholder={isEditorFocused ? '' : 'What new with you?'}
          aria-label="Post content"
          value={postText}
          onChange={(event) => setPostText(event.target.value)}
          onFocus={() => setIsEditorFocused(true)}
        />
        {!isEditorFocused && (
          <button
            className="post-editor-edit"
            type="button"
            aria-label="Edit post"
            onClick={() => {
              setIsEditorFocused(true)
              editorRef.current?.focus()
            }}
          >
            <img src="/assets/logo_icons/editPost.svg" alt="" />
          </button>
        )}
      </div>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
      />
      <input
        ref={videoInputRef}
        aria-label="Choose video"
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setSelectedFile(file)
          setVideoType('video')
          setVideoLink('')
        }}
      />
      <input
        ref={flickInputRef}
        aria-label="Choose flick"
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setSelectedFile(file)
          setVideoType('flicks')
          setVideoLink('')
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        hidden
        onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
      />
      <div className="create-post-actions">
        <div className="home-add-wrapper">
          <button type="button" onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}>
            Add
            <img className="post-add-dropdown" src={dropdownIcon} alt="" />
          </button>
          {isAddMenuOpen && (
            <AddContentMenu
              showDocument={profileType !== 'Personal'}
              onCreateThread={() => {
                setIsAddMenuOpen(false)
                setIsAskShareOpen(true)
              }}
              onPhoto={() => photoInputRef.current?.click()}
              onVideo={() => videoInputRef.current?.click()}
              onFlick={() => flickInputRef.current?.click()}
              onDocument={() => {
                setIsAddMenuOpen(false)
                documentInputRef.current?.click()
              }}
              onVideoLink={() => {
                setIsVideoLinkModalOpen(true)
                setIsAddMenuOpen(false)
              }}
            />
          )}
        </div>
        <button
          className="post-button"
          type="button"
          onClick={() => handlePost()}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          <img src="/assets/logo_icons/Send.svg" alt="" />
          {isSubmitting && <span className="post-submit-spinner" />}
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
      {isAskShareOpen && <AskShareModal onClose={() => setIsAskShareOpen(false)} />}
      {renderVideoLink()}
    </section>
  )
}

function ProfileTypeSelector({ value, isOpen, onToggle, onSelect }) {
  return (
    <div className="home-profile-selector">
      <button type="button" onClick={onToggle}>
        <img src={value === 'Professional' ? professionalIcon : connectionIcon} alt="" />
        {value}
        <img className="post-add-dropdown" src={dropdownIcon} alt="" />
      </button>
      {isOpen && (
        <div className="home-profile-menu">
          {['Both', 'Personal', 'Professional'].map((type) => (
            <button type="button" key={type} onClick={() => onSelect(type)}>
              <img src={type === 'Professional' ? professionalIcon : connectionIcon} alt="" />
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AddContentMenu({
  onCreateThread,
  onPhoto,
  onVideo,
  onFlick,
  onVideoLink,
  onDocument,
  showDocument,
}) {
  const actions = {
    'Create KNKT(n) Thread': onCreateThread,
    'Add a photo': onPhoto,
    'Add a video': onVideo,
    'Add flicks': onFlick,
    'Add Video Link': onVideoLink,
    'Add a document': onDocument,
  }
  return (
    <div className="home-add-menu">
      {addOptions
        .filter(([, label]) => label !== 'Add a document' || showDocument)
        .map(([icon, label]) => (
          <button type="button" key={label} onClick={actions[label]}>
            <img src={`/assets/logo_icons/${icon}`} alt="" />
            {label}
          </button>
        ))}
    </div>
  )
}
