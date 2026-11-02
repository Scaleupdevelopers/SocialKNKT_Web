import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { CreatePost } from '../home/Home'
import { PostCard } from '../home/components/PostCard'
import { ProfileHeader } from '../settings/components/ProfileHeader'
import '../home/Home.css'
import '../settings/Settings.css'
import './Profile.css'

const restaurantImages = [
  '/assets/home/restaurant-01.jpg',
  '/assets/home/restaurant-02.jpg',
  '/assets/home/restaurant-03.jpg',
]

const profilePosts = [
  {
    name: 'Dianne Russell',
    role: 'Professional',
    hours: '16 h',
    content: 'From day 1, Figma was purpose-built for designers. As product development has become increasingly collaborative.',
    image: restaurantImages[0],
    likes: 10,
    comments: 20,
  },
  {
    name: 'Dianne Russell',
    role: 'Professional',
    hours: '16 h',
    content: 'Sharing a few moments from the places and ideas that inspire my work.',
    image: restaurantImages[1],
    likes: 18,
    comments: 12,
  },
]

export function Profile() {
  const [activeTab, setActiveTab] = useState('all')

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
            <ProfileSummary />
            <section className="profile-feed" aria-label="Profile posts">
              <CreatePost />
              {profilePosts.map((post) => (
                <PostCard key={`${post.name}-${post.hours}-${post.image}`} post={post} />
              ))}
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

function ProfileSummary() {
  return (
    <aside className="profile-summary">
      <h2>Bio</h2>
      <p>I’m exploring entrepreneurship after several years in finance and operations. I’m passionate about building something meaningful and enjoy working with people who value trust, ownership, and thoughtful execution.</p>

      <h2>Work</h2>
      <p className="profile-summary-item">💼 <span>No workplaces to show</span></p>

      <h2>Education</h2>
      <p className="profile-summary-item">🎓 <span>Studied at Gaston College</span></p>
      <p className="profile-summary-item">🎓 <span>Went to Lincolnton High</span></p>

      <h2>Places Lived</h2>
      <p className="profile-summary-item">📍 <span>Lincolnton, North Carolina<small>Current City</small></span></p>
      <p className="profile-summary-item">📍 <span>Lincolnton, North Carolina<small>Hometown</small></span></p>

      <h2>Basic Info</h2>
      <p className="profile-summary-item">♀ <span>Female<small>Gender</small></span></p>

      <h2>Name pronunciation</h2>
      <p className="profile-summary-item">🔊 <span>ri-bek-uh</span></p>
    </aside>
  )
}

