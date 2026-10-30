import { useNavigate } from 'react-router-dom'

export function SidebarMenu() {
  const navigate = useNavigate()
  const items = [
    ['saveIcon.svg', 'Saved Flicks'],
    ['connection.svg', 'Connections'],
    ['setting.svg', 'Settings'],
  ]

  return (
    <nav className="sidebar-menu" aria-label="Profile menu">
      {items.map(([icon, label]) => (
        <button type="button" key={label} onClick={() => label === 'Settings' && navigate('/settings')}>
          <img src={`/assets/logo_icons/${icon}`} alt="" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
