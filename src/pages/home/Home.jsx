import { useEffect, useRef, useState } from 'react'
import { AskShareModal } from '../../components/modals/AskShareModal/AskShareModal'
import { getFlicks, getProfileMedia } from '../../action/action'
import { toast } from 'react-toastify'
import { Header } from '../../layouts/Header'
import { FlicksSection } from './components/FlicksSection'
import { PostCard } from './components/PostCard'
import { ProfileCard } from './components/ProfileCard'
import { SidebarMenu } from './components/SidebarMenu'
import './Home.css'

const FEED_PAGE_SIZE = 10

const profileIcon = '/assets/logo_icons/profile_avatar.png'
const professionalIcon = '/assets/logo_icons/Professional.svg'
const connectionIcon = '/assets/logo_icons/connection.svg'
const dropdownIcon = '/assets/logo_icons/postadddropdown.svg'


const addOptions = [
  ['post_card_img.svg', 'Add a photo'],
  ['post_card_chat.svg', 'Create KNKT(n) Thread'],
  ['post_card_video.svg', 'Add flicks'],
  ['post_card_video.svg', 'Take a video'],
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
        const response = await getProfileMedia(0, FEED_PAGE_SIZE)
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
        const response = await getProfileMedia(nextPage, FEED_PAGE_SIZE)
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
            {!isLoadingFeed && feedPosts.length === 0 && (
              <p className="feed-status">No posts available yet.</p>
            )}
            {!isLoadingFeed && feedPosts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
            <div ref={feedEndRef} className="feed-end-marker" aria-hidden="true" />
            {isLoadingMoreFeed && <PostSkeleton />}
          </div>

          <FlicksSection
            flicks={flicks}
            isLoading={isLoadingFlicks}
          />
        </section>

      </div>
    </main>
  )
}

export function CreatePost() {
  const [profileType, setProfileType] = useState('Professional')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isAskShareOpen, setIsAskShareOpen] = useState(false)
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [postText, setPostText] = useState('')
  const editorRef = useRef(null)
  const createPostRef = useRef(null)

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
        <img src={profileIcon} alt="Dianne Russell" />
        <div>
          <h2>Dianne Russell</h2>
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
              onCreateThread={() => {
                setIsAddMenuOpen(false)
                setIsAskShareOpen(true)
              }}
            />
          )}
        </div>
        <button className="post-button" type="button">
          <img src="/assets/logo_icons/Send.svg" alt="" />
          Post
        </button>
      </div>
      {isAskShareOpen && <AskShareModal onClose={() => setIsAskShareOpen(false)} />}
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

function AddContentMenu({ onCreateThread }) {
  return (
    <div className="home-add-menu">
      {addOptions.map(([icon, label]) => (
        <button
          type="button"
          key={label}
          onClick={label === 'Create KNKT(n) Thread' ? onCreateThread : undefined}
        >
          <img src={`/assets/logo_icons/${icon}`} alt="" />
          {label}
        </button>
      ))}
    </div>
  )
}


