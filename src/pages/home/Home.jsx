import { useEffect, useRef, useState } from 'react'
import { AskShareModal } from '../../components/modals/AskShareModal/AskShareModal'
import { createPost, getFlicks, getPosts, getUploadUrl } from '../../action/action'
import { createPdfThumbnail } from '../../utils/pdfThumbnail'
import { toast } from 'react-toastify'
import { Header } from '../../layouts/Header'
import { FlicksSection } from './components/FlicksSection'
import { PostCard } from './components/PostCard'
import { ProfileCard } from './components/ProfileCard'
import { SidebarMenu } from './components/SidebarMenu'
import './Home.css'
import { useProfile } from '../../context/ProfileContext'

const FEED_PAGE_SIZE = 10

const professionalIcon = '/assets/logo_icons/Professional.svg'
const connectionIcon = '/assets/logo_icons/connection.svg'
const dropdownIcon = '/assets/logo_icons/postadddropdown.svg'


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
      <p>Looks like you've just joined KNKT. Connect with people<br />whose content you find intriguing.</p>
    </div>
  )
}

export function Home() {
  const [feedPosts, setFeedPosts] = useState([])
  const [isLoadingFeed, setIsLoadingFeed] = useState(true)
  const [feedPage, setFeedPage] = useState(0)
  const [hasMoreFeed, setHasMoreFeed] = useState(true)
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false)
  const [flicks, setFlicks] = useState([])
  const [isLoadingFlicks, setIsLoadingFlicks] = useState(true)
  const feedEndRef = useRef(null)

  useEffect(() => {
    const loadProfileMedia = async () => {
      try {
        const response = await getPosts(0, FEED_PAGE_SIZE)
        const posts = response.data || []

        setFeedPosts(posts)
        setFeedPage(0)
        setHasMoreFeed(posts.length >= FEED_PAGE_SIZE)
      } catch (error) {
        toast.error(error.message || 'Unable to load posts.')
      } finally {
        setIsLoadingFeed(false)
      }
    }

    loadProfileMedia()
  }, [])

  useEffect(() => {
    const loadMoreFeed = async () => {
      if (isLoadingFeed || isLoadingMoreFeed || !hasMoreFeed) {
        return
      }

      setIsLoadingMoreFeed(true)

      try {
        const nextPage = feedPage + 1
        const response = await getPosts(nextPage, FEED_PAGE_SIZE)
        const nextPosts = response.data || []

        setFeedPosts((currentPosts) => [...currentPosts, ...nextPosts])
        setFeedPage(nextPage)
        setHasMoreFeed(nextPosts.length >= FEED_PAGE_SIZE)
      } catch (error) {
        toast.error(error.message || 'Unable to load more posts.')
      } finally {
        setIsLoadingMoreFeed(false)
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
  }, [feedPage, hasMoreFeed, isLoadingFeed, isLoadingMoreFeed])

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
          <CreatePost />
          <div className="feed-posts">
            {isLoadingFeed && <PostSkeleton />}
            {!isLoadingFeed && feedPosts.length === 0 && <EmptyFeedState />}
            {!isLoadingFeed && feedPosts.map((post) => (
              <PostCard
              key={post._id || post.id}
                post={post}
                onDeleted={(postId) => setFeedPosts((currentPosts) => currentPosts.filter((item) => (item._id || item.id) !== postId))}
              />
            ))}
            <div ref={feedEndRef} className="feed-end-marker" aria-hidden="true" />
            {isLoadingMoreFeed && <PostSkeleton />}
          </div>

          {flicks.length > 0 && (
            <FlicksSection
              flicks={flicks}
              isLoading={isLoadingFlicks}
            />
          )}
        </section>

      </div>
    </main>
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
  const [videoLink, setVideoLink] = useState('')
  const [isVideoLinkModalOpen, setIsVideoLinkModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const editorRef = useRef(null)
  const createPostRef = useRef(null)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const documentInputRef = useRef(null)

  const handlePost = async (linkOverride = videoLink) => {
    if (isSubmitting) return
    const link = typeof linkOverride === 'string' ? linkOverride : ''
    setIsSubmitting(true)
    try {
      const payload = {
        postType: profileType === 'Professional' ? 1 : profileType === 'Personal' ? 2 : 3,
        description: postText,
        mediaType: link.trim() ? 'videolink' : selectedFile?.type?.startsWith('video/') ? 'video' : selectedFile?.type?.startsWith('image/') ? 'image' : selectedFile ? 'document' : undefined,
      }
      if (link.trim()) {
        payload.media = link.trim()
        payload.thumbnail = link.trim()
      } else if (selectedFile) {
        const ext = selectedFile.name.split('.').pop().toLowerCase()
        const signedUrl = await getUploadUrl(ext)
        const upload = await fetch(signedUrl.data, { method: 'PUT', headers: { 'Content-Type': selectedFile.type || 'application/octet-stream' }, body: selectedFile })
        if (!upload.ok) throw new Error('Unable to upload media.')
        payload.media = signedUrl.data.split('?')[0]
        if (selectedFile.type === 'application/pdf' || ext === 'pdf') {
          const thumbnailBlob = await createPdfThumbnail(selectedFile)
          const thumbnailUrl = await getUploadUrl('png')
          const thumbnailUpload = await fetch(thumbnailUrl.data, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/png' },
            body: thumbnailBlob,
          })
          if (!thumbnailUpload.ok) throw new Error('Unable to upload document preview.')
          payload.thumbnail = thumbnailUrl.data.split('?')[0]
        }
      }
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

  return (
    <section ref={createPostRef} className="create-post">
      <div className="feed-user-row">
        <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
        <div>
          <h2>{isLoading ? <span className="profile-skeleton-line profile-skeleton-create-name" /> : profile?.fullName}</h2>
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
      <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
      <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" hidden onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
      <div className="create-post-actions">
        <div className="home-add-wrapper">
          <button
            type="button"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
          >
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
              onDocument={() => { setIsAddMenuOpen(false); documentInputRef.current?.click() }}
              onVideoLink={() => { setIsVideoLinkModalOpen(true); setIsAddMenuOpen(false) }}
            />
          )}
        </div>
        <button className="post-button" type="button" onClick={() => handlePost()} disabled={isSubmitting} aria-busy={isSubmitting}>
          <img src="/assets/logo_icons/Send.svg" alt="" />
          {isSubmitting && <span className="post-submit-spinner" />}
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
      {isAskShareOpen && <AskShareModal onClose={() => setIsAskShareOpen(false)} />}
      {isVideoLinkModalOpen && (
        <div className="video-link-modal-backdrop" role="presentation" onClick={() => setIsVideoLinkModalOpen(false)}>
          <div className="video-link-modal" role="dialog" aria-modal="true" aria-labelledby="video-link-title" onClick={(event) => event.stopPropagation()}>
            <button className="video-link-modal-close" type="button" onClick={() => setIsVideoLinkModalOpen(false)} aria-label="Close">×</button>
            <h2 id="video-link-title">Add Video Link</h2>
            <p>Paste a YouTube or video link to add it to your post.</p>
            <input autoFocus value={videoLink} onChange={(event) => setVideoLink(event.target.value)} placeholder="Enter video link" />
            <div className="video-link-modal-actions">
              <button type="button" onClick={() => setIsVideoLinkModalOpen(false)}>Cancel</button>
              <button type="button" onClick={() => handlePost(videoLink)} disabled={!videoLink.trim() || isSubmitting}>{isSubmitting ? 'Posting...' : 'Add Link'}</button>
            </div>
          </div>
        </div>
      )}
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

function AddContentMenu({ onCreateThread, onPhoto, onVideo, onVideoLink, onDocument, showDocument }) {
  return (
    <div className="home-add-menu">
      {addOptions.filter(([, label]) => label !== 'Add a document' || showDocument).map(([icon, label]) => (
        <button
          type="button"
          key={label}
          onClick={label === 'Create KNKT(n) Thread' ? onCreateThread : label === 'Add a photo' ? onPhoto : label === 'Add a video' || label === 'Add flicks' ? onVideo : label === 'Add Video Link' ? onVideoLink : label === 'Add a document' ? onDocument : undefined}
        >
          <img src={`/assets/logo_icons/${icon}`} alt="" />
          {label}
        </button>
      ))}
    </div>
  )
}


