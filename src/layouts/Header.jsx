import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AskShareModal } from '../components/modals/AskShareModal/AskShareModal'
import { AUTH_STORAGE_KEY } from '../utils/helper'
import './Header.css'
import { useProfile } from '../context/ProfileContext'
import {
  createPost,
  uploadFile,
  getConnectionCount,
  getNotificationCount,
} from '../action/action'
import { createPdfThumbnail } from '../utils/pdfThumbnail'
import { toast } from 'react-toastify'
import { ConnectionRequestsPanel } from './ConnectionRequestsPanel'
import { NotificationsPanel } from './NotificationsPanel'

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

const navigationItems = [
  {
    label: 'Home',
    path: '/home',
    icon: '/assets/logo_icons/home.svg',
  },
  {
    label: 'KNKT(n)',
    path: '/knkt',
    icon: '/assets/logo_icons/network.svg',
  },
  {
    label: 'Flicks',
    path: '/flicks',
    icon: '/assets/logo_icons/flick.svg',
  },
  {
    label: 'KNKTfund',
    path: '/knktfund',
    icon: '/assets/logo_icons/knktfund.svg',
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: '/assets/logo_icons/profile_icon.svg',
  },
]

export function Header({ onQuestionCreated }) {
  const { profile, isLoading } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const [openPanel, setOpenPanel] = useState(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const counts = useHeaderCounts()
  const headerRef = useRef(null)
  useEffect(() => {
    const close = (event) => {
      if (
        event.key === 'Escape' ||
        (event.type === 'pointerdown' && !headerRef.current?.contains(event.target))
      ) {
        setOpenPanel(null)
        setIsAccountMenuOpen(false)
      }
    }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', close)
    return () => {
      document.removeEventListener('keydown', close)
      document.removeEventListener('pointerdown', close)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setIsAccountMenuOpen(false)
    window.location.replace('/')
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  function renderAccountMenu() {
    return (
      <div className="account-menu">
        <div className="account-menu-profile">
          <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
          <div>
            {isLoading ? (
              <>
                <span className="header-profile-skeleton header-profile-skeleton-name" />
                <span className="header-profile-skeleton header-profile-skeleton-username" />
              </>
            ) : (
              <>
                <strong>{profile?.fullName}</strong>
                <span>{profile?.displayUsername}</span>
              </>
            )}
          </div>
        </div>
        <button
          className="account-view-profile"
          type="button"
          onClick={() => navigate('/profile')}
        >
          View Profile
        </button>
        <a href="https://socialknkt.com/privacy" target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
        <a href="https://socialknkt.com/terms" target="_blank" rel="noreferrer">
          Terms of Service
        </a>
        <button className="account-logout" type="button" onClick={logout}>
          <img src="/assets/logo_icons/logoutIcon.svg" alt="" />
          <span>Log out</span>
        </button>
      </div>
    )
  }

  return (
    <header className="site-header" ref={headerRef}>
      <button
        className="site-header-logo"
        type="button"
        aria-label="Go to home"
        onClick={() => navigate('/home')}
      >
        <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
      </button>

      <button
        className="header-new-post"
        type="button"
        onClick={() => setIsPostModalOpen(true)}
      >
        <img src="/assets/logo_icons/addpost.svg" alt="" />
        <span>New Post</span>
      </button>

      <nav className="header-navigation" aria-label="Primary navigation">
        {navigationItems.map((item) => (
          <button
            className={`header-nav-item ${item.combined ? 'header-nav-item-combined' : ''} ${isActive(item.path) ? 'is-active' : ''}`}
            type="button"
            key={item.label}
            onClick={() => navigate(item.path)}
          >
            <img src={item.icon} alt="" />
            {!item.combined && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <button
          className="header-search"
          type="button"
          aria-label="Search"
          onClick={() => navigate('/search')}
        >
          <img src="/assets/logo_icons/search.svg" alt="" />
        </button>

        <span className="header-divider" aria-hidden="true" />

        <HeaderAction
          label="Messages"
          icon="/assets/logo_icons/Chat.svg"
          onClick={() => navigate('/chat')}
        />
        <HeaderAction
          label="Connections"
          icon="/assets/logo_icons/connection.svg"
          count={counts.connections || undefined}
          onClick={() => setOpenPanel(openPanel === 'connections' ? null : 'connections')}
        />
        <HeaderAction
          label="Notifications"
          icon="/assets/logo_icons/notification.svg"
          count={counts.notifications || undefined}
          onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')}
        />

        <button
          className="header-account"
          type="button"
          aria-label="Open account menu"
          onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
        >
          <span className="header-account-avatar">
            <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
          </span>
          <img
            className="header-account-chevron"
            src="/assets/logo_icons/dropdownHeader.svg"
            alt=""
          />
        </button>

        {isAccountMenuOpen && renderAccountMenu()}

        {openPanel === 'notifications' && (
          <NotificationsPanel onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === 'connections' && (
          <ConnectionRequestsPanel onClose={() => setOpenPanel(null)} />
        )}
      </div>

      {isPostModalOpen && (
        <PostComposerModal
          onClose={() => setIsPostModalOpen(false)}
          onQuestionCreated={onQuestionCreated}
        />
      )}
    </header>
  )
}

function HeaderAction({ label, icon, count, onClick }) {
  return (
    <button className="header-action" type="button" aria-label={label} onClick={onClick}>
      <span className="header-action-icon">
        <img src={icon} alt="" />
        {count && <span className="header-badge">{count}</span>}
      </span>
    </button>
  )
}

function PostComposerModal({ onClose, onQuestionCreated }) {
  const { profile } = useProfile()
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [profileType, setProfileType] = useState('Professional')
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [postText, setPostText] = useState('')
  const [isAskShareOpen, setIsAskShareOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [videoType, setVideoType] = useState('video')
  const [videoLink, setVideoLink] = useState('')
  const [isVideoLinkModalOpen, setIsVideoLinkModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const flickInputRef = useRef(null)
  const documentInputRef = useRef(null)
  const modalRef = useRef(null)

  const addOptions = [
    ['post_card_img.svg', 'Add a photo'],
    ['post_card_chat.svg', 'Create KNKT(n) Thread'],
    ['post_card_video.svg', 'Add flicks'],
    ['post_card_video.svg', 'Add a video'],
    ['post_card_video_link.svg', 'Add Video Link'],
    ['post_card_doc.svg', 'Add a document'],
  ]

  const handleAddOption = (label) => {
    setIsAddMenuOpen(false)
    if (label === 'Add a photo') photoInputRef.current?.click()
    if (label === 'Add a video') videoInputRef.current?.click()
    if (label === 'Add flicks') flickInputRef.current?.click()
    if (label === 'Add a document') documentInputRef.current?.click()
  }

  const handleSubmit = async (linkOverride = videoLink) => {
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
      if (!modalRef.current?.contains(event.target)) {
        return
      }

      if (event.target.closest('.post-profile-selector, .post-add-wrapper')) {
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
      <div className="post-modal-user">
        <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
        <div>
          <h3>{profile?.fullName || 'Loading profile...'}</h3>
          <div className="post-profile-selector">
            <button type="button" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              <ProfileTypeIcon type={profileType} />
              {profileType}
              <img
                className="post-modal-caret"
                src="/assets/logo_icons/postadddropdown.svg"
                alt=""
              />
            </button>

            {isProfileMenuOpen && (
              <div className="post-profile-menu">
                {['Both', 'Personal', 'Professional'].map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => {
                      setProfileType(type)
                      setIsProfileMenuOpen(false)
                    }}
                  >
                    <ProfileTypeIcon type={type} />
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  function renderVideoLink() {
    return (
      <>
        {isVideoLinkModalOpen && (
          <div
            className="header-video-link-backdrop"
            role="presentation"
            onClick={() => setIsVideoLinkModalOpen(false)}
          >
            <div
              className="header-video-link-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="header-video-link-close"
                type="button"
                onClick={() => setIsVideoLinkModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h2>Add Video Link</h2>
              <p>Paste a YouTube or video link to add it to your post.</p>
              <input
                autoFocus
                value={videoLink}
                onChange={(event) => setVideoLink(event.target.value)}
                placeholder="Enter video link"
              />
              <div className="header-video-link-actions">
                <button type="button" onClick={() => setIsVideoLinkModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(videoLink)}
                  disabled={!videoLink.trim() || isSubmitting}
                >
                  {isSubmitting && <span className="post-submit-spinner" />}
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
    <div className="post-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        ref={modalRef}
        className="post-composer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="post-modal-heading">
          <h2 id="post-modal-title">Post</h2>
          <button type="button" aria-label="Close post modal" onClick={onClose}>
            <img src="/assets/logo_icons/ci_close-big.svg" alt="" />
          </button>
        </div>

        {renderComposerUser()}
        <div className="post-modal-editor">
          <textarea
            placeholder={isEditorFocused ? '' : 'What new with you?'}
            aria-label="Post content"
            value={postText}
            onChange={(event) => setPostText(event.target.value)}
            onFocus={() => setIsEditorFocused(true)}
          />
          {!isEditorFocused && <img src="/assets/logo_icons/editPost.svg" alt="" />}
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

        <div className="post-modal-actions">
          <div className="post-add-wrapper">
            <button
              className="post-modal-add"
              type="button"
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            >
              Add
              <img src="/assets/logo_icons/postadddropdown.svg" alt="" />
            </button>

            {isAddMenuOpen && (
              <div className="post-add-menu">
                {addOptions
                  .filter(
                    ([, label]) => label !== 'Add a document' || profileType !== 'Personal',
                  )
                  .map(([icon, label]) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => {
                        if (label === 'Create KNKT(n) Thread') {
                          setIsAddMenuOpen(false)
                          setIsAskShareOpen(true)
                        } else if (
                          label === 'Add a photo' ||
                          label === 'Add a video' ||
                          label === 'Add flicks' ||
                          label === 'Add a document'
                        ) {
                          handleAddOption(label)
                        } else if (label === 'Add Video Link') {
                          setIsVideoLinkModalOpen(true)
                          setIsAddMenuOpen(false)
                        }
                      }}
                    >
                      <img src={`/assets/logo_icons/${icon}`} alt="" />
                      {label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <button
            className="post-modal-submit"
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            <img src="/assets/logo_icons/Send.svg" alt="" />
            {isSubmitting && <span className="post-submit-spinner" />}
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </section>
      {isAskShareOpen && (
        <AskShareModal
          onClose={() => setIsAskShareOpen(false)}
          onCreated={() => {
            onQuestionCreated?.()
            onClose()
          }}
        />
      )}
      {renderVideoLink()}
    </div>
  )
}

function ProfileTypeIcon({ type }) {
  if (type === 'Both') {
    return <img className="profile-type-icon" src="/assets/logo_icons/connection.svg" alt="" />
  }

  const icon =
    type === 'Personal'
      ? '/assets/logo_icons/connection.svg'
      : '/assets/logo_icons/Professional.svg'

  return <img className="profile-type-icon" src={icon} alt="" />
}

function useHeaderCounts() {
  const { authToken } = useProfile()
  const [counts, setCounts] = useState({ connections: 0, notifications: 0 })
  useEffect(() => {
    let active = true
    let request = 0
    async function refresh() {
      const id = ++request
      if (!authToken) return
      const results = await Promise.allSettled([getConnectionCount(), getNotificationCount()])
      if (!active || id !== request) return
      setCounts((current) => ({
        connections:
          results[0].status === 'fulfilled'
            ? Number(results[0].value.data) || 0
            : current.connections,
        notifications:
          results[1].status === 'fulfilled'
            ? Number(results[1].value.data) || 0
            : current.notifications,
      }))
    }
    const read = (event) => {
      if (event.detail?.token === authToken) {
        request++
        setCounts((current) => ({ ...current, notifications: 0 }))
      }
    }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('connections-change', refresh)
    window.addEventListener('notifications-read', read)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('connections-change', refresh)
      window.removeEventListener('notifications-read', read)
    }
  }, [authToken])
  return counts
}
