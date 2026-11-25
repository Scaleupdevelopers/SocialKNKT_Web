import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { CreatePost } from '../home/Home'
import { PostCard } from '../home/components/PostCard'
import { ProfileHeader } from '../settings/components/ProfileHeader'
import { normalizeProfile, useProfile } from '../../context/ProfileContext'
import { getAllMyFeed, getAllMyFlicks, getMyAllPosts, getOtherUserPosts, getOtherUserProfile } from '../../action/action'
import '../home/Home.css'
import '../settings/Settings.css'
import './Profile.css'

const PROFILE_PAGE_SIZE = 10

function ProfilePostSkeleton() {
  return (
    <article className="feed-post feed-post-skeleton" aria-label="Loading post">
      <div className="post-skeleton-author"><span className="post-skeleton-avatar" /><div className="post-skeleton-author-copy"><span className="post-skeleton-line post-skeleton-name" /><span className="post-skeleton-line post-skeleton-meta" /></div></div>
      <span className="post-skeleton-line post-skeleton-content" />
      <span className="post-skeleton-media" />
      <div className="post-skeleton-actions"><span className="post-skeleton-action" /><span className="post-skeleton-action" /><span className="post-skeleton-action" /></div>
    </article>
  )
}

export function Profile() {
  const { profile } = useProfile()
  const [searchParams] = useSearchParams()
  const requestedUserId = searchParams.get('userId')
  const currentUserId = profile?.id || profile?._id || profile?.userId
  const viewedUserId = requestedUserId || currentUserId
  const isOwnProfile = !requestedUserId || String(viewedUserId) === String(currentUserId)
  const [viewedProfile, setViewedProfile] = useState(null)
  const [isViewedProfileLoading, setIsViewedProfileLoading] = useState(!isOwnProfile)
  const [activeTab, setActiveTab] = useState('all')
  const [profilePosts, setProfilePosts] = useState([])
  const [isPostsLoading, setIsPostsLoading] = useState(true)
  const [profilePage, setProfilePage] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const postsEndRef = useRef(null)
  const postRequestsRef = useRef(new Set())
  const postsOwnerRef = useRef(null)

  useEffect(() => {
    if (isOwnProfile || !requestedUserId) {
      setViewedProfile(null)
      setIsViewedProfileLoading(false)
      return undefined
    }

    let isMounted = true
    setIsViewedProfileLoading(true)
    getOtherUserProfile(requestedUserId)
      .then((response) => {
        const profileData = response.data?.data || response.data
        if (isMounted) setViewedProfile(normalizeProfile(profileData))
      })
      .catch(() => {
        if (isMounted) setViewedProfile(null)
      })
      .finally(() => {
        if (isMounted) setIsViewedProfileLoading(false)
      })

    return () => { isMounted = false }
  }, [isOwnProfile, requestedUserId])

  useEffect(() => {
    let isMounted = true
    const ownerKey = isOwnProfile ? `own:${currentUserId || 'current'}` : `other:${viewedUserId}`
    if (postsOwnerRef.current !== ownerKey) {
      postsOwnerRef.current = ownerKey
      postRequestsRef.current.clear()
    }

    const loadProfilePosts = async () => {
      const requestKey = `${isOwnProfile ? 'own' : viewedUserId}:0`
      if (postRequestsRef.current.has(requestKey)) return
      postRequestsRef.current.add(requestKey)
      try {
        const response = isOwnProfile
          ? await getMyAllPosts(0, PROFILE_PAGE_SIZE)
          : await getOtherUserPosts(viewedUserId, 0, PROFILE_PAGE_SIZE)
        const posts = response.data || []
        if (isMounted) {
          setProfilePosts(posts)
          setProfilePage(0)
          setHasMorePosts(posts.length >= PROFILE_PAGE_SIZE)
        }
      } catch {
        if (isMounted) setProfilePosts([])
        postRequestsRef.current.delete(requestKey)
      } finally {
        if (isMounted) setIsPostsLoading(false)
      }
    }

    loadProfilePosts()
    return () => { isMounted = false }
  }, [isOwnProfile, profile?.id, viewedUserId])

  useEffect(() => {
    const loadMorePosts = async () => {
      if (isPostsLoading || isLoadingMorePosts || !hasMorePosts) return
      setIsLoadingMorePosts(true)
      try {
        const nextPage = profilePage + 1
        const requestKey = `${isOwnProfile ? 'own' : viewedUserId}:${nextPage}`
        if (postRequestsRef.current.has(requestKey)) return
        postRequestsRef.current.add(requestKey)
        const response = isOwnProfile
          ? await getMyAllPosts(nextPage, PROFILE_PAGE_SIZE)
          : await getOtherUserPosts(viewedUserId, nextPage, PROFILE_PAGE_SIZE)
        const nextPosts = response.data || []
        setProfilePosts((currentPosts) => [...currentPosts, ...nextPosts])
        setProfilePage(nextPage)
        setHasMorePosts(nextPosts.length >= PROFILE_PAGE_SIZE)
      } finally {
        setIsLoadingMorePosts(false)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMorePosts()
    }, { rootMargin: '280px' })

    if (postsEndRef.current) observer.observe(postsEndRef.current)
    return () => observer.disconnect()
  }, [hasMorePosts, isLoadingMorePosts, isOwnProfile, isPostsLoading, profile?.id, profilePage, viewedUserId])

  return (
    <main className="profile-page settings-page">
      <Header />
      <section className="settings-profile-card profile-card-page">
        <ProfileHeader profileOverride={viewedProfile} isLoadingOverride={isOwnProfile ? null : isViewedProfileLoading} isOtherProfile={!isOwnProfile} />

        <div className="profile-tabs">
          {['all', 'media', 'posts'].map((tab) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'media' ? (
          <MediaContent />
        ) : (
          <div className="profile-content">
            <ProfileSummary profile={isOwnProfile ? profile : viewedProfile} />
            <section className="profile-feed" aria-label="Profile posts">
              {isOwnProfile && <CreatePost />}
              {isPostsLoading && <ProfilePostSkeleton />}
              {!isPostsLoading && profilePosts.length === 0 && <div className="profile-posts-empty">No posts available yet.</div>}
              {profilePosts.map((post) => (
                <PostCard
                  key={post._id || post.id}
                  post={post}
                  showReport={false}
                  onDeleted={(postId) => setProfilePosts((posts) => posts.filter((item) => (item._id || item.id) !== postId))}
                />
              ))}
              <div ref={postsEndRef} className="feed-end-marker" aria-hidden="true" />
              {isLoadingMorePosts && <ProfilePostSkeleton />}
            </section>
          </div>
        )}
      </section>
    </main>
  )
}

function MediaContent() {
  const [feedMedia, setFeedMedia] = useState([])
  const [myFlicks, setMyFlicks] = useState([])
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    getAllMyFeed(0, 10)
      .then((response) => setFeedMedia(response.data || []))
      .catch(() => setFeedMedia([]))
    getAllMyFlicks(0, 10)
      .then((response) => setMyFlicks(response.data || []))
      .catch(() => setMyFlicks([]))
  }, [])

  return (
    <section className="profile-media-content" aria-label="Profile media">
      <div className="profile-media-section-heading">
        <h2>My Feed</h2>
      </div>

      <div className="profile-page-media-grid">
        {feedMedia.map((item, index) => (
          <div className="profile-media-cell" key={item._id || item.id || index}>
            {item.mediaType === 'video' ? (
              <video src={item.media} poster={item.thumbnail || undefined} muted playsInline controls preload="metadata" aria-label={`Feed video ${index + 1}`} />
            ) : item.mediaType === 'document' ? (
              <a href={item.media} target="_blank" rel="noreferrer" aria-label={`Open document ${index + 1}`}>
                {item.thumbnail ? <img src={item.thumbnail} alt={`Document ${index + 1}`} /> : <span>Open document</span>}
              </a>
            ) : (
              <button className="profile-media-preview-trigger" type="button" onClick={() => setPreviewImage(item.media || item.thumbnail)}>
                <img src={item.media || item.thumbnail} alt={`Feed media ${index + 1}`} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="profile-flicks-heading">
        <h2>Flicks</h2>
        <Link to="/flicks">See All</Link>
      </div>

      <div className="profile-flicks-tabs">
        <button className="active" type="button">Your Flicks</button>
      </div>

      <div className="profile-flicks-grid">
        {myFlicks.map((flick, index) => (
          <video key={flick._id || flick.id || index} src={flick.media} poster={flick.thumbnail || undefined} muted playsInline controls preload="metadata" aria-label={`Flick ${index + 1}`} />
        ))}
      </div>

      {previewImage && (
        <div className="profile-media-preview-backdrop" role="presentation" onClick={() => setPreviewImage(null)}>
          <div className="profile-media-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="profile-media-preview-close" aria-label="Close image preview" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
    </section>
  )
}

function ProfileSummary({ profile }) {
  const work = profile?.workExperiences || []
  const education = profile?.educations || []
  const locations = profile?.placesLived || profile?.locations || []
  return (
    <aside className="profile-summary">
      <h2>Bio</h2>
      <p>{profile?.bio || 'No bio added yet.'}</p>

      <h2>Work</h2>
      {work.length ? work.map((item, index) => <p className="profile-summary-item" key={`work-${index}`}><img className="profile-summary-icon-circle" src="/assets/logo_icons/bag_exp.svg" alt="" /> <span>{item.jobTitle || item.companyName || 'No workplace to show'}</span></p>) : <p className="profile-summary-item"><img className="profile-summary-icon-circle" src="/assets/logo_icons/bag_exp.svg" alt="" /> <span>No workplaces to show</span></p>}

      <h2>Education</h2>
      {education.length ? education.map((item, index) => <p className="profile-summary-item" key={`education-${index}`}><img src="/assets/logo_icons/education.svg" alt="" /> <span>{item.schoolName || item.instituteName || item.degree || 'Education'}</span></p>) : <p className="profile-summary-item"><img src="/assets/logo_icons/education.svg" alt="" /> <span>No education to show</span></p>}

      <h2>Places Lived</h2>
      {locations.length ? locations.map((item, index) => <p className="profile-summary-item" key={`location-${index}`}><img className="profile-summary-icon-circle" src="/assets/logo_icons/location_profile.svg" alt="" /> <span>{[item.cityName || item.city, item.stateName || item.state, item.countryName || item.country].filter(Boolean).join(', ')}<small>{item.currentlyLiving ? 'Current City' : ''}</small></span></p>) : <p className="profile-summary-item"><img className="profile-summary-icon-circle" src="/assets/logo_icons/location_profile.svg" alt="" /> <span>No locations to show</span></p>}

      <h2>Basic Info</h2>
      <p className="profile-summary-item"><img className="profile-summary-icon-circle" src={String(profile?.gender || '').toLowerCase() === 'female' ? '/assets/logo_icons/fa_female.svg' : '/assets/logo_icons/male.webp'} alt="" /> <span>{profile?.gender || 'Not added'}<small>Gender</small></span></p>

      <h2>Name pronunciation</h2>
      <p className="profile-summary-item"><img className="profile-summary-icon-circle" src="/assets/logo_icons/sound.svg" alt="" /> <span>{profile?.phonetic_spelling || 'Not added'}</span></p>
    </aside>
  )
}

