import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../../context/ProfileContext'

export function ProfileHeader({ editProfile = false }) {
  const navigate = useNavigate()
  const { profile, isLoading } = useProfile()
  const [bannerImage, setBannerImage] = useState(null)

  function handleBannerChange(event) {
    const file = event.target.files?.[0]

    if (file) {
      setBannerImage(URL.createObjectURL(file))
    }
  }

  return (
    <>
      <div className="settings-cover">
        {bannerImage && (
          <img className="settings-cover-image" src={bannerImage} alt="Profile banner" />
        )}

        <label className="settings-cover-edit" aria-label="Edit cover photo">
          <img src="/assets/logo_icons/edit_icon.svg" alt="" />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleBannerChange}
          />
        </label>
      </div>

      <div className="settings-profile-image">
        <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
      </div>

      <div className="settings-profile-details">
        <div>
          <div className="settings-name-row">
            <h1>{isLoading ? <span className="settings-profile-skeleton settings-profile-skeleton-name" /> : profile?.fullName}</h1>
            <span>{isLoading ? <span className="settings-profile-skeleton settings-profile-skeleton-username" /> : profile?.displayUsername}</span>
          </div>

          <div className="settings-stats">
            <span><strong>{profile?.postCount || 0}</strong> Posts</span>
            <span><strong>{profile?.connectionCount || 0}</strong> Connections</span>
          </div>

          <h2>{profile?.profession || ''}</h2>
          <p className="settings-location">
            ● <span>San Francisco, California</span>
          </p>
        </div>

        <div className="settings-profile-actions">
          <p>Joined March 2025</p>
          <div>
            {!editProfile && (
              <button type="button" onClick={() => navigate('/edit-profile')}>
                Edit Profile
              </button>
            )}

            <button className="settings-icon-button" type="button" aria-label="Settings">
              <img src="/assets/logo_icons/setting.svg" alt="" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
