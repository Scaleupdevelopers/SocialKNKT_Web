import { ModalShell } from '../ModalShell'
import './ReportPostModal.css'
import { useRef, useState } from 'react'
import { reportPost } from '../../../action/action'
import { toast } from 'react-toastify'

const reportReasons = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Inappropriate or offensive content',
  'Violence or dangerous content',
  'Other',
]

export function ReportPostModal({
  postId,
  onClose,
  contentLabel = 'Post',
  reportAction = reportPost,
  descriptionOnly = false,
}) {
  const submitLock = useRef(false)
  const [error, setError] = useState('')
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function closeModal() {
    if (!submitLock.current) onClose()
  }

  function getDescription() {
    if (descriptionOnly) return description.trim()
    if (selectedReason === 'Other') return description.trim() || 'Other'
    return selectedReason || 'Other'
  }

  async function handleSubmit() {
    if (!postId || submitLock.current) return
    const reportDescription = getDescription()
    if (!reportDescription) {
      setError('Enter a description to report this user.')
      return
    }

    submitLock.current = true
    setIsSubmitting(true)
    setError('')
    try {
      await reportAction(postId, reportDescription)
      toast.success(`${contentLabel} reported successfully.`)
      onClose()
    } catch {
      setError(`Unable to report this ${contentLabel.toLowerCase()}. Please try again.`)
    } finally {
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <ModalShell
      title={`Report ${contentLabel}`}
      onClose={closeModal}
      className={`report-post-modal${descriptionOnly ? ' report-user-modal' : ''}`}
    >
      <p className="report-question">
        Why are you reporting this {descriptionOnly ? contentLabel.toLowerCase() : contentLabel}
        ?
      </p>
      <ReportFields
        descriptionOnly={descriptionOnly}
        selectedReason={selectedReason}
        setSelectedReason={setSelectedReason}
        description={description}
        setDescription={setDescription}
        isSubmitting={isSubmitting}
        error={error}
      />
      {error && (
        <p id="report-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="community-gradient-button"
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Reporting...' : descriptionOnly ? 'Report' : 'Post'}
      </button>
    </ModalShell>
  )
}

function ReportFields({
  descriptionOnly,
  selectedReason,
  setSelectedReason,
  description,
  setDescription,
  isSubmitting,
  error,
}) {
  return (
    <>
      {!descriptionOnly && (
        <div className="report-reasons">
          {reportReasons.map((reason) => (
            <label key={reason}>
              <input
                name="report-reason"
                type="radio"
                checked={selectedReason === reason}
                onChange={() => setSelectedReason(reason)}
              />
              <span>{reason}</span>
            </label>
          ))}
        </div>
      )}
      {(descriptionOnly || selectedReason === 'Other') && (
        <textarea
          aria-label="Report description"
          required={descriptionOnly}
          disabled={isSubmitting}
          aria-invalid={!!error}
          aria-describedby={error ? 'report-error' : undefined}
          className="report-description"
          placeholder="Describe..."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      )}
    </>
  )
}
