import { useProfile } from '../../../context/ProfileContext'

export function ProfileCard() {
  const { profile, isLoading } = useProfile()

  return (
    <section className="profile-card">
      <div className="profile-cover" />

      <div className="profile-avatar">
        <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
      </div>

      <div className="profile-card-content">
        <h1>{isLoading ? <span className="profile-skeleton-line profile-skeleton-name" /> : profile?.fullName}</h1>
        <p className="profile-role">{isLoading ? <span className="profile-skeleton-line profile-skeleton-role" /> : profile?.profession}</p>
        <p className="profile-bio">{isLoading ? <span className="profile-skeleton-line profile-skeleton-bio" /> : profile?.bio}</p>
      </div>
    </section>
  )
}
