import { Header } from '../../layouts/Header'
import './Home.css'

const profileIcon = '/assets/logo_icons/profile_avatar.png'
const professionalIcon = '/assets/logo_icons/Professional.svg'

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
          <FlicksSection />
        </section>

        <aside className="home-right-column">
          <WhoToFollow />
        </aside>
      </div>
    </main>
  )
}

function ProfileCard() {
  return (
    <section className="profile-card">
      <div className="profile-cover" />
      <div className="profile-avatar">
        <img src={profileIcon} alt="Dianne Russell" />
      </div>
      <div className="profile-card-content">
        <h1>Dianne Russell</h1>
        <p className="profile-role">UI UX Designer</p>
        <p className="profile-bio">
          Design, Art, photography, Dance, Creativity, Nature, Lifestyle
          <span aria-hidden="true"> 💗🦋🌺</span>
        </p>
      </div>
    </section>
  )
}

function SidebarMenu() {
  const items = [
    ['saveIcon.svg', 'Saved Flicks'],
    ['connection.svg', 'Connections'],
    ['setting.svg', 'Settings'],
  ]

  return (
    <nav className="sidebar-menu" aria-label="Profile menu">
      {items.map(([icon, label]) => (
        <button type="button" key={label}>
          <img src={`/assets/logo_icons/${icon}`} alt="" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function CreatePost() {
  return (
    <section className="create-post">
      <div className="feed-user-row">
        <img src={profileIcon} alt="Dianne Russell" />
        <div>
          <h2>Dianne Russell</h2>
          <p>
            <img className="professional-icon" src={professionalIcon} alt="" />
            Professional <span className="orange-caret"><img className="post-add-dropdown" src="/assets/logo_icons/postadddropdown.svg" alt="" /></span>
          </p>
        </div>
      </div>
      <div className="post-editor">
        What new with you?
        <img src="/assets/logo_icons/editPost.svg" alt="" />
      </div>
      <div className="create-post-actions">
        <button type="button">
          Add
          <img className="post-add-dropdown" src="/assets/logo_icons/postadddropdown.svg" alt="" />
        </button>
        <button className="post-button" type="button">
          <img src="/assets/logo_icons/Send.svg" alt="" />
          Post
        </button>
      </div>
    </section>
  )
}

function PostCard({ post }) {
  return (
    <article className="feed-post">
      <div className="post-author-row">
        <img src={profileIcon} alt="Robert Jacob" />
        <div>
          <h2>{post.name}</h2>
          <p>{post.hours} · {post.role}</p>
        </div>
        <button className="more-button" type="button" aria-label="More options">⋮</button>
      </div>
      <p className="post-copy">{post.content} <span>More</span></p>
      <img
        className="post-image"
        src={post.image}
        alt={`${post.name}'s restaurant post`}
        onError={(event) => { event.currentTarget.src = '/assets/home_food_post.png' }}
      />
      <div className="post-actions">
        <button type="button"><img src="/assets/logo_icons/like.svg" alt="" />{post.likes} Like</button>
        <button type="button"><img src="/assets/logo_icons/comment.svg" alt="" />{post.comments} Comments</button>
        <button type="button"><img src="/assets/logo_icons/report.svg" alt="" />Report</button>
      </div>
    </article>
  )
}

function FlicksSection() {
  return (
    <section className="flicks-section">
      <div className="section-heading">
        <h2>Flicks</h2>
        <button type="button">See All</button>
      </div>
      <div className="flicks-grid">
        {restaurantImages.map((image, index) => (
          <button className="flick-card" type="button" key={image}>
            <img
              src={image}
              alt={`Restaurant flick ${index + 1}`}
              onError={(event) => { event.currentTarget.src = '/assets/home_food_post.png' }}
            />
            <span>Flick {index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function WhoToFollow() {
  const users = [
    ['Steve Jobs', 'CEO of Apple'],
    ['Ryan Roslansky', 'CEO of Linkedin'],
    ['Dylan Field', 'CEO of Figma'],
  ]

  return (
    <section className="who-to-follow">
      <h2>Who to follow</h2>
      {users.map(([name, role]) => (
        <div className="suggested-user" key={name}>
          <img src={profileIcon} alt={name} />
          <div>
            <h3>{name}</h3>
            <p>{role}</p>
          </div>
          <button type="button">Connect</button>
        </div>
      ))}
      <button className="see-all-button" type="button">See All</button>
    </section>
  )
}
