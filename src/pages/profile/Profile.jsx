import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { CreatePost } from '../home/Home'
import { PostCard } from '../home/components/PostCard'
import { ProfileHeader } from '../settings/components/ProfileHeader'
import { normalizeProfile, useProfile } from '../../context/ProfileContext'
import { getAllMyFeed, getAllMyFlicks, getMyAllPosts, getOtherUserFeed, getOtherUserFlicks, getOtherUserPosts, getOtherUserProfile } from '../../action/action'
import '../home/Home.css'
import '../settings/Settings.css'
import './Profile.css'

const PROFILE_PAGE_SIZE = 10

function getResponseList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

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

function ProfileEmptyPostsState({ isOwnProfile }) {
  return (
    <div className="empty-feed-state profile-empty-posts-state">
      <img src="/assets/logo_icons/noposticon.svg" alt="" />
      <h2>No posts yet</h2>
      <p>{isOwnProfile ? 'You haven’t shared any posts yet.' : 'This user hasn’t shared any posts yet.'}</p>
    </div>
  )
}

function ProfileMediaSkeleton({ count = 5, className = '' }) {
  return Array.from({ length: count }, (_, index) => (
    <span className={`profile-media-skeleton-cell ${className}`.trim()} key={index} aria-hidden="true" />
  ))
}

function ProfileMediaImage({ src, alt }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return <span className="profile-media-fallback" role="img" aria-label="Media unavailable"><span aria-hidden="true">▧</span><small>Media unavailable</small></span>
  }

  return <img src={src} alt={alt} onError={() => setHasError(true)} />
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
      setProfilePosts([])
      setProfilePage(0)
      setHasMorePosts(true)
      setIsPostsLoading(true)
    }

    const requestKey = `${isOwnProfile ? 'own' : viewedUserId}:0`
    const loadProfilePosts = async () => {
      if (postRequestsRef.current.has(requestKey)) return
      postRequestsRef.current.add(requestKey)
      try {
        const response = isOwnProfile
          ? await getMyAllPosts(0, PROFILE_PAGE_SIZE)
          : await getOtherUserPosts(viewedUserId, 0, PROFILE_PAGE_SIZE)
        const posts = getResponseList(response)
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
    return () => {
      isMounted = false
      postRequestsRef.current.delete(requestKey)
    }
  }, [isOwnProfile, viewedUserId])

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
        const nextPosts = getResponseList(response)
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
          <MediaContent isOwnProfile={isOwnProfile} viewedUserId={viewedUserId} />
        ) : activeTab === 'posts' ? (
          <ProfilePostsContent profile={isOwnProfile ? profile : viewedProfile} isOwnProfile={isOwnProfile} viewedUserId={viewedUserId} />
        ) : (
          <div className="profile-content">
            <ProfileSummary profile={isOwnProfile ? profile : viewedProfile} />
            <section className={`profile-feed ${!isOwnProfile ? 'profile-feed-other' : ''}`} aria-label="Profile posts">
              {isOwnProfile && <CreatePost />}
              {isPostsLoading && <ProfilePostSkeleton />}
              {!isPostsLoading && profilePosts.length === 0 && <ProfileEmptyPostsState isOwnProfile={isOwnProfile} />}
              {profilePosts.map((post) => (
                <PostCard
                  key={post._id || post.id}
                  post={post}
                  showReport={!isOwnProfile}
                  reportInMenu={!isOwnProfile}
                  fallbackAuthorImage={(isOwnProfile ? profile : viewedProfile)?.image}
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

function ProfilePostsContent({ profile, isOwnProfile, viewedUserId }) {
  const [postFilter, setPostFilter] = useState('all')
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const postsEndRef = useRef(null)
  const postType = postFilter === 'personal' ? 1 : postFilter === 'professional' ? 2 : undefined

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setPosts([])
    setPage(0)
    setHasMore(true)

    const request = isOwnProfile
      ? getMyAllPosts(0, PROFILE_PAGE_SIZE, postType)
      : getOtherUserPosts(viewedUserId, 0, PROFILE_PAGE_SIZE, postType)

    request
      .then((response) => {
        const nextPosts = getResponseList(response)
        if (isMounted) {
          setPosts(nextPosts)
          setHasMore(nextPosts.length >= PROFILE_PAGE_SIZE)
        }
      })
      .catch(() => {
        if (isMounted) setPosts([])
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => { isMounted = false }
  }, [isOwnProfile, postType, viewedUserId])

  useEffect(() => {
    const loadMorePosts = async () => {
      if (isLoading || isLoadingMore || !hasMore) return

      setIsLoadingMore(true)
      const nextPage = page + 1
      try {
        const response = isOwnProfile
          ? await getMyAllPosts(nextPage, PROFILE_PAGE_SIZE, postType)
          : await getOtherUserPosts(viewedUserId, nextPage, PROFILE_PAGE_SIZE, postType)
        const nextPosts = getResponseList(response)
        setPosts((currentPosts) => [...currentPosts, ...nextPosts])
        setPage(nextPage)
        setHasMore(nextPosts.length >= PROFILE_PAGE_SIZE)
      } catch {
        setHasMore(false)
      } finally {
        setIsLoadingMore(false)
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMorePosts()
    }, { rootMargin: '280px' })

    if (postsEndRef.current) observer.observe(postsEndRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, isOwnProfile, page, postType, viewedUserId])

  return (
    <div className="profile-posts-layout">
      <section className="profile-posts-content" aria-label="Profile posts">
      <div className="profile-posts-heading">
        <h2>Posts</h2>
        <button type="button">See All</button>
      </div>

      <div className="profile-posts-filters" role="tablist" aria-label="Post types">
        {['all', 'personal', 'professional'].map((filter) => (
          <button
            className={postFilter === filter ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={postFilter === filter}
            key={filter}
            onClick={() => setPostFilter(filter)}
          >
            {filter[0].toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {isOwnProfile && <div className="profile-create-post"><CreatePost /></div>}
      {isLoading && <ProfilePostSkeleton />}
      {!isLoading && posts.length === 0 && <ProfileEmptyPostsState isOwnProfile={isOwnProfile} />}
      {!isLoading && posts.map((post) => (
        <PostCard
          key={post._id || post.id}
          post={post}
          showReport={!isOwnProfile}
          reportInMenu={!isOwnProfile}
          fallbackAuthorImage={profile?.image}
          onDeleted={(postId) => setPosts((currentPosts) => currentPosts.filter((item) => (item._id || item.id) !== postId))}
        />
      ))}
      <div ref={postsEndRef} className="feed-end-marker" aria-hidden="true" />
      {isLoadingMore && <ProfilePostSkeleton />}
      </section>
      <ProfilePostsSidebar profile={profile} />
    </div>
  )
}

function ProfilePostsSidebar({ profile }) {
  const headshots = Array.isArray(profile?.headshot) ? profile.headshot : []
  const certificates = Array.isArray(profile?.certificates_or_licences) ? profile.certificates_or_licences : []
  const resume = profile?.resume

  return (
    <aside className="profile-posts-sidebar" aria-label="Profile documents">
      <section className="profile-sidebar-card">
        <h2>Headshot</h2>
        {headshots.length ? (
          <div className="profile-sidebar-scroll" aria-label="Headshots">
            {headshots.map((headshot, index) => (
              <img className="profile-headshot-image" src={headshot} alt={`Headshot ${index + 1}`} key={`${headshot}-${index}`} />
            ))}
          </div>
        ) : <ProfileSidebarEmpty label="No headshot available" />}
      </section>

      <section className="profile-sidebar-card">
        <h2>Certificates And/Or<br />Licenses</h2>
        {certificates.length ? (
          <div className="profile-sidebar-scroll" aria-label="Certificates and licenses">
            {certificates.map((certificate, index) => (
              <a className="profile-document-link" href={certificate} target="_blank" rel="noreferrer" key={`${certificate}-${index}`}>
                <span className="profile-document-icon"><img src="/assets/logo_icons/post_card_doc.svg" alt="" /></span>
                <span>View certificate {index + 1}</span>
              </a>
            ))}
          </div>
        ) : <ProfileSidebarEmpty label="No certificates available" />}
      </section>

      <section className="profile-sidebar-card">
        <h2>Resume</h2>
        {resume ? <a className="profile-document-link" href={resume} target="_blank" rel="noreferrer"><span className="profile-document-icon"><img src="/assets/logo_icons/post_card_doc.svg" alt="" /></span><span>View resume</span></a> : <ProfileSidebarEmpty label="No resume available" />}
      </section>
    </aside>
  )
}

function ProfileSidebarEmpty({ label }) {
  return <div className="profile-sidebar-empty"><span className="profile-document-icon"><img src="/assets/logo_icons/post_card_doc.svg" alt="" /></span><small>{label}</small></div>
}

function MediaContent({ isOwnProfile, viewedUserId }) {
  const [feedMedia, setFeedMedia] = useState([])
  const [myFlicks, setMyFlicks] = useState([])
  const [isMediaLoading, setIsMediaLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewFlick, setPreviewFlick] = useState(null)

  useEffect(() => {
    let isMounted = true

    const feedRequest = isOwnProfile
      ? getAllMyFeed(0, 10)
      : getOtherUserFeed(viewedUserId, 0, 10)
    const flicksRequest = isOwnProfile
      ? getAllMyFlicks(0, 10)
      : getOtherUserFlicks(viewedUserId, 0, 10)

    Promise.allSettled([feedRequest, flicksRequest])
      .then(([feedResult, flicksResult]) => {
        if (!isMounted) return
        setFeedMedia(feedResult.status === 'fulfilled' ? feedResult.value.data || [] : [])
        setMyFlicks(flicksResult.status === 'fulfilled' ? flicksResult.value.data || [] : [])
      })
      .finally(() => {
        if (isMounted) setIsMediaLoading(false)
      })

    return () => { isMounted = false }
  }, [isOwnProfile, viewedUserId])

  return (
    <section className="profile-media-content" aria-label="Profile media">
      {(isMediaLoading || feedMedia.length > 0) && <>
        <div className="profile-media-section-heading">
          <h2>My Feed</h2>
        </div>

        <div className="profile-page-media-grid">
          {isMediaLoading ? <ProfileMediaSkeleton /> : feedMedia.map((item, index) => (
              <div className="profile-media-cell" key={item._id || item.id || index}>
                {item.mediaType === 'video' ? (
                  <video src={item.media} poster={item.thumbnail || undefined} muted playsInline controls preload="metadata" aria-label={`Feed video ${index + 1}`} />
                ) : item.mediaType === 'document' ? (
                  <a href={item.media} target="_blank" rel="noreferrer" aria-label={`Open document ${index + 1}`}>
                    {item.thumbnail ? <ProfileMediaImage src={item.thumbnail} alt={`Document ${index + 1}`} /> : <span>Open document</span>}
                  </a>
                ) : (
                  <button className="profile-media-preview-trigger" type="button" onClick={() => setPreviewImage(item.media || item.thumbnail)}>
                    <ProfileMediaImage src={item.media || item.thumbnail} alt={`Feed media ${index + 1}`} />
                  </button>
                )}
              </div>
            ))}
        </div>
      </>}

      {(isMediaLoading || myFlicks.length > 0) && <>
        <div className="profile-flicks-heading">
          <h2>Flicks</h2>
          <Link to="/flicks">See All</Link>
        </div>

        <div className="profile-flicks-tabs">
          <button className="active" type="button">Your Flicks</button>
        </div>

        <div className="profile-flicks-grid">
          {isMediaLoading ? <ProfileMediaSkeleton count={5} className="profile-flick-skeleton-cell" /> : myFlicks.map((flick, index) => (
            <video
              key={flick._id || flick.id || index}
              className="profile-flick-preview-trigger"
              src={flick.media}
              poster={flick.thumbnail || undefined}
              muted
              playsInline
              controls
              preload="metadata"
              aria-label={`Preview Flick ${index + 1}`}
              onClick={() => setPreviewFlick(flick)}
            />
          ))}
        </div>
      </>}

      {!isMediaLoading && feedMedia.length === 0 && myFlicks.length === 0 && (
        <div className="profile-media-empty">
          <img src="/assets/logo_icons/noposticon.svg" alt="" />
          <h2>No records found</h2>
          <p>No media or flicks available yet.</p>
        </div>
      )}

      {previewImage && (
        <div className="profile-media-preview-backdrop" role="presentation" onClick={() => setPreviewImage(null)}>
          <div className="profile-media-preview-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="profile-media-preview-close" aria-label="Close image preview" onClick={() => setPreviewImage(null)}>×</button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}

      {previewFlick && (
        <div className="profile-media-preview-backdrop" role="presentation" onClick={() => setPreviewFlick(null)}>
          <div className="profile-media-preview-modal profile-flick-preview-modal" role="dialog" aria-modal="true" aria-label="Flick preview" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="profile-media-preview-close" aria-label="Close flick preview" onClick={() => setPreviewFlick(null)}>×</button>
            <video src={previewFlick.media} poster={previewFlick.thumbnail || undefined} controls autoPlay playsInline aria-label="Flick preview" />
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

