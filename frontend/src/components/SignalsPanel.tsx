import { useState } from 'react'
import type { Signal } from '../types'

interface SignalsPanelProps {
  signals: Signal[]
  onAddSignal: (signal: Signal) => void
  onLoadDemo: () => void
}

const DEMO_SIGNALS: Signal[] = [
  { day: 'Day 1', type: 'declaration', content: 'Build an education-first kids learning app.' },
  { day: 'Day 2', type: 'declaration', content: 'Focus on curriculum and quizzes.' },
  { day: 'Day 3', type: 'declaration', content: 'Thinking about pricing tiers.' },
  { day: 'Day 4', type: 'research', content: 'Reading Stripe docs and paywall ideas.' },
  { day: 'Day 5', type: 'declaration', content: 'Pivot toward creator monetization tool.' },
]

export function SignalsPanel({ signals, onAddSignal, onLoadDemo }: SignalsPanelProps) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Signals</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {signals.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No signals yet. Add one below or load demo data.</p>
          ) : (
            signals.map((signal, idx) => (
              <div key={idx} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{signal.day} ({signal.type})</div>
                <div style={{ color: '#666', marginTop: '0.25rem' }}>{signal.content}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Add Signal</h3>
        <input
          type="text"
          placeholder="Day (e.g., Day 1)"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
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
          style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </form>

      <button
        onClick={onLoadDemo}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Demo Mode
      </button>
    </div>
  )
}

export { DEMO_SIGNALS }
