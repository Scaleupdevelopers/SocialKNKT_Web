import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const profileImage = '/assets/logo_icons/profile_avatar.png'

export function ProfileHeader({ editProfile = false }) {
  const navigate = useNavigate()
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
        <img src={profileImage} alt="Dianne Russell" />
      </div>

      <div className="settings-profile-details">
        <div>
          <div className="settings-name-row">
            <h1>Dianne Russell</h1>
            <span>@Diane_R001</span>
          </div>

          <div className="settings-stats">
            <span><strong>2,467</strong> Posts</span>
            <span><strong>1,589</strong> Connections</span>
          </div>

          <h2>UI UX Designer</h2>
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
