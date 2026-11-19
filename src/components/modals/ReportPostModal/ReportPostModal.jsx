import { ModalShell } from '../ModalShell'
import './ReportPostModal.css'
import { useState } from 'react'
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

export function ReportPostModal({ postId, onClose, contentLabel = 'Post' }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!postId || isSubmitting) return
    const reportDescription = selectedReason === 'Other'
      ? description.trim() || 'Other'
      : selectedReason || 'Other'

    setIsSubmitting(true)
    try {
      await reportPost(postId, reportDescription)
      toast.success('Post reported successfully.')
      onClose()
    } catch (error) {
      toast.error(error.message || 'Unable to report post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalShell title={`Report ${contentLabel}`} onClose={onClose} className="report-post-modal">
      <p className="report-question">Why are you reporting this {contentLabel}?</p>
      <div className="report-reasons">
        {reportReasons.map((reason, index) => (
          <label key={reason}>
            <input name="report-reason" type="radio" checked={selectedReason === reason} onChange={() => setSelectedReason(reason)} />
            <span>{reason}</span>
          </label>
        ))}
      </div>
      {selectedReason === 'Other' && <textarea className="report-description" placeholder="Describe..." value={description} onChange={(event) => setDescription(event.target.value)} />}
      <button className="community-gradient-button" type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Reporting...' : 'Post'}</button>
    </ModalShell>
  )
}
