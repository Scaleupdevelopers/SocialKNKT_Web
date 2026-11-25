import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../../context/ProfileContext'
import { blockUser, getUploadUrl, updateBannerImage } from '../../../action/action'
import { toast } from 'react-toastify'

export function ProfileHeader({ editProfile = false, profileOverride = null, isLoadingOverride = null, isOtherProfile = false }) {
  const navigate = useNavigate()
  const { profile, isLoading, setProfile } = useProfile()
  const displayedProfile = isOtherProfile ? profileOverride : profile
  const displayedIsLoading = isLoadingOverride ?? isLoading
  const displayedConnectionCount = displayedProfile?.connectionCount || displayedProfile?.totalNoOfConnections || 0
  const [bannerImage, setBannerImage] = useState(null)
  const [isBannerUploading, setIsBannerUploading] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    const blocked = profileOverride?.isBlocked ?? profileOverride?.isUserBlocked ?? profileOverride?.userBlocked
    setIsBlocked(blocked === true || blocked === 1 || blocked === '1' || blocked === 'true')
  }, [profileOverride?.id, profileOverride?.isBlocked])

  async function handleBlockUser() {
    const blockedUserId = displayedProfile?.id || displayedProfile?._id || displayedProfile?.userId
    if (!blockedUserId) return

    await blockUser(blockedUserId, !isBlocked)
    setIsMoreMenuOpen(false)
    setIsBlocked(!isBlocked)
    toast.success(isBlocked ? 'User unblocked successfully.' : 'User blocked successfully.')
  }

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
        {(bannerImage || displayedProfile?.banner_image) && <img className="settings-cover-image" src={bannerImage || displayedProfile.banner_image} alt="Profile banner" />}

        {!isOtherProfile && <label className="settings-cover-edit" aria-label="Edit cover photo">
          <img src="/assets/logo_icons/edit_icon.svg" alt="" />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleBannerChange}
          />
        </label>}
      </div>

      <div className="settings-profile-image">
        <img src={displayedProfile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
      </div>

      <div className="settings-profile-details">
        <div>
          <div className="settings-name-row">
            <h1>{displayedIsLoading ? <span className="settings-profile-skeleton settings-profile-skeleton-name" /> : displayedProfile?.fullName}</h1>
            <span>{displayedIsLoading ? <span className="settings-profile-skeleton settings-profile-skeleton-username" /> : displayedProfile?.displayUsername}</span>
          </div>

          <div className="settings-stats">
            <span><strong>{displayedProfile?.postCount || 0}</strong> Posts</span>
            <button
              className="settings-connections-stat"
              type="button"
              disabled={!displayedConnectionCount}
              onClick={() => {
                const userId = displayedProfile?.id || displayedProfile?._id || displayedProfile?.userId
                navigate(userId && isOtherProfile ? `/connections?userId=${encodeURIComponent(userId)}` : '/connections')
              }}
            >
              <strong>{displayedConnectionCount}</strong> Connections
            </button>
          </div>

          <h2>{displayedProfile?.profession || ''}</h2>
          {getLocationLabel(displayedProfile) ? <p className="settings-location">
            <img src="/assets/logo_icons/location.svg" alt="" /> <span>{getLocationLabel(displayedProfile)}</span>
          </p> : null}
        </div>

        <div className="settings-profile-actions">
          <p>Joined March 2025</p>
          <div>
            {isOtherProfile ? (
              <>
                <button className="manage-connection-button" type="button">Manage Connection</button>
                <div className="profile-more-wrap">
                  <button className="profile-more-button" type="button" aria-label="More profile actions" aria-expanded={isMoreMenuOpen} onClick={() => setIsMoreMenuOpen((open) => !open)}>⋮</button>
                  {isMoreMenuOpen && <div className="profile-more-menu">
                    {isBlocked ? (
                      <button type="button" onClick={handleBlockUser}><span className="profile-block-icon" aria-hidden="true" />Unblock</button>
                    ) : (
                      <>
                        <button type="button" onClick={() => setIsMoreMenuOpen(false)}><img src="/assets/logo_icons/report.svg" alt="" />Report</button>
                        <button type="button" onClick={handleBlockUser}><span className="profile-block-icon" aria-hidden="true" />Block</button>
                      </>
                    )}
                  </div>}
                </div>
              </>
            ) : !editProfile && (
              <button type="button" onClick={() => navigate('/edit-profile')}>
                Edit Profile
              </button>
            )}

            {!isOtherProfile && <button className="settings-icon-button" type="button" aria-label="Settings" onClick={() => navigate('/settings')}>
              <img src="/assets/logo_icons/setting.svg" alt="" />
            </button>}
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
