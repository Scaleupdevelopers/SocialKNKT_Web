import { ModalShell } from '../ModalShell'
import './ReportPostModal.css'

const reportReasons = [
  'Spam or misleading content',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Inappropriate or offensive content',
  'Violence or dangerous content',
  'Other',
]

export function ReportPostModal({ onClose }) {
  return (
    <ModalShell title="Report Post" onClose={onClose} className="report-post-modal">
      <p className="report-question">Why are you reporting this Post?</p>
      <div className="report-reasons">
        {reportReasons.map((reason, index) => (
          <label key={reason}>
            <input name="report-reason" type="radio" defaultChecked={index === reportReasons.length - 1} />
            <span>{reason}</span>
          </label>
        ))}
      </div>
      <textarea className="report-description" placeholder="Describe..." />
      <button className="community-gradient-button" type="button">Post</button>
    </ModalShell>
  )
}
