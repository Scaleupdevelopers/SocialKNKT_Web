import { uploadFile } from '../../../action/action'

const media = [
  ['image', 'Profile photo'],
  ['headshot', 'Headshots'],
  ['resume', 'Resume'],
  ['certificates_or_licences', 'Certificates or licences'],
]
export function MediaFields({ draft, onChange, onBusy, onError }) {
  const upload = async (key, file) => {
    if (!file) return
    const imageOnly = key === 'image' || key === 'headshot'
    const allowed = imageOnly
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type) || file.size > 10 * 1024 * 1024) {
      onError('Choose a supported image or PDF up to 10 MB. Photos must be JPEG, PNG or WebP.')
      return
    }
    onBusy(true)
    onError('')
    try {
      const url = await uploadFile(file)
      onChange({ ...draft, [key]: Array.isArray(draft[key]) ? [...draft[key], url] : url })
    } catch {
      onError('Unable to upload file. Select the file again to retry.')
    } finally {
      onBusy(false)
    }
  }
  const remove = (key, index) =>
    onChange({
      ...draft,
      [key]: Array.isArray(draft[key])
        ? draft[key].filter((_, position) => position !== index)
        : '',
    })
  return (
    <>
      {media.map(([key, label]) => (
        <div className="profile-media" key={key}>
          <label>
            {label}
            <input
              type="file"
              accept={
                key === 'image' || key === 'headshot'
                  ? 'image/jpeg,image/png,image/webp'
                  : 'image/jpeg,image/png,image/webp,application/pdf'
              }
              onChange={(event) => {
                const file = event.target.files[0]
                event.target.value = ''
                upload(key, file)
              }}
            />
          </label>
          {(Array.isArray(draft[key]) ? draft[key] : [draft[key]])
            .filter(Boolean)
            .map((url, index) => (
              <div className="profile-media-item" key={`${key}-${index}`}>
                {key === 'image' && <img src={url} alt="Profile photo preview" />}
                <span>
                  {label} {index + 1}
                </span>
                {key !== 'image' && (
                  <button
                    type="button"
                    aria-label={`Remove ${label} ${index + 1}`}
                    onClick={() => remove(key, index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
        </div>
      ))}
      <p className="profile-editor-hint">Uploads are attached to your profile when you Save.</p>
    </>
  )
}
