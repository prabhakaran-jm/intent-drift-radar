import type { AnalysisResult } from '../types'

interface OutputPanelProps {
  result: AnalysisResult | null
  loading: boolean
  error: string | null
}

export function OutputPanel({ result, loading, error }: OutputPanelProps) {
  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
        Analyzing...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00' }}>
        Error: {error}
      </div>
    )
  }

  if (!result) {
    return (
      <div style={{ padding: '1rem', color: '#666', textAlign: 'center' }}>
        Click "Analyze" to see results
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto' }}>
      {/* Drift Banner */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: result.drift_detected ? '#fff3cd' : '#d1ecf1',
          border: `2px solid ${result.drift_detected ? '#ffc107' : '#0dcaf0'}`,
          borderRadius: '4px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '1.1rem',
        }}
      >
        {result.drift_detected ? '⚠️ Drift Detected' : '✓ No Drift Detected'}
      </div>

      {/* Confidence */}
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Confidence</h3>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
          {(result.confidence * 100).toFixed(1)}%
        </div>
      </div>

      {/* Drift Direction */}
      {result.drift_detected && (
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Drift Direction</h3>
          <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            {result.drift_direction}
          </div>
        </div>
      )}

      {/* Baseline Intent */}
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Baseline Intent</h3>
        <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{result.baseline_intent.title}</div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>{result.baseline_intent.detail}</div>
        </div>
      </div>

      {/* Current Intent */}
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Current Intent</h3>
        <div style={{ padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{result.current_intent.title}</div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>{result.current_intent.detail}</div>
        </div>
      </div>

      {/* Evidence */}
      {result.evidence.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Evidence</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {result.evidence.map((item, idx) => (
              <div key={idx} style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', fontSize: '0.9rem' }}>{item.day}</div>
                <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{item.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning Cards */}
      {result.reasoning_cards.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Reasoning Cards</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {result.reasoning_cards.map((card, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1rem' }}>{card.title}</div>
                <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '0.5rem', lineHeight: '1.5' }}>
                  {card.body}
                </div>
                {card.refs.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold' }}>Refs:</span> {card.refs.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drift Signature */}
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Drift Signature</h3>
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            border: '1px solid #ddd',
          }}
        >
          {result.drift_signature}
        </div>
      </div>

      {/* One Question */}
      {result.one_question && (
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Clarifying Question</h3>
          <div style={{ padding: '0.75rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
            {result.one_question}
          </div>
        </div>
      )}
    </div>
  )
}
