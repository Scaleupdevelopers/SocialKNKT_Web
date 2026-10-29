import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
        onClick={() => navigate('/home')}
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

        <button className="header-account" type="button" aria-label="Open account menu">
          <span className="header-account-avatar">
            <img src="/assets/logo_icons/profile_avatar.png" alt="" />
          </span>
          <img className="header-account-chevron" src="/assets/logo_icons/dropdownHeader.svg" alt="" />
        </button>

        {openPanel === 'notifications' && <NotificationsPanel />}
        {openPanel === 'connections' && <ConnectionsPanel />}
      </div>
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
