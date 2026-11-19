import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../../context/ProfileContext'
import { getUploadUrl, updateBannerImage } from '../../../action/action'
import { toast } from 'react-toastify'

export function ProfileHeader({ editProfile = false }) {
  const navigate = useNavigate()
  const { profile, isLoading, setProfile } = useProfile()
  const [bannerImage, setBannerImage] = useState(null)
  const [isBannerUploading, setIsBannerUploading] = useState(false)

  async function handleBannerChange(event) {
    const file = event.target.files?.[0]

    if (!file || isBannerUploading) return
    setIsBannerUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const signedUrl = await getUploadUrl(ext)
      const upload = await fetch(signedUrl.data, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file })
      if (!upload.ok) throw new Error('Unable to upload banner image.')
      const bannerUrl = signedUrl.data.split('?')[0]
      await updateBannerImage(bannerUrl)
      setBannerImage(bannerUrl)
      setProfile((current) => current ? { ...current, banner_image: bannerUrl } : current)
      toast.success('Banner image updated successfully.')
    } catch (error) {
      toast.error(error.message || 'Unable to update banner image.')
    } finally {
      setIsBannerUploading(false)
    }
  }

  return (
    <>
      <div className="settings-cover">
        {(bannerImage || profile?.banner_image) && <img className="settings-cover-image" src={bannerImage || profile.banner_image} alt="Profile banner" />}

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
          {getLocationLabel(profile) ? <p className="settings-location">
            <img src="/assets/logo_icons/location.svg" alt="" /> <span>{getLocationLabel(profile)}</span>
          </p> : null}
        </div>

        <div className="settings-profile-actions">
          <p>Joined March 2025</p>
          <div>
            {!editProfile && (
              <button type="button" onClick={() => navigate('/edit-profile')}>
                Edit Profile
              </button>
            )}

            <button className="settings-icon-button" type="button" aria-label="Settings" onClick={() => navigate('/settings')}>
              <img src="/assets/logo_icons/setting.svg" alt="" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function getLocationLabel(profile) {
  const locations = profile?.locations || profile?.placesLived || []
  const location = locations.find((item) => item.currentlyLiving) || locations[0] || profile?.location
  if (!location) return ''
  return [location.cityName || location.city, location.stateName || location.state, location.countryName || location.country].filter(Boolean).join(', ')
}
