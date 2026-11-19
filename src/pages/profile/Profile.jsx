import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../../layouts/Header'
import { CreatePost } from '../home/Home'
import { PostCard } from '../home/components/PostCard'
import { ProfileHeader } from '../settings/components/ProfileHeader'
import { useProfile } from '../../context/ProfileContext'
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
  const { profile } = useProfile()
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
            <ProfileSummary profile={profile} />
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

function ProfileSummary({ profile }) {
  const work = profile?.workExperiences || []
  const education = profile?.educations || []
  const locations = profile?.placesLived || profile?.locations || []
  return (
    <aside className="profile-summary">
      <h2>Bio</h2>
      <p>{profile?.bio || 'No bio added yet.'}</p>

      <h2>Work</h2>
      {work.length ? work.map((item, index) => <p className="profile-summary-item" key={`work-${index}`}>💼 <span>{item.jobTitle || item.companyName || 'No workplace to show'}</span></p>) : <p className="profile-summary-item">💼 <span>No workplaces to show</span></p>}

      <h2>Education</h2>
      {education.length ? education.map((item, index) => <p className="profile-summary-item" key={`education-${index}`}>🎓 <span>{item.schoolName || item.instituteName || item.degree || 'Education'}</span></p>) : <p className="profile-summary-item">🎓 <span>No education to show</span></p>}

      <h2>Places Lived</h2>
      {locations.length ? locations.map((item, index) => <p className="profile-summary-item" key={`location-${index}`}><img src="/assets/logo_icons/location.svg" alt="" /> <span>{[item.cityName || item.city, item.stateName || item.state, item.countryName || item.country].filter(Boolean).join(', ')}<small>{item.currentlyLiving ? 'Current City' : ''}</small></span></p>) : <p className="profile-summary-item"><img src="/assets/logo_icons/location.svg" alt="" /> <span>No locations to show</span></p>}

      <h2>Basic Info</h2>
      <p className="profile-summary-item">♀ <span>{profile?.gender || 'Not added'}<small>Gender</small></span></p>

      <h2>Name pronunciation</h2>
      <p className="profile-summary-item">🔊 <span>{profile?.phonetic_spelling || 'Not added'}</span></p>
    </aside>
  )
}

