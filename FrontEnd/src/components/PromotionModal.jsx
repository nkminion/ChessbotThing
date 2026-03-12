const PROMOTION_OPTIONS = [
  { value: 'q', label: 'Queen' },
  { value: 'r', label: 'Rook' },
  { value: 'n', label: 'Knight' },
  { value: 'b', label: 'Bishop' },
]

export function PromotionModal({ pendingPromotion, onSelect }) {
  if (!pendingPromotion) {
    return null
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <span className="eyebrow">Promotion</span>
        <h2>Choose the promoted piece</h2>
        <div className="modal-actions">
          {PROMOTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className="button"
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" className="button button--ghost" onClick={() => onSelect(null)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
