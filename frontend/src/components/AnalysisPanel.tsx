import { useState, useCallback, useEffect } from 'react'
import { SettingsPanel } from './SettingsPanel'

const LOADING_STEPS = [
  'Extracting baseline intent…',
  'Detecting drift signals…',
  'Generating evidence + reasoning cards…',
]

const STEP_INTERVAL_MS = 6000
const LONG_WAIT_THRESHOLD_SEC = 20
import type { AnalysisResult, FeedbackItem, Settings } from '../types'

interface AnalysisPanelProps {
  result: AnalysisResult | null
  loading: boolean
  error: string | null
  settings: Settings
  onSettingsChange: (s: Settings) => void
  onAnalyze: (after?: () => void) => void
  onFeedback: (verdict: 'confirm' | 'reject', comment?: string) => void
  lastFeedback: FeedbackItem | null
  highlightDriftBanner: boolean
  signalsCount: number
  outputSectionRef: React.RefObject<HTMLDivElement>
  isJudgeModeFlow?: boolean
  isDemoResult?: boolean
}

function buildSummaryText(result: AnalysisResult): string {
  const lines: string[] = [
    'Intent Drift Radar Summary',
    `- Drift detected: ${result.drift_detected}`,
    `- Confidence: ${result.confidence.toFixed(2)}`,
    `- Direction: ${result.drift_direction}`,
    `- Signature: ${result.drift_signature}`,
    '',
    'Top evidence:',
  ]
  result.evidence.slice(0, 5).forEach((item, i) => {
    lines.push(`${i + 1}) ${item.day}: ${item.reason}`)
  })
  lines.push('', 'Reasoning cards:')
  result.reasoning_cards.forEach((card) => {
    lines.push(`- ${card.title}`)
  })
  return lines.join('\n')
}

export function AnalysisPanel({
  result,
  loading,
  error,
  settings,
  onSettingsChange,
  onAnalyze,
  onFeedback,
  lastFeedback,
  highlightDriftBanner,
  signalsCount,
  outputSectionRef,
  isJudgeModeFlow = false,
  isDemoResult = false,
}: AnalysisPanelProps) {
  const [copied, setCopied] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!loading) {
      setActiveStep(0)
      setElapsedSeconds(0)
      return
    }
    setActiveStep(0)
    setElapsedSeconds(0)
    const stepTimer = setInterval(() => {
      setActiveStep((prev) => Math.min(LOADING_STEPS.length - 1, prev + 1))
    }, STEP_INTERVAL_MS)
    const elapsedTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => {
      clearInterval(stepTimer)
      clearInterval(elapsedTimer)
    }
  }, [loading])

  const handleCopySummary = useCallback(async () => {
    if (!result) return
    const text = buildSummaryText(result)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }, [result])

  const handleAnalyzeClick = () => {
    onAnalyze(() => {
      outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="analysis-panel" ref={outputSectionRef}>
      <h2 className="analysis-panel__heading">Analysis</h2>

      {isJudgeModeFlow ? (
        <p className="analysis-panel__judge-hint">Analysis auto-triggered (Quick Demo)</p>
      ) : (
        <button
          type="button"
          className="analysis-panel__analyze-btn"
          onClick={handleAnalyzeClick}
          disabled={loading || signalsCount === 0}
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      )}

      <SettingsPanel settings={settings} onSettingsChange={onSettingsChange} />

      {loading && (
        <div className="analysis-panel__loading">
          <h3 className="analysis-panel__loading-headline">Analyzing timeline with Gemini…</h3>
          <p className="analysis-panel__loading-subtext">Typical duration: 20–30 seconds</p>
          <ol className="analysis-panel__loading-steps">
            {LOADING_STEPS.map((label, index) => (
              <li
                key={label}
                className={`analysis-panel__loading-step ${index === activeStep ? 'analysis-panel__loading-step--active' : ''} ${index < activeStep ? 'analysis-panel__loading-step--done' : ''}`}
              >
                {index + 1}) {label}
              </li>
            ))}
          </ol>
          {elapsedSeconds >= LONG_WAIT_THRESHOLD_SEC && (
            <p className="analysis-panel__loading-long-wait">
              Still working… if this times out, retry.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="analysis-panel__error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && !result && (
        <div className="analysis-panel__empty">Click &quot;Analyze&quot; to see results</div>
      )}

      {!loading && !error && result && (
        <div className="analysis-panel__content">
          {isDemoResult ? (
            <p className="analysis-panel__demo-label">Demo Result (Cached)</p>
          ) : (
            <p className="analysis-panel__demo-label analysis-panel__demo-label--live">Live Gemini</p>
          )}
          <div className="analysis-panel__copy-row">
            <button
              type="button"
              className="analysis-panel__btn analysis-panel__btn--secondary"
              onClick={handleCopySummary}
            >
              Copy Summary
            </button>
            {copied && <span className="analysis-panel__copied">Copied</span>}
          </div>

          <div
            className={`analysis-panel__banner ${result.drift_detected ? 'analysis-panel__banner--drift' : 'analysis-panel__banner--no-drift'} ${highlightDriftBanner ? 'analysis-panel__banner--highlight' : ''}`}
          >
            {result.drift_detected ? '⚠️ Drift Detected' : '✓ No Drift Detected'}
          </div>

          <div className="analysis-panel__feedback-row">
            <button
              type="button"
              className="analysis-panel__btn analysis-panel__btn--confirm"
              onClick={() => onFeedback('confirm')}
            >
              ✓ Confirm Drift
            </button>
            <button
              type="button"
              className="analysis-panel__btn analysis-panel__btn--reject"
              onClick={() => onFeedback('reject')}
            >
              ✗ Reject Drift
            </button>
          </div>

          {lastFeedback && (
            <div
              className={`analysis-panel__last-feedback ${lastFeedback.verdict === 'confirm' ? 'analysis-panel__last-feedback--confirm' : 'analysis-panel__last-feedback--reject'}`}
            >
              <div className="analysis-panel__last-feedback-title">
                Last Feedback: {lastFeedback.verdict === 'confirm' ? '✓ Confirmed' : '✗ Rejected'}
              </div>
              {lastFeedback.comment && (
                <div className="analysis-panel__last-feedback-comment">{lastFeedback.comment}</div>
              )}
            </div>
          )}

          <div className="analysis-panel__block">
            <h3 className="analysis-panel__block-title">Confidence</h3>
            <div className="analysis-panel__confidence">{(result.confidence * 100).toFixed(1)}%</div>
          </div>

          {result.drift_detected && (
            <div className="analysis-panel__block">
              <h3 className="analysis-panel__block-title">Drift Direction</h3>
              <div className="analysis-panel__direction">{result.drift_direction}</div>
            </div>
          )}

          <div className="analysis-panel__block">
            <h3 className="analysis-panel__block-title">Baseline Intent</h3>
            <div className="analysis-panel__intent">
              <div className="analysis-panel__intent-title">{result.baseline_intent.title}</div>
              <div className="analysis-panel__intent-detail">{result.baseline_intent.detail}</div>
            </div>
          </div>

          <div className="analysis-panel__block">
            <h3 className="analysis-panel__block-title">Current Intent</h3>
            <div className="analysis-panel__intent">
              <div className="analysis-panel__intent-title">{result.current_intent.title}</div>
              <div className="analysis-panel__intent-detail">{result.current_intent.detail}</div>
            </div>
          </div>

          <div className="analysis-panel__block">
            <h3 className="analysis-panel__block-title">Drift Signature</h3>
            <div className="analysis-panel__signature">{result.drift_signature}</div>
          </div>

          {result.one_question && (
            <div className="analysis-panel__block analysis-panel__one-question">
              <h3 className="analysis-panel__block-title">Clarifying Question</h3>
              <div className="analysis-panel__one-question-text">{result.one_question}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
