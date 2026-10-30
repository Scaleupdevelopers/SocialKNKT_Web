import { useEffect, useRef, useState } from 'react'
import { AskShareModal } from '../../components/modals/AskShareModal/AskShareModal'
import { Header } from '../../layouts/Header'
import { FlicksSection } from './components/FlicksSection'
import { PostCard } from './components/PostCard'
import { ProfileCard } from './components/ProfileCard'
import { SidebarMenu } from './components/SidebarMenu'
import './Home.css'

const profileIcon = '/assets/logo_icons/profile_avatar.png'
const professionalIcon = '/assets/logo_icons/Professional.svg'
const connectionIcon = '/assets/logo_icons/connection.svg'
const dropdownIcon = '/assets/logo_icons/postadddropdown.svg'

const addOptions = [
  ['post_card_img.svg', 'Add a photo'],
  ['post_card_chat.svg', 'Create KNKT(n) Thread'],
  ['post_card_video.svg', 'Add flicks'],
  ['post_card_video.svg', 'Take a video'],
  ['post_card_video_link.svg', 'Add Video Link'],
  ['post_card_doc.svg', 'Add a document'],
]

const restaurantImages = [
  '/assets/home/restaurant-01.jpg',
  '/assets/home/restaurant-02.jpg',
  '/assets/home/restaurant-03.jpg',
  '/assets/home/restaurant-04.jpg',
  '/assets/home/restaurant-05.jpg',
  '/assets/home/restaurant-06.jpg',
]

const feedPosts = [
  {
    name: 'Robert Jacob',
    role: 'Food Photographer',
    hours: '16 h',
    content: 'A warm table, good company, and a plate worth remembering. Some places just make every moment feel special.',
    image: restaurantImages[0],
    likes: 42,
    comments: 18,
  },
  {
    name: 'Maya Chen',
    role: 'Creative Director',
    hours: '12 h',
    content: 'Found a beautiful little corner filled with natural light and thoughtful details. Inspiration is everywhere.',
    image: restaurantImages[1],
    likes: 36,
    comments: 11,
  },
  {
    name: 'Ethan Brooks',
    role: 'Travel Creator',
    hours: '8 h',
    content: 'Weekend plans: discover a new neighbourhood, try something delicious, and take the long way home.',
    image: restaurantImages[2],
    likes: 58,
    comments: 24,
  },
  {
    name: 'Sofia Martinez',
    role: 'Lifestyle Designer',
    hours: '5 h',
    content: 'The best memories are often made around a table. Sharing a few frames from today’s favourite spot.',
    image: restaurantImages[3],
    likes: 29,
    comments: 9,
  },
  {
    name: 'Noah Williams',
    role: 'Community Builder',
    hours: '2 h',
    content: 'A little calm, a little colour, and a lot of character. This place deserves a spot on your list.',
    image: restaurantImages[4],
    likes: 47,
    comments: 16,
  },
]

export function Home() {
  return (
    <main className="home-page">
      <Header />

      <div className="home-layout">
        <aside className="home-left-column">
          <ProfileCard />
          <SidebarMenu />
        </aside>

        <section className="home-feed" aria-label="Home feed">
          <CreatePost />
          <div className="feed-posts">
            {feedPosts.map((post) => (
              <PostCard
                key={`${post.name}-${post.hours}`}
                post={post}
              />
            ))}
          </div>
          <FlicksSection images={restaurantImages} />
        </section>

      </div>
    </main>
  )
}

function CreatePost() {
  const [profileType, setProfileType] = useState('Professional')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isAskShareOpen, setIsAskShareOpen] = useState(false)
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [postText, setPostText] = useState('')
  const editorRef = useRef(null)
  const createPostRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (createPostRef.current?.contains(event.target)) {
        return
      }

      setIsProfileMenuOpen(false)
      setIsAddMenuOpen(false)

      if (!postText.trim()) {
        setIsEditorFocused(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [postText])

  return (
    <section ref={createPostRef} className="create-post">
      <div className="feed-user-row">
        <img src={profileIcon} alt="Dianne Russell" />
        <div>
          <h2>Dianne Russell</h2>
          <ProfileTypeSelector
            value={profileType}
            isOpen={isProfileMenuOpen}
            onToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            onSelect={(type) => {
              setProfileType(type)
              setIsProfileMenuOpen(false)
            }}
          />
        </div>
      </div>
      <div className="post-editor">
        <textarea
          ref={editorRef}
          placeholder={isEditorFocused ? '' : 'What new with you?'}
          aria-label="Post content"
          value={postText}
          onChange={(event) => setPostText(event.target.value)}
          onFocus={() => setIsEditorFocused(true)}
        />
        {!isEditorFocused && (
          <button
            className="post-editor-edit"
            type="button"
            aria-label="Edit post"
            onClick={() => {
              setIsEditorFocused(true)
              editorRef.current?.focus()
            }}
          >
            <img src="/assets/logo_icons/editPost.svg" alt="" />
          </button>
        )}
      </div>
      <div className="create-post-actions">
        <div className="home-add-wrapper">
          <button
            type="button"
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
          >
            Add
            <img className="post-add-dropdown" src={dropdownIcon} alt="" />
          </button>
          {isAddMenuOpen && (
            <AddContentMenu
              onCreateThread={() => {
                setIsAddMenuOpen(false)
                setIsAskShareOpen(true)
              }}
            />
          )}
        </div>
        <button className="post-button" type="button">
          <img src="/assets/logo_icons/Send.svg" alt="" />
          Post
        </button>
      </div>
      {isAskShareOpen && <AskShareModal onClose={() => setIsAskShareOpen(false)} />}
    </section>
  )
}

function ProfileTypeSelector({ value, isOpen, onToggle, onSelect }) {
  return (
    <div className="home-profile-selector">
      <button type="button" onClick={onToggle}>
        <img src={value === 'Professional' ? professionalIcon : connectionIcon} alt="" />
        {value}
        <img className="post-add-dropdown" src={dropdownIcon} alt="" />
      </button>
      {isOpen && (
        <div className="home-profile-menu">
          {['Both', 'Personal', 'Professional'].map((type) => (
            <button type="button" key={type} onClick={() => onSelect(type)}>
              <img src={type === 'Professional' ? professionalIcon : connectionIcon} alt="" />
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AddContentMenu({ onCreateThread }) {
  return (
    <div className="home-add-menu">
      {addOptions.map(([icon, label]) => (
        <button
          type="button"
          key={label}
          onClick={label === 'Create KNKT(n) Thread' ? onCreateThread : undefined}
        >
          <img src={`/assets/logo_icons/${icon}`} alt="" />
          {label}
        </button>
      ))}
    </div>
  )
}


