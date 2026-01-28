import { useState } from 'react'
import { SignalsPanel, DEMO_SIGNALS } from './components/SignalsPanel'
import { SettingsPanel, DEFAULT_SETTINGS } from './components/SettingsPanel'
import { OutputPanel } from './components/OutputPanel'
import { analyze } from './api'
import type { Signal, AnalysisResult, Settings } from './types'

function App() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const handleAddSignal = (signal: Signal) => {
    setSignals([...signals, signal])
  }

  const handleLoadDemo = () => {
    setSignals(DEMO_SIGNALS)
    setResult(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (signals.length === 0) {
      setError('Please add signals or load demo data first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const signalTexts = signals.map((s) => `${s.day}: ${s.content}`)
      const analysisResult = await analyze(signalTexts)
      setResult(analysisResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Intent Drift Radar</h1>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column - Signals */}
        <div style={{ width: '300px', borderRight: '1px solid #ddd', padding: '1rem', overflowY: 'auto' }}>
          <SignalsPanel signals={signals} onAddSignal={handleAddSignal} onLoadDemo={handleLoadDemo} />
        </div>

        {/* Middle Column - Analyze & Settings */}
        <div style={{ width: '300px', borderRight: '1px solid #ddd', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <button
              onClick={handleAnalyze}
              disabled={loading || signals.length === 0}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: loading || signals.length === 0 ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading || signals.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          <SettingsPanel settings={settings} onSettingsChange={setSettings} />
        </div>

        {/* Right Column - Output */}
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>Output</h2>
          <OutputPanel result={result} loading={loading} error={error} />
        </div>
      </div>
    </div>
  )
}

export default App
