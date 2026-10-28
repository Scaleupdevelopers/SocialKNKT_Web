import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AddMedia.css'

export function AddMedia() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [banner, setBanner] = useState(null)
  const [content, setContent] = useState([])

  return (
    <main className="media-page">
      <header className="media-header">
        <button type="button" onClick={() => navigate('/')}>
          <img src="/assets/logo_icons/app_logo.png" alt="SocialKNKT" />
        </button>
      </header>

      <section className="media-card" aria-labelledby="media-title">
        <div className="media-progress"><span /></div>
        <h1 id="media-title">You’re almost there!</h1>
        <p>Add a few details to finish setting up your account</p>

        <form className="media-form" onSubmit={(event) => { event.preventDefault(); navigate('/') }}>
          <h2>Profile</h2>
          <div className="profile-media-grid">
            <UploadBox label="Profile Picture" file={profile} onChange={setProfile} small />
            <UploadBox label="Banner" file={banner} onChange={setBanner} />
          </div>

          <h2>Add Content</h2>
          <UploadBox label="" files={content} onChange={setContent} multiple />

          <button className="media-continue" type="submit">Continue</button>
          <button className="media-skip" type="button" onClick={() => navigate('/')}>Skip for now</button>
        </form>
      </section>
    </main>
  )
}

function previewUrl(file) {
  return file ? URL.createObjectURL(file) : ''
}

function UploadBox({ label, file, files = [], onChange, multiple = false, small = false }) {
  const selectedFiles = multiple ? files : file ? [file] : []

  return (
    <label className={`upload-box ${small ? 'upload-box-small' : ''}`}>
      {label && <span>{label}</span>}
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        multiple={multiple}
        onChange={(event) => onChange(multiple ? [...event.target.files] : event.target.files[0])}
      />
      {selectedFiles.length > 0 ? (
        <div className="media-previews">
          {selectedFiles.map((selectedFile) => (
            <img key={selectedFile.name} src={previewUrl(selectedFile)} alt={selectedFile.name} />
          ))}
        </div>
      ) : (
        <span className="upload-placeholder">
          <img src="/assets/logo_icons/upload_icon.svg" alt="" />
          <small>png or .jpg formats only</small>
        </span>
      )}
    </label>
  )
}
