import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AskShareModal } from '../components/modals/AskShareModal/AskShareModal'
import './Header.css'

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

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [openPanel, setOpenPanel] = useState(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <header className="site-header">
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
        <button className="header-search" type="button" aria-label="Search">
          <img src="/assets/logo_icons/search.svg" alt="" />
        </button>

        <span className="header-divider" aria-hidden="true" />

        <HeaderAction
          label="Messages"
          icon="/assets/logo_icons/Chat.svg"
        />
        <HeaderAction
          label="Connections"
          icon="/assets/logo_icons/connection.svg"
          count="1"
          onClick={() => setOpenPanel(openPanel === 'connections' ? null : 'connections')}
        />
        <HeaderAction
          label="Notifications"
          icon="/assets/logo_icons/notification.svg"
          count="9"
          onClick={() => setOpenPanel(openPanel === 'notifications' ? null : 'notifications')}
        />

        <button className="header-account" type="button" aria-label="Open account menu" onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}>
          <span className="header-account-avatar">
            <img src="/assets/logo_icons/profile_avatar.png" alt="" />
          </span>
          <img className="header-account-chevron" src="/assets/logo_icons/dropdownHeader.svg" alt="" />
        </button>

        {isAccountMenuOpen && (
          <div className="account-menu">
            <div className="account-menu-profile">
              <img src="/assets/logo_icons/profile_avatar.png" alt="Dianne Russell" />
              <div>
                <strong>Dianne Russell</strong>
                <span>@Diane_R001</span>
              </div>
            </div>
            <button className="account-view-profile" type="button" onClick={() => navigate('/profile')}>View Profile</button>
            <button type="button">Privacy Policy</button>
            <button type="button">Terms of Service</button>
            <button className="account-logout" type="button" onClick={() => navigate('/')}>
              <img src="/assets/logo_icons/logoutIcon.svg" alt="" />
              <span>Log out</span>
            </button>
          </div>
        )}

        {openPanel === 'notifications' && <NotificationsPanel />}
        {openPanel === 'connections' && <ConnectionsPanel />}
      </div>

      {isPostModalOpen && (
        <PostComposerModal onClose={() => setIsPostModalOpen(false)} />
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

function PostComposerModal({ onClose }) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [profileType, setProfileType] = useState('Professional')
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [postText, setPostText] = useState('')
  const [isAskShareOpen, setIsAskShareOpen] = useState(false)
  const modalRef = useRef(null)

  const addOptions = [
    ['post_card_img.svg', 'Add a photo'],
    ['post_card_chat.svg', 'Create KNKT(n) Thread'],
    ['post_card_video.svg', 'Add flicks'],
    ['post_card_video.svg', 'Take a video'],
    ['post_card_video_link.svg', 'Add Video Link'],
    ['post_card_doc.svg', 'Add a document'],
  ]

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

        <div className="post-modal-user">
          <img src="/assets/logo_icons/profile_avatar.png" alt="Dianne Russell" />
          <div>
            <h3>Dianne Russell</h3>
            <div className="post-profile-selector">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <ProfileTypeIcon type={profileType} />
                {profileType}
                <img className="post-modal-caret" src="/assets/logo_icons/postadddropdown.svg" alt="" />
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
                {addOptions.map(([icon, label]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => {
                      if (label === 'Create KNKT(n) Thread') {
                        setIsAddMenuOpen(false)
                        setIsAskShareOpen(true)
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

          <button className="post-modal-submit" type="button">
            <img src="/assets/logo_icons/Send.svg" alt="" />
            Post
          </button>
        </div>
      </section>
      {isAskShareOpen && <AskShareModal onClose={() => setIsAskShareOpen(false)} />}
    </div>
  )
}

function ProfileTypeIcon({ type }) {
  if (type === 'Both') {
    return <img className="profile-type-icon" src="/assets/logo_icons/connection.svg" alt="" />
  }

  const icon = type === 'Personal'
    ? '/assets/logo_icons/connection.svg'
    : '/assets/logo_icons/Professional.svg'

  return <img className="profile-type-icon" src={icon} alt="" />
}

const notificationItems = [
  'Leila Berk, Talinda Newton and 4 others liked your Post.',
  'Leila Berk, Talinda Newton and 4 others commented your Post.',
  'Leila Berk sent a connection request.',
  'Leila Berk sent a connection request.',
  'Leila Berk, Talinda Newton and 4 others liked your Post.',
]

function NotificationsPanel() {
  return (
    <aside className="header-panel notifications-panel">
      <PanelHeading title="Notification" />
      <PanelSectionTitle title="Recent" />
      <NotificationList items={notificationItems.slice(0, 3)} />
      <PanelSectionTitle title="Yesterday" />
      <NotificationList items={notificationItems.slice(3)} />
    </aside>
  )
}

function ConnectionsPanel() {
  const [openRequest, setOpenRequest] = useState(null)

  return (
    <aside className="header-panel connections-panel">
      <PanelHeading title="Connection Requests" />
      {[1, 2, 3, 4].map((request) => (
        <div className="connection-request" key={request}>
          <img src="/assets/logo_icons/profile_avatar.png" alt="Leila Berk" />
          <div className="connection-request-content">
            <p>Leila Berk sent a connection request <span>30m</span></p>
            <div>
              <button
                className="accept-button"
                type="button"
                onClick={() => setOpenRequest(openRequest === request ? null : request)}
              >
                Accept
                <img src="/assets/logo_icons/dropdownHeader.svg" alt="" />
              </button>
              <button className="decline-button" type="button">Decline</button>
            </div>
            {openRequest === request && (
              <div className="connection-type-menu">
                <button type="button">Personal</button>
                <button type="button">Professional</button>
                <button type="button">Both</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </aside>
  )
}

function PanelHeading({ title }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      <button type="button" aria-label="More options">•••</button>
    </div>
  )
}

function PanelSectionTitle({ title }) {
  return <h3 className="panel-section-title">{title}</h3>
}

function NotificationList({ items }) {
  return (
    <div className="notification-list">
      {items.map((item, index) => (
        <div className="notification-item" key={`${item}-${index}`}>
          <img src="/assets/logo_icons/profile_avatar.png" alt="" />
          <p>{item} <span>30m</span></p>
          {item.includes('request') ? (
            <>
              <button className="accept-button" type="button">
                Accept
                <img src="/assets/logo_icons/dropdownHeader.svg" alt="" />
              </button>
              <button className="close-request-button" type="button" aria-label="Dismiss request">
                <img src="/assets/logo_icons/ci_close-big.svg" alt="" />
              </button>
            </>
          ) : (
            <span className="notification-thumbnail" />
          )}
        </div>
      ))}
    </div>
  )
}
