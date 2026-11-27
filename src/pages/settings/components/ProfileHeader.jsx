import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../../../context/ProfileContext'
import { blockUser, reportUser, uploadFile, updateBannerImage } from '../../../action/action'
import { toast } from 'react-toastify'
import { ReportPostModal } from '../../../components/modals/ReportPostModal/ReportPostModal'
import { ConnectionManager } from '../../../components/modals/ConnectionManager'

export function ProfileHeader({
  editProfile = false,
  profileOverride = null,
  isLoadingOverride = null,
  isOtherProfile = false,
  onRelationshipChanged,
}) {
  const { profile, isLoading, setProfile, refreshProfile } = useProfile()
  const displayedProfile = isOtherProfile ? profileOverride : profile
  const displayedIsLoading = isLoadingOverride ?? isLoading
  const cover = useProfileBanner(setProfile)
  const actions = useProfileActions({
    displayedProfile,
    profileOverride,
    profile,
    onRelationshipChanged,
    refreshProfile,
  })

  return (
    <>
      <ProfileCover profile={displayedProfile} isOtherProfile={isOtherProfile} cover={cover} />
      <ProfileAvatar profile={displayedProfile} />
      <div className="settings-profile-details">
        <ProfileSummary
          profile={displayedProfile}
          isLoading={displayedIsLoading}
          isOtherProfile={isOtherProfile}
        />
        <ProfileActions
          profile={displayedProfile}
          isLoading={displayedIsLoading}
          isOtherProfile={isOtherProfile}
          editProfile={editProfile}
          actions={actions}
        />
      </div>
      <ProfileDialogs profile={displayedProfile} actions={actions} />
    </>
  )
}

function useProfileActions({
  displayedProfile,
  profileOverride,
  profile,
  onRelationshipChanged,
  refreshProfile,
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [blockOverride, setBlockOverride] = useState(null)
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockError, setBlockError] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const blockLock = useRef(false)
  const userId = getUserId(displayedProfile)
  const accountId = getUserId(profile)
  const ownerKey = `${accountId}:${userId}`
  const currentOwner = useRef(ownerKey)
  const moreButton = useRef(null)
  const blockedByMe = getBlockedByMe(blockOverride, ownerKey, displayedProfile, accountId)
  const blockedByOther = isBlockedByOther(displayedProfile, accountId)
  const [manageOpen, setManageOpen] = useState(false)

  useEffect(() => {
    currentOwner.current = ownerKey
    setBlockOverride(null)
    setBlockError('')
    setReportOpen(false)
    setIsMoreMenuOpen(false)
  }, [
    ownerKey,
    profileOverride?.isBlocked,
    profileOverride?.isUserBlocked,
    profileOverride?.blockedBy,
  ])

  function closeReport() {
    setReportOpen(false)
    moreButton.current?.focus()
  }

  async function refreshRelationship() {
    try {
      await refreshProfile()
      await onRelationshipChanged?.()
    } catch {
      toast.error('Profile refresh failed. Reload to see the latest relationship.')
    }
  }

  async function handleBlockUser() {
    if (!userId || blockLock.current) return
    const nextBlocked = !blockedByMe
    blockLock.current = true
    setIsBlocking(true)
    setBlockError('')
    try {
      await blockUser(userId, nextBlocked)
      if (currentOwner.current !== ownerKey) return
      setBlockOverride({ ownerKey, blocked: nextBlocked })
      setIsMoreMenuOpen(false)
      toast.success(nextBlocked ? 'User blocked successfully.' : 'User unblocked successfully.')
      await refreshRelationship()
    } catch {
      if (currentOwner.current === ownerKey) {
        setBlockError('Unable to update block status. Please try again.')
      }
    } finally {
      blockLock.current = false
      setIsBlocking(false)
    }
  }

  return {
    isMoreMenuOpen,
    setIsMoreMenuOpen,
    isBlocking,
    blockError,
    reportOpen,
    setReportOpen,
    userId,
    ownerKey,
    moreButton,
    blockedByMe,
    blockedByOther,
    manageOpen,
    setManageOpen,
    closeReport,
    handleBlockUser,
  }
}

function getBlockedByMe(override, ownerKey, profile, accountId) {
  return override?.ownerKey === ownerKey
    ? override.blocked
    : isBlockedByAccount(profile, accountId)
}

function isBlockedByOther(profile, accountId) {
  return Boolean(profile?.blockedBy) && String(profile.blockedBy) !== String(accountId)
}

function useProfileBanner(setProfile) {
  const [bannerImage, setBannerImage] = useState(null)
  const [isBannerUploading, setIsBannerUploading] = useState(false)
  async function handleBannerChange(event) {
    const file = event.target.files?.[0]

    if (!file || isBannerUploading) return
    setIsBannerUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const bannerUrl = await uploadFile(file, ext)
      await updateBannerImage(bannerUrl)
      setBannerImage(bannerUrl)
      setProfile((current) => (current ? { ...current, banner_image: bannerUrl } : current))
      toast.success('Banner image updated successfully.')
    } catch (error) {
      toast.error(error.message || 'Unable to update banner image.')
    } finally {
      setIsBannerUploading(false)
    }
  }
  return { bannerImage, handleBannerChange }
}

function ProfileCover({ profile, isOtherProfile, cover }) {
  const image = cover.bannerImage || profile?.banner_image
  return (
    <div className="settings-cover">
      {image && <img className="settings-cover-image" src={image} alt="Profile banner" />}
      {!isOtherProfile && (
        <label className="settings-cover-edit" aria-label="Edit cover photo">
          <img src="/assets/logo_icons/edit_icon.svg" alt="" />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={cover.handleBannerChange}
          />
        </label>
      )}
    </div>
  )
}

function ProfileAvatar({ profile }) {
  return (
    <div className="settings-profile-image">
      <img src={profile?.image || '/assets/logo_icons/profile_alt.avif'} alt="" />
    </div>
  )
}

function ProfileSummary({ profile, isLoading, isOtherProfile }) {
  return (
    <div>
      <ProfileName profile={profile} isLoading={isLoading} />
      <ProfileStats profile={profile} isOtherProfile={isOtherProfile} />
      <h2>{profile?.profession || ''}</h2>
      <ProfileLocation profile={profile} />
    </div>
  )
}

function ProfileName({ profile, isLoading }) {
  return (
    <div className="settings-name-row">
      <h1>
        {isLoading ? (
          <span className="settings-profile-skeleton settings-profile-skeleton-name" />
        ) : (
          profile?.fullName
        )}
      </h1>
      <span>
        {isLoading ? (
          <span className="settings-profile-skeleton settings-profile-skeleton-username" />
        ) : (
          profile?.displayUsername
        )}
      </span>
    </div>
  )
}

function ProfileStats({ profile, isOtherProfile }) {
  const navigate = useNavigate()
  const connectionCount = profile?.connectionCount || profile?.totalNoOfConnections || 0
  function openConnections() {
    const userId = getUserId(profile)
    navigate(
      userId && isOtherProfile
        ? `/connections?userId=${encodeURIComponent(userId)}`
        : '/connections',
    )
  }
  return (
    <div className="settings-stats">
      <span>
        <strong>{profile?.postCount || 0}</strong> Posts
      </span>
      <button
        className="settings-connections-stat"
        type="button"
        disabled={!connectionCount}
        onClick={openConnections}
      >
        <strong>{connectionCount}</strong> Connections
      </button>
    </div>
  )
}

function ProfileLocation({ profile }) {
  const location = getLocationLabel(profile)
  if (!location) return null
  return (
    <p className="settings-location">
      <img src="/assets/logo_icons/location.svg" alt="" /> <span>{location}</span>
    </p>
  )
}

function ProfileActions({ profile, isLoading, isOtherProfile, editProfile, actions }) {
  const navigate = useNavigate()
  return (
    <div className="settings-profile-actions">
      <p>
        {isLoading ? (
          <span
            className="settings-profile-skeleton settings-profile-skeleton-joined"
            aria-label="Loading joined date"
          />
        ) : (
          `Joined ${formatJoinedDate(profile?.createdAt)}`
        )}
      </p>
      <div>
        {isOtherProfile ? (
          <OtherProfileActions actions={actions} />
        ) : (
          !editProfile && (
            <button type="button" onClick={() => navigate('/edit-profile')}>
              Edit Profile
            </button>
          )
        )}
        {!isOtherProfile && (
          <button
            className="settings-icon-button"
            type="button"
            aria-label="Settings"
            onClick={() => navigate('/settings')}
          >
            <img src="/assets/logo_icons/setting.svg" alt="" />
          </button>
        )}
      </div>
    </div>
  )
}

function OtherProfileActions({ actions }) {
  return (
    <>
      <button
        className="manage-connection-button"
        type="button"
        onClick={() => actions.setManageOpen(true)}
      >
        Manage Connection
      </button>
      <div className="profile-more-wrap">
        <button
          ref={actions.moreButton}
          className="profile-more-button"
          type="button"
          aria-label="More profile actions"
          aria-expanded={actions.isMoreMenuOpen}
          onClick={() => actions.setIsMoreMenuOpen((open) => !open)}
        >
          ⋮
        </button>
        {actions.isMoreMenuOpen && <ProfileMoreMenu actions={actions} />}
      </div>
    </>
  )
}

function ProfileMoreMenu({ actions }) {
  function openReport() {
    actions.setReportOpen(true)
    actions.setIsMoreMenuOpen(false)
  }
  return (
    <div className="profile-more-menu">
      <button type="button" onClick={openReport}>
        <img src="/assets/logo_icons/report.svg" alt="" />
        Report
      </button>
      {!actions.blockedByOther && (
        <button
          type="button"
          disabled={actions.isBlocking || !actions.userId}
          onClick={actions.handleBlockUser}
        >
          <span className="profile-block-icon" aria-hidden="true" />
          {actions.blockedByMe ? 'Unblock' : 'Block'}
        </button>
      )}
      {actions.blockError && <p role="alert">{actions.blockError}</p>}
    </div>
  )
}

function ProfileDialogs({ profile, actions }) {
  const managerId = profile?.id || profile?._id
  return (
    <>
      {actions.reportOpen && (
        <ReportPostModal
          key={actions.ownerKey}
          postId={actions.userId}
          contentLabel="User"
          descriptionOnly
          reportAction={reportUser}
          onClose={actions.closeReport}
        />
      )}
      {actions.manageOpen && (
        <ConnectionManager
          key={managerId}
          userId={managerId}
          onClose={() => actions.setManageOpen(false)}
        />
      )}
    </>
  )
}

function formatJoinedDate(createdAt) {
  if (!createdAt) return '—'

  // API timestamps are normally milliseconds, but support seconds too.
  const timestamp = Number(createdAt)
  const date = Number.isFinite(timestamp)
    ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp)
    : new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function getUserId(profile) {
  return profile?.id || profile?._id || profile?.userId
}

function isTrue(value) {
  return [true, 1, '1', 'true'].includes(value)
}

function isBlockedByAccount(profile, accountId) {
  if (!accountId || !profile?.blockedBy) return false
  const blocked = isTrue(profile.isBlocked) || isTrue(profile.isUserBlocked)
  return blocked && String(profile.blockedBy) === String(accountId)
}

function locationName(value) {
  if (typeof value === 'string') return value
  return value?.name || ''
}

function getLocations(profile) {
  return profile?.places || profile?.locations || profile?.placesLived || []
}

function getLocationLabel(profile) {
  const locations = getLocations(profile)
  const location =
    locations.find((item) => isTrue(item.currentlyLiving)) || locations[0] || profile?.location
  if (!location) return ''
  return ['city', 'state', 'country']
    .map((key) => locationName(location[`${key}Name`] || location[key]))
    .filter(Boolean)
    .join(', ')
}
