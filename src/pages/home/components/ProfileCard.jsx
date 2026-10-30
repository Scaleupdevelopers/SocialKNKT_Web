const profileIcon = '/assets/logo_icons/profile_avatar.png'

export function ProfileCard() {
  return (
    <section className="profile-card">
      <div className="profile-cover" />

      <div className="profile-avatar">
        <img src={profileIcon} alt="Dianne Russell" />
      </div>

      <div className="profile-card-content">
        <h1>Dianne Russell</h1>
        <p className="profile-role">UI UX Designer</p>
        <p className="profile-bio">
          Design, Art, photography, Dance, Creativity, Nature, Lifestyle
          <span aria-hidden="true"> 💗🦋🌺</span>
        </p>
      </div>
    </section>
  )
}
