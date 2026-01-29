import { useState } from 'react'
import type { Signal } from '../types'

interface TimelinePanelProps {
  signals: Signal[]
  onAddSignal: (signal: Signal) => void
  highlightedDays: Set<string>
  activeDay: string | null
  setDayRef: (day: string, el: HTMLDivElement | null) => void
  isDemoDataset?: boolean
}

function groupSignalsByDay(signals: Signal[]): { day: string; signals: Signal[] }[] {
  const byDay = new Map<string, Signal[]>()
  for (const s of signals) {
    const list = byDay.get(s.day) ?? []
    list.push(s)
    byDay.set(s.day, list)
  }
  const order = Array.from(new Set(signals.map((s) => s.day)))
  return order.map((day) => ({ day, signals: byDay.get(day) ?? [] }))
}

export function TimelinePanel({
  signals,
  onAddSignal,
  highlightedDays,
  activeDay,
  setDayRef,
  isDemoDataset = false,
}: TimelinePanelProps) {
  const [day, setDay] = useState('')
  const [type, setType] = useState('declaration')
  const [content, setContent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (day && content) {
      onAddSignal({ day, type, content })
      setDay('')
      setContent('')
    }
  }

  const groups = groupSignalsByDay(signals)

  return (
    <div className="timeline-panel">
      <h2 className="timeline-panel__heading">Timeline</h2>
      {isDemoDataset && (
        <span className="timeline-panel__demo-badge" title="Demo dataset loaded">
          Demo Dataset (5 days)
        </span>
      )}
      <div className="timeline-panel__days">
        {groups.length === 0 ? (
          <div className="timeline-panel__empty-state">
            <h3 className="timeline-panel__empty-title">No signals loaded</h3>
            <p className="timeline-panel__empty-body">
              Click Judge Mode in the header to load a 5-day demo and auto-run analysis.
            </p>
            <p className="timeline-panel__empty-hint">
              Demo Mode loads the dataset without running analysis.
            </p>
          </div>
        ) : (
          groups.map(({ day: dayKey, signals: daySignals }) => {
            const isHighlighted = highlightedDays.has(dayKey)
            const isActive = activeDay === dayKey
            return (
              <div
                key={dayKey}
                ref={(el) => setDayRef(dayKey, el)}
                className={`timeline-panel__day ${isHighlighted ? 'timeline-panel__day--highlighted' : ''} ${isActive ? 'timeline-panel__day--active' : ''}`}
                data-day={dayKey}
              >
                <div className="timeline-panel__day-label">{dayKey}</div>
                <div className="timeline-panel__cards">
                  {daySignals.map((signal, idx) => (
                    <div
                      key={`${signal.day}:${idx}`}
                      className="timeline-panel__card"
                      data-signal-key={`${signal.day}:${idx}`}
                    >
                      <span className="timeline-panel__card-tag">{signal.type}</span>
                      <div className="timeline-panel__card-content">{signal.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="timeline-panel__form">
        <h3 className="timeline-panel__form-heading">Add Signal</h3>
        <input
          type="text"
          placeholder="Day (e.g., Day 1)"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="timeline-panel__input"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="timeline-panel__input"
        >
          <option value="declaration">Declaration</option>
          <option value="research">Research</option>
          <option value="action">Action</option>
          <option value="question">Question</option>
        </select>
        <textarea
          placeholder="Signal content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="timeline-panel__input timeline-panel__textarea"
        />
        <button type="submit" className="timeline-panel__submit">
          Add
        </button>
      </form>
    </div>
  )
}
