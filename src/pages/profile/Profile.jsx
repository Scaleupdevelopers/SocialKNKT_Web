import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { CreatePost } from '../home/Home'
import { PostCard } from '../home/components/PostCard'
import { ProfileHeader } from '../settings/components/ProfileHeader'
import { normalizeProfile, useProfile } from '../../context/ProfileContext'
import {
  getAllMyFeed,
  getAllMyFlicks,
  getMyAllPosts,
  getOtherUserFeed,
  getOtherUserFlicks,
  getOtherUserPosts,
  getOtherUserProfile,
} from '../../action/action'
import '../home/Home.css'
import '../settings/Settings.css'
import './Profile.css'
import { usePagedList } from '../../utils/usePagedList'

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
      <div className="post-skeleton-author">
        <span className="post-skeleton-avatar" />
        <div className="post-skeleton-author-copy">
          <span className="post-skeleton-line post-skeleton-name" />
          <span className="post-skeleton-line post-skeleton-meta" />
        </div>
      </div>
      <span className="post-skeleton-line post-skeleton-content" />
      <span className="post-skeleton-media" />
      <div className="post-skeleton-actions">
        <span className="post-skeleton-action" />
        <span className="post-skeleton-action" />
        <span className="post-skeleton-action" />
      </div>
    </article>
  )
}

function ProfileEmptyPostsState({ isOwnProfile }) {
  return (
    <div className="empty-feed-state profile-empty-posts-state">
      <img src="/assets/logo_icons/noposticon.svg" alt="" />
      <h2>No posts yet</h2>
      <p>
        {isOwnProfile
          ? 'You haven’t shared any posts yet.'
          : 'This user hasn’t shared any posts yet.'}
      </p>
    </div>
  )
}

function ProfileMediaSkeleton({ count = 5, className = '' }) {
  return Array.from({ length: count }, (_, index) => (
    <span
      className={`profile-media-skeleton-cell ${className}`.trim()}
      key={index}
      aria-hidden="true"
    />
  ))
}

function ProfileMediaImage({ src, alt }) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <span className="profile-media-fallback" role="img" aria-label="Media unavailable">
        <span aria-hidden="true">▧</span>
        <small>Media unavailable</small>
      </span>
    )
  }

  return <img src={src} alt={alt} onError={() => setHasError(true)} />
}

function profileIdentity(profile) {
  return profile?.id || profile?._id || profile?.userId
}

export function Profile() {
  const context = useProfile()
  const [searchParams] = useSearchParams()
  const requestedUserId = searchParams.get('userId')
  const currentUserId = profileIdentity(context.profile)
  const viewedUserId = requestedUserId || currentUserId
  const isOwnProfile = !requestedUserId || String(viewedUserId) === String(currentUserId)
  return (
    <ProfileView
      key={`${context.authToken || currentUserId}:${viewedUserId || 'own'}`}
      context={context}
      viewedUserId={viewedUserId}
      isOwnProfile={isOwnProfile}
    />
  )
}

function ProfileView({ context, viewedUserId, isOwnProfile }) {
  const [remote, setRemote] = useState({
    profile: null,
    loading: !isOwnProfile,
    error: false,
  })
  const [revision, setRevision] = useState(0)
  const [activeTab, setActiveTab] = useState('all')
  useEffect(() => {
    if (isOwnProfile) return
    const changed = () => setRevision((value) => value + 1)
    window.addEventListener('connections-change', changed)
    return () => window.removeEventListener('connections-change', changed)
  }, [isOwnProfile])
  useEffect(() => {
    if (isOwnProfile) return
    let active = true
    setRemote({ profile: null, loading: true, error: false })
    getOtherUserProfile(viewedUserId)
      .then((response) => {
        const data = response.data?.data || response.data
        if (!data || Array.isArray(data)) throw new Error('Missing profile')
        if (active) setRemote({ profile: normalizeProfile(data), loading: false, error: false })
      })
      .catch(() => {
        if (active) setRemote({ profile: null, loading: false, error: true })
      })
    return () => {
      active = false
    }
  }, [isOwnProfile, viewedUserId, revision])
  const displayed = isOwnProfile ? context.profile : remote.profile
  const loading = isOwnProfile ? context.isLoading : remote.loading
  const error = isOwnProfile ? context.error : remote.error
  const refresh = () => {
    if (isOwnProfile) return context.refreshProfile()
    setRevision((value) => value + 1)
  }

  return (
    <main className="profile-page settings-page">
      <Header />
      <section className="settings-profile-card profile-card-page">
        <ProfileHeader
          profileOverride={displayed}
          isLoadingOverride={loading}
          isOtherProfile={!isOwnProfile}
          onRelationshipChanged={refresh}
        />
        {error && (
          <div role="alert">
            Unable to load profile.{' '}
            <button type="button" onClick={refresh}>
              Retry profile
            </button>
          </div>
        )}
        {loading && !displayed && <p role="status">Loading profile…</p>}
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
        {displayed && (
          <div key={`${activeTab}:${revision}`}>
            <ProfileTabContent
              activeTab={activeTab}
              profile={displayed}
              isOwnProfile={isOwnProfile}
              viewedUserId={viewedUserId}
            />
          </div>
        )}
      </section>
    </main>
  )
}

function ProfileTabContent({ activeTab, profile, isOwnProfile, viewedUserId }) {
  return (
    <>
      {' '}
      {activeTab === 'media' ? (
        <MediaContent isOwnProfile={isOwnProfile} viewedUserId={viewedUserId} />
      ) : activeTab === 'posts' ? (
        <ProfilePostsContent
          profile={profile}
          isOwnProfile={isOwnProfile}
          viewedUserId={viewedUserId}
        />
      ) : (
        <div className="profile-content">
          <ProfileSummary profile={profile} />
          <section
            className={`profile-feed ${!isOwnProfile ? 'profile-feed-other' : ''}`}
            aria-label="Profile posts"
          >
            {isOwnProfile && <CreatePost />}
            <ProfilePostList
              profile={profile}
              isOwnProfile={isOwnProfile}
              viewedUserId={viewedUserId}
            />
          </section>
        </div>
      )}
    </>
  )
}

function ListFeedback({ list, label }) {
  return (
    <>
      {list.loading && <p role="status">Loading {label}…</p>}
      {list.error && (
        <div role="alert">
          Unable to load {label}.{' '}
          <button type="button" onClick={list.loadMore}>
            Retry {label}
          </button>
        </div>
      )}
      {list.hasMore && !list.error && (
        <button type="button" disabled={list.loading} onClick={list.loadMore}>
          Load more {label}
        </button>
      )}
    </>
  )
}

function ProfilePostList({ profile, isOwnProfile, viewedUserId, postType }) {
  const loadPage = useCallback(
    async (page) => {
      const response = isOwnProfile
        ? await getMyAllPosts(page, PROFILE_PAGE_SIZE, postType)
        : await getOtherUserPosts(viewedUserId, page, PROFILE_PAGE_SIZE, postType)
      return { data: getResponseList(response) }
    },
    [isOwnProfile, viewedUserId, postType],
  )
  const list = usePagedList(loadPage, PROFILE_PAGE_SIZE)
  const end = useRef(null)
  useEffect(() => {
    if (!list.hasMore || list.loading || list.error) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) list.loadMore()
      },
      { rootMargin: '280px' },
    )
    if (end.current) observer.observe(end.current)
    return () => observer.disconnect()
  }, [list])
  const posts = list.items
  return (
    <>
      {list.loading && !posts.length && <ProfilePostSkeleton />}
      {!list.loading && !list.error && !posts.length && (
        <ProfileEmptyPostsState isOwnProfile={isOwnProfile} />
      )}
      {posts.map((post) => (
        <PostCard
          key={post._id || post.id}
          post={post}
          showReport={!isOwnProfile}
          reportInMenu={!isOwnProfile}
          fallbackAuthorImage={profile?.image}
          onDeleted={list.reload}
        />
      ))}
      <ListFeedback list={list} label="posts" />
      <div ref={end} className="feed-end-marker" aria-hidden="true" />
    </>
  )
}

function ProfilePostsContent({ profile, isOwnProfile, viewedUserId }) {
  const [postFilter, setPostFilter] = useState('all')
  // Profile-list filter inputs differ from stored Post.postType: personal=1, professional=2.
  const postType = { personal: 1, professional: 2 }[postFilter]
  return (
    <div className="profile-posts-layout">
      <section className="profile-posts-content" aria-label="Profile posts">
        <div className="profile-posts-heading">
          <h2>Posts</h2>
          <button type="button" onClick={() => setPostFilter('all')}>
            See All
          </button>
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
        {isOwnProfile && (
          <div className="profile-create-post">
            <CreatePost />
          </div>
        )}
        <ProfilePostList
          key={postFilter}
          profile={profile}
          isOwnProfile={isOwnProfile}
          viewedUserId={viewedUserId}
          postType={postType}
        />
      </section>
      <ProfilePostsSidebar profile={profile} />
    </div>
  )
}

function ProfilePostsSidebar({ profile }) {
  const headshots = Array.isArray(profile?.headshot) ? profile.headshot : []
  const certificates = Array.isArray(profile?.certificates_or_licences)
    ? profile.certificates_or_licences
    : []
  const resume = profile?.resume

  return (
    <aside className="profile-posts-sidebar" aria-label="Profile documents">
      <section className="profile-sidebar-card">
        <h2>Headshot</h2>
        {headshots.length ? (
          <div className="profile-sidebar-scroll" aria-label="Headshots">
            {headshots.map((headshot, index) => (
              <img
                className="profile-headshot-image"
                src={headshot}
                alt={`Headshot ${index + 1}`}
                key={`${headshot}-${index}`}
              />
            ))}
          </div>
        ) : (
          <ProfileSidebarEmpty label="No headshot available" />
        )}
      </section>

      <section className="profile-sidebar-card">
        <h2>
          Certificates And/Or
          <br />
          Licenses
        </h2>
        {certificates.length ? (
          <div className="profile-sidebar-scroll" aria-label="Certificates and licenses">
            {certificates.map((certificate, index) => (
              <a
                className="profile-document-link"
                href={certificate}
                target="_blank"
                rel="noreferrer"
                key={`${certificate}-${index}`}
              >
                <span className="profile-document-icon">
                  <img src="/assets/logo_icons/post_card_doc.svg" alt="" />
                </span>
                <span>View certificate {index + 1}</span>
              </a>
            ))}
          </div>
        ) : (
          <ProfileSidebarEmpty label="No certificates available" />
        )}
      </section>

      <section className="profile-sidebar-card">
        <h2>Resume</h2>
        {resume ? (
          <a className="profile-document-link" href={resume} target="_blank" rel="noreferrer">
            <span className="profile-document-icon">
              <img src="/assets/logo_icons/post_card_doc.svg" alt="" />
            </span>
            <span>View resume</span>
          </a>
        ) : (
          <ProfileSidebarEmpty label="No resume available" />
        )}
      </section>
    </aside>
  )
}

function ProfileSidebarEmpty({ label }) {
  return (
    <div className="profile-sidebar-empty">
      <span className="profile-document-icon">
        <img src="/assets/logo_icons/post_card_doc.svg" alt="" />
      </span>
      <small>{label}</small>
    </div>
  )
}

function MediaContent({ isOwnProfile, viewedUserId }) {
  const loadFeed = useCallback(
    async (page) => {
      const response = isOwnProfile
        ? await getAllMyFeed(page, PROFILE_PAGE_SIZE)
        : await getOtherUserFeed(viewedUserId, page, PROFILE_PAGE_SIZE)
      return { data: getResponseList(response) }
    },
    [isOwnProfile, viewedUserId],
  )
  const loadFlicks = useCallback(
    async (page) => {
      const response = isOwnProfile
        ? await getAllMyFlicks(page, PROFILE_PAGE_SIZE)
        : await getOtherUserFlicks(viewedUserId, page, PROFILE_PAGE_SIZE)
      return { data: getResponseList(response) }
    },
    [isOwnProfile, viewedUserId],
  )
  const feed = usePagedList(loadFeed, PROFILE_PAGE_SIZE)
  const flicks = usePagedList(loadFlicks, PROFILE_PAGE_SIZE)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewFlick, setPreviewFlick] = useState(null)

  return (
    <section className="profile-media-content" aria-label="Profile media">
      <FeedMediaSection feed={feed} onPreview={setPreviewImage} />

      <ListFeedback list={feed} label="feed media" />

      <FlickMediaSection flicks={flicks} onPreview={setPreviewFlick} />

      <ListFeedback list={flicks} label="flicks" />

      {mediaCollectionsEmpty(feed, flicks) && (
        <div className="profile-media-empty">
          <img src="/assets/logo_icons/noposticon.svg" alt="" />
          <h2>No records found</h2>
          <p>No media or flicks available yet.</p>
        </div>
      )}

      {previewImage && (
        <div
          className="profile-media-preview-backdrop"
          role="presentation"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="profile-media-preview-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="profile-media-preview-close"
              aria-label="Close image preview"
              onClick={() => setPreviewImage(null)}
            >
              ×
            </button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}

      {previewFlick && (
        <div
          className="profile-media-preview-backdrop"
          role="presentation"
          onClick={() => setPreviewFlick(null)}
        >
          <div
            className="profile-media-preview-modal profile-flick-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Flick preview"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="profile-media-preview-close"
              aria-label="Close flick preview"
              onClick={() => setPreviewFlick(null)}
            >
              ×
            </button>
            <video
              src={previewFlick.media}
              poster={previewFlick.thumbnail || undefined}
              controls
              autoPlay
              playsInline
              aria-label="Flick preview"
            />
          </div>
        </div>
      )}
    </section>
  )
}

function mediaCollectionsEmpty(feed, flicks) {
  return (
    !feed.loading &&
    !flicks.loading &&
    !feed.error &&
    !flicks.error &&
    feed.items.length === 0 &&
    flicks.items.length === 0
  )
}

function ProfileSummary({ profile }) {
  return (
    <aside className="profile-summary">
      <h2>Bio</h2>
      <p>{profile?.bio || 'No bio added yet.'}</p>

      <WorkSummary profile={profile} />
      <EducationSummary profile={profile} />
      <LocationSummary profile={profile} />
      <BasicSummary profile={profile} />
      <PronunciationSummary profile={profile} />
    </aside>
  )
}

function FeedMediaSection({ feed, onPreview }) {
  const feedMedia = feed.items
  return (
    <>
      {' '}
      {(feed.loading || feed.error || feedMedia.length > 0) && (
        <>
          <div className="profile-media-section-heading">
            <h2>My Feed</h2>
          </div>

          <div className="profile-page-media-grid">
            {feed.loading && !feedMedia.length ? (
              <ProfileMediaSkeleton />
            ) : (
              feedMedia.map((item, index) => (
                <div className="profile-media-cell" key={item._id || item.id || index}>
                  <FeedMediaItem item={item} index={index} onPreview={onPreview} />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </>
  )
}

function FeedMediaItem({ item, index, onPreview }) {
  return (
    <>
      {' '}
      {item.mediaType === 'video' ? (
        <video
          src={item.media}
          poster={item.thumbnail || undefined}
          muted
          playsInline
          controls
          preload="metadata"
          aria-label={`Feed video ${index + 1}`}
        />
      ) : item.mediaType === 'document' ? (
        <a
          href={item.media}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open document ${index + 1}`}
        >
          {item.thumbnail ? (
            <ProfileMediaImage src={item.thumbnail} alt={`Document ${index + 1}`} />
          ) : (
            <span>Open document</span>
          )}
        </a>
      ) : (
        <button
          className="profile-media-preview-trigger"
          type="button"
          onClick={() => onPreview(item.media || item.thumbnail)}
        >
          <ProfileMediaImage
            src={item.media || item.thumbnail}
            alt={`Feed media ${index + 1}`}
          />
        </button>
      )}
    </>
  )
}

function FlickMediaSection({ flicks, onPreview }) {
  const myFlicks = flicks.items
  return (
    <>
      {' '}
      {(flicks.loading || flicks.error || myFlicks.length > 0) && (
        <>
          <div className="profile-flicks-heading">
            <h2>Flicks</h2>
            <Link to="/flicks">See All</Link>
          </div>

          <div className="profile-flicks-tabs">
            <button className="active" type="button">
              Your Flicks
            </button>
          </div>

          <div className="profile-flicks-grid">
            {flicks.loading && !myFlicks.length ? (
              <ProfileMediaSkeleton count={5} className="profile-flick-skeleton-cell" />
            ) : (
              myFlicks.map((flick, index) => (
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
                  onClick={() => onPreview(flick)}
                />
              ))
            )}
          </div>
        </>
      )}
    </>
  )
}

function WorkSummary({ profile }) {
  const work = profile?.workExperiences || []
  return (
    <>
      {' '}
      <h2>Work</h2>
      {work.length ? (
        work.map((item, index) => (
          <p className="profile-summary-item" key={`work-${index}`}>
            <img
              className="profile-summary-icon-circle"
              src="/assets/logo_icons/bag_exp.svg"
              alt=""
            />{' '}
            <span>{item.jobTitle || item.companyName || 'No workplace to show'}</span>
          </p>
        ))
      ) : (
        <p className="profile-summary-item">
          <img
            className="profile-summary-icon-circle"
            src="/assets/logo_icons/bag_exp.svg"
            alt=""
          />{' '}
          <span>No workplaces to show</span>
        </p>
      )}
    </>
  )
}

function EducationSummary({ profile }) {
  const education = profile?.educations || []
  return (
    <>
      {' '}
      <h2>Education</h2>
      {education.length ? (
        education.map((item, index) => (
          <p className="profile-summary-item" key={`education-${index}`}>
            <img src="/assets/logo_icons/education.svg" alt="" />{' '}
            <span>{item.school || item.degree || 'Education'}</span>
          </p>
        ))
      ) : (
        <p className="profile-summary-item">
          <img src="/assets/logo_icons/education.svg" alt="" />{' '}
          <span>No education to show</span>
        </p>
      )}
    </>
  )
}

function LocationSummary({ profile }) {
  const locations = profile?.places || []
  return (
    <>
      {' '}
      <h2>Places Lived</h2>
      {locations.length ? (
        locations.map((item, index) => (
          <p className="profile-summary-item" key={`location-${index}`}>
            <img
              className="profile-summary-icon-circle"
              src="/assets/logo_icons/location_profile.svg"
              alt=""
            />{' '}
            <span>
              {[
                item.cityName || item.city,
                item.stateName || item.state,
                item.countryName || item.country,
              ]
                .filter(Boolean)
                .join(', ')}
              <small>{item.currentlyLiving ? 'Current City' : ''}</small>
            </span>
          </p>
        ))
      ) : (
        <p className="profile-summary-item">
          <img
            className="profile-summary-icon-circle"
            src="/assets/logo_icons/location_profile.svg"
            alt=""
          />{' '}
          <span>No locations to show</span>
        </p>
      )}
    </>
  )
}

function BasicSummary({ profile }) {
  return (
    <>
      {' '}
      <h2>Basic Info</h2>
      <p className="profile-summary-item">
        <img
          className="profile-summary-icon-circle"
          src={
            String(profile?.gender || '').toLowerCase() === 'female'
              ? '/assets/logo_icons/fa_female.svg'
              : '/assets/logo_icons/male.webp'
          }
          alt=""
        />{' '}
        <span>
          {profile?.gender || 'Not added'}
          <small>Gender</small>
        </span>
      </p>
    </>
  )
}

function PronunciationSummary({ profile }) {
  return (
    <>
      {' '}
      <h2>Name pronunciation</h2>
      {profile?.record_name && (
        <audio
          controls
          preload="none"
          aria-label="Name pronunciation recording"
          src={profile.record_name}
          style={{ maxWidth: '100%' }}
        />
      )}
      <p className="profile-summary-item">
        <img
          className="profile-summary-icon-circle"
          src="/assets/logo_icons/sound.svg"
          alt=""
        />{' '}
        <span>{profile?.phonetic_spelling || 'Not added'}</span>
      </p>
    </>
  )
}
