import type { AnalysisResult, EvidenceItem, ReasoningCard } from '../types'

interface EvidencePanelProps {
  result: AnalysisResult | null
  highlightedDays: Set<string>
  pinnedDays: Set<string>
  onEvidenceMouseEnter: (day: string) => void
  onEvidenceMouseLeave: () => void
  onEvidenceClick: (day: string) => void
  onReasoningMouseEnter: (refs: string[]) => void
  onReasoningMouseLeave: () => void
  onReasoningClick: (refs: string[]) => void
  onClearHighlight: () => void
}

export function EvidencePanel({
  result,
  highlightedDays,
  pinnedDays,
  onEvidenceMouseEnter,
  onEvidenceMouseLeave,
  onEvidenceClick,
  onReasoningMouseEnter,
  onReasoningMouseLeave,
  onReasoningClick,
  onClearHighlight,
}: EvidencePanelProps) {
  if (!result) {
    return (
      <div className="evidence-panel">
        <h2 className="evidence-panel__heading">Evidence &amp; Reasoning</h2>
        <p className="evidence-panel__empty">Run analysis to see evidence and reasoning cards.</p>
      </div>
    )
  }

  const hasHighlight = highlightedDays.size > 0
  const hasPinned = pinnedDays.size > 0
  const pinnedDaysArray = Array.from(pinnedDays).sort()

  return (
    <div className="evidence-panel">
      <div className="evidence-panel__header">
        <h2 className="evidence-panel__heading">Evidence &amp; Reasoning</h2>
        {hasHighlight && (
          <div className="evidence-panel__header-actions">
            {hasPinned && (
              <span className="evidence-panel__pinned-chip">
                Pinned: {pinnedDaysArray.join(', ')}
              </span>
            )}
            <button
              type="button"
              className="evidence-panel__clear"
              onClick={onClearHighlight}
            >
              Clear highlight
            </button>
          </div>
        )}
      </div>

      <p className="evidence-panel__trace-hint">
        Hover evidence or reasoning cards to see which days caused the decision.
      </p>

      {result.evidence.length > 0 && (
        <div className="evidence-panel__section">
          <h3 className="evidence-panel__section-title">Evidence</h3>
          <ol className="evidence-panel__list">
            {result.evidence.map((item: EvidenceItem, idx: number) => {
              const isHighlighted = highlightedDays.has(item.day)
              return (
                <li
                  key={idx}
                  className={`evidence-panel__item ${isHighlighted ? 'evidence-panel__item--highlighted' : ''}`}
                  onMouseEnter={() => onEvidenceMouseEnter(item.day)}
                  onMouseLeave={onEvidenceMouseLeave}
                  onClick={() => onEvidenceClick(item.day)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onEvidenceClick(item.day)
                    }
                  }}
                >
                  <span className="evidence-panel__item-day">{item.day}:</span>{' '}
                  <span className="evidence-panel__item-reason">{item.reason}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {result.reasoning_cards.length > 0 && (
        <div className="evidence-panel__section">
          <h3 className="evidence-panel__section-title">Reasoning Cards</h3>
          <div className="evidence-panel__cards">
            {result.reasoning_cards.map((card: ReasoningCard, idx: number) => {
              const isHighlighted = card.refs.some((r) => highlightedDays.has(r))
              return (
                <div
                  key={idx}
                  className={`evidence-panel__card ${isHighlighted ? 'evidence-panel__card--highlighted' : ''}`}
                  onMouseEnter={() => onReasoningMouseEnter(card.refs)}
                  onMouseLeave={onReasoningMouseLeave}
                  onClick={() => onReasoningClick(card.refs)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onReasoningClick(card.refs)
                    }
                  }}
                >
                  <div className="evidence-panel__card-title">{card.title}</div>
                  <div className="evidence-panel__card-body">{card.body}</div>
                  {card.refs.length > 0 && (
                    <div className="evidence-panel__card-refs">
                      {card.refs.map((ref) => (
                        <span key={ref} className="evidence-panel__chip">
                          {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
