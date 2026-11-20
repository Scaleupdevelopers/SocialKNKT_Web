import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { CreatePost } from '../home/Home'
import { PostCard } from '../home/components/PostCard'
import { ProfileHeader } from '../settings/components/ProfileHeader'
import { useProfile } from '../../context/ProfileContext'
import { getProfileMedia } from '../../action/action'
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

const restaurantImages = [
  '/assets/home/restaurant-01.jpg',
  '/assets/home/restaurant-02.jpg',
  '/assets/home/restaurant-03.jpg',
]

export function Profile() {
  const { profile } = useProfile()
  const [searchParams] = useSearchParams()
  const viewedUserId = searchParams.get('userId') || profile?.id
  const isOwnProfile = !searchParams.get('userId') || viewedUserId === profile?.id
  const [activeTab, setActiveTab] = useState('all')
  const [profilePosts, setProfilePosts] = useState([])
  const [isPostsLoading, setIsPostsLoading] = useState(true)
  const [profilePage, setProfilePage] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false)
  const postsEndRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const loadProfilePosts = async () => {
      try {
        const response = await getProfileMedia(0, PROFILE_PAGE_SIZE, viewedUserId)
        const posts = response.data || []
        if (isMounted) {
          setProfilePosts(posts)
          setProfilePage(0)
          setHasMorePosts(posts.length >= PROFILE_PAGE_SIZE)
        }
      } catch {
        if (isMounted) setProfilePosts([])
      } finally {
        if (isMounted) setIsPostsLoading(false)
      }
    }

    loadProfilePosts()
    return () => { isMounted = false }
  }, [profile?.id, viewedUserId])

  useEffect(() => {
    const loadMorePosts = async () => {
      if (isPostsLoading || isLoadingMorePosts || !hasMorePosts) return
      setIsLoadingMorePosts(true)
      try {
        const nextPage = profilePage + 1
        const response = await getProfileMedia(nextPage, PROFILE_PAGE_SIZE, viewedUserId)
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
  }, [hasMorePosts, isLoadingMorePosts, isPostsLoading, profile?.id, profilePage, viewedUserId])

  return (
    <main className="profile-page settings-page">
      <Header />
      <section className="settings-profile-card profile-card-page">
        <ProfileHeader />

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
            <ProfileSummary profile={profile} />
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
  const feedImages = [...restaurantImages, ...restaurantImages, ...restaurantImages]
  const flickImages = [
    ...restaurantImages,
    ...restaurantImages,
  ]

  return (
    <section className="profile-media-content" aria-label="Profile media">
      <div className="profile-media-section-heading">
        <h2>My Feed</h2>
      </div>

      <div className="profile-page-media-grid">
        {Array.from({ length: 10 }, (_, index) => feedImages[index] || null).map((image, index) => (
          <div className="profile-media-cell" key={`${image || 'empty'}-${index}`}>
            {image && <img src={image} alt={`Feed media ${index + 1}`} />}
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
        {flickImages.map((image, index) => (
          <img key={`${image}-flick-${index}`} src={image} alt={`Flick ${index + 1}`} />
        ))}
      </div>
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

