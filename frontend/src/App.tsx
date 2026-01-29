import { useState, useEffect, useRef, useCallback } from 'react'
import { SignalsPanel, DEMO_SIGNALS } from './components/SignalsPanel'
import { SettingsPanel, DEFAULT_SETTINGS } from './components/SettingsPanel'
import { OutputPanel } from './components/OutputPanel'
import { analyze, submitFeedback, getVersion } from './api'
import type { Signal, AnalysisResult, Settings, FeedbackItem, VersionInfo } from './types'

const FEEDBACK_STORAGE_KEY = 'intent-drift-feedback'
const SETTINGS_STORAGE_KEY = 'intent-drift-settings'

function loadInitialSettings(): Settings {
  const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<Settings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    } catch {
      // ignore
    }
  }
  return DEFAULT_SETTINGS
}

function App() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings>(loadInitialSettings)
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([])
  const [lastFeedback, setLastFeedback] = useState<FeedbackItem | null>(null)
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [highlightDriftBanner, setHighlightDriftBanner] = useState(false)
  const outputSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getVersion()
      .then(setVersionInfo)
      .catch(() => setVersionInfo(null))
  }, [])

  // Load feedback from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FeedbackItem[]
        setFeedbackHistory(parsed)
        // Set last feedback if available
        if (parsed.length > 0) {
          setLastFeedback(parsed[parsed.length - 1])
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  const handleAddSignal = (signal: Signal) => {
    setSignals([...signals, signal])
  }

  const handleLoadDemo = () => {
    setSignals(DEMO_SIGNALS)
    setResult(null)
    setError(null)
  }

  const handleAnalyze = useCallback(async (afterAnalyze?: () => void) => {
    if (signals.length === 0) {
      setError('Please add signals or load demo data first')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const analysisResult = await analyze(
        signals,
        feedbackHistory.length > 0 ? feedbackHistory : undefined,
        settings
      )
      setResult(analysisResult)
      setLastFeedback(null)
      afterAnalyze?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [signals, feedbackHistory, settings])

  const handleJudgeMode = async () => {
    setSignals(DEMO_SIGNALS)
    setSettings({
      thinking_level: 'high',
      baseline_window_size: 2,
      current_window_size: 2,
    })
    setResult(null)
    setError(null)
    setHighlightDriftBanner(false)
    // Use a short delay so state (signals + settings) is committed before we call analyze
    const judgeSettings: Settings = {
      thinking_level: 'high',
      baseline_window_size: 2,
      current_window_size: 2,
    }
    setLoading(true)
    setError(null)
    try {
      const analysisResult = await analyze(DEMO_SIGNALS, undefined, judgeSettings)
      setResult(analysisResult)
      setLastFeedback(null)
      setSignals(DEMO_SIGNALS)
      setSettings(judgeSettings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(judgeSettings))
      // Scroll to output panel
      setTimeout(() => {
        outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setHighlightDriftBanner(true)
        setTimeout(() => setHighlightDriftBanner(false), 1000)
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (verdict: 'confirm' | 'reject', comment?: string) => {
    if (!result) return

    try {
      await submitFeedback(result.analysis_id, verdict, comment)
      
      // Create feedback item
      const feedbackItem: FeedbackItem = {
        analysis_id: result.analysis_id,
        verdict,
        comment,
        created_at: new Date().toISOString(),
      }
      
      // Update state and localStorage
      const updated = [...feedbackHistory, feedbackItem]
      setFeedbackHistory(updated)
      setLastFeedback(feedbackItem)
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback')
    }
  }

  const gitShaShort = versionInfo?.git_sha && versionInfo.git_sha !== 'unknown'
    ? versionInfo.git_sha.slice(0, 7)
    : null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Intent Drift Radar</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#555' }}>
          {versionInfo && (
            <>
              <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
                Model: {versionInfo.gemini_model}
              </span>
              {gitShaShort && (
                <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px', fontFamily: 'monospace' }}>
                  {gitShaShort}
                </span>
              )}
            </>
          )}
          <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            Thinking: {settings.thinking_level}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            Windows: baseline={settings.baseline_window_size}, current={settings.current_window_size}
          </span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column - Signals */}
        <div style={{ width: '300px', borderRight: '1px solid #ddd', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <button
              onClick={handleJudgeMode}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: loading ? '#ccc' : '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}
            >
              {loading ? 'Analyzing...' : 'Judge Mode'}
            </button>
          </div>
          <SignalsPanel signals={signals} onAddSignal={handleAddSignal} onLoadDemo={handleLoadDemo} />
        </div>

        {/* Middle Column - Analyze & Settings */}
        <div style={{ width: '300px', borderRight: '1px solid #ddd', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <button
              onClick={() => handleAnalyze()}
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
        <div ref={outputSectionRef} style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 0 1rem 0' }}>Output</h2>
          <OutputPanel 
            result={result} 
            loading={loading} 
            error={error}
            onFeedback={handleFeedback}
            lastFeedback={lastFeedback}
            highlightDriftBanner={highlightDriftBanner}
          />
        </div>
      </div>
    </div>
  )
}

export default App
