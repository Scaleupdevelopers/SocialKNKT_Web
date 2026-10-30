import './ModalShell.css'

export function ModalShell({ title, onClose, className = '', children }) {
  return (
    <div
      className="community-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className={`community-modal ${className}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="community-modal-heading">
          <h2>{title}</h2>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose}>×</button>
        </div>
        {children}
      </section>
    </div>
  )
}
