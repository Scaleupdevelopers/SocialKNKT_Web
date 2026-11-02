import { Header } from '../../layouts/Header'
import { ProfileHeader } from './components/ProfileHeader'
import { SettingsContent } from './components/SettingsContent'
import { EditProfileContent } from './components/EditProfileContent'
import './Settings.css'

export function Settings({ editProfile = false }) {
  return (
    <main className="settings-page">
      <Header />
      <section className="settings-profile-card">
        <ProfileHeader editProfile={editProfile} />
        {editProfile ? <EditProfileContent /> : <SettingsContent />}
      </section>
    </main>
  )
}
