import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { DEMO_SIGNALS } from './components/SignalsPanel'
import { HeaderBar } from './components/HeaderBar'
import { TimelinePanel } from './components/TimelinePanel'
import { AnalysisPanel } from './components/AnalysisPanel'
import { EvidencePanel } from './components/EvidencePanel'
import { analyze, analyzeEnsemble, submitFeedback, getVersion, getDemo, ApiError } from './api'
import type { Signal, AnalysisResult, Settings, FeedbackItem, VersionInfo, EnsembleResponse } from './types'

function analysisErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const friendly =
      err.code === 'GEMINI_API_KEY_MISSING'
        ? 'Gemini API key not configured'
        : err.code === 'MODEL_TIMEOUT'
          ? 'Model timed out'
          : err.code === 'MODEL_OUTPUT_INVALID'
            ? 'Model returned invalid structured output'
            : err.code === 'MODEL_ENSEMBLE_FAILED'
              ? 'Ensemble did not get enough successful runs'
              : err.message
    return err.message !== friendly ? `${friendly} — ${err.message}` : friendly
  }
  return err instanceof Error ? err.message : 'Failed to analyze'
}
import { DEFAULT_SETTINGS } from './components/SettingsPanel'

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
  const [isJudgeModeFlow, setIsJudgeModeFlow] = useState(false)
  const [isDemoDataset, setIsDemoDataset] = useState(false)
  const [isDemoResult, setIsDemoResult] = useState(false)
  const [ensembleMode, setEnsembleMode] = useState(false)
  const [ensembleResponse, setEnsembleResponse] = useState<EnsembleResponse | null>(null)

  // Linking state: evidence ↔ timeline, reasoning ↔ evidence
  const [pinnedDays, setPinnedDays] = useState<Set<string>>(new Set())
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [hoveredEvidenceDay, setHoveredEvidenceDay] = useState<string | null>(null)
  const [hoveredReasoningRefs, setHoveredReasoningRefs] = useState<string[] | null>(null)

  const outputSectionRef = useRef<HTMLDivElement>(null)
  const dayRefsMap = useRef<Record<string, HTMLDivElement | null>>({})

  const highlightedDays = useMemo(() => {
    const hover = hoveredEvidenceDay
      ? [hoveredEvidenceDay]
      : hoveredReasoningRefs ?? []
    return new Set<string>([...hover, ...pinnedDays])
  }, [hoveredEvidenceDay, hoveredReasoningRefs, pinnedDays])

  const setDayRef = useCallback((day: string, el: HTMLDivElement | null) => {
    dayRefsMap.current[day] = el
  }, [])

  useEffect(() => {
    if (!activeDay) return
    const el = dayRefsMap.current[activeDay]
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [activeDay])

  useEffect(() => {
    getVersion()
      .then(setVersionInfo)
      .catch(() => setVersionInfo(null))
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as FeedbackItem[]
        setFeedbackHistory(parsed)
        if (parsed.length > 0) {
          setLastFeedback(parsed[parsed.length - 1])
        }
      } catch {
        // ignore
      }
    }
  }, [])

  const handleAddSignal = (signal: Signal) => {
    setSignals((prev) => [...prev, signal])
    setIsDemoDataset(false)
    setIsJudgeModeFlow(false)
  }

  const handleLoadDemo = () => {
    setSignals(DEMO_SIGNALS)
    setResult(null)
    setError(null)
    setIsDemoDataset(true)
    setIsJudgeModeFlow(false)
  }

  const handleAnalyze = useCallback(
    async (afterAnalyze?: () => void) => {
      if (signals.length === 0) {
        setError('Please add signals or load demo data first')
        return
      }
      setLoading(true)
      setError(null)
      setEnsembleResponse(null)
      try {
        if (ensembleMode) {
          const ens = await analyzeEnsemble(
            signals,
            settings,
            feedbackHistory.length > 0 ? feedbackHistory : undefined
          )
          setResult(ens.consensus)
          setEnsembleResponse(ens)
          setIsDemoResult(false)
        } else {
          const analysisResult = await analyze(
            signals,
            feedbackHistory.length > 0 ? feedbackHistory : undefined,
            settings
          )
          setResult(analysisResult)
          setEnsembleResponse(null)
          setIsDemoResult(false)
        }
        setLastFeedback(null)
        afterAnalyze?.()
      } catch (err) {
        setError(analysisErrorMessage(err))
        setResult(null)
        setEnsembleResponse(null)
      } finally {
        setLoading(false)
      }
    },
    [signals, feedbackHistory, settings, ensembleMode]
  )

  const handleJudgeMode = async () => {
    setSignals(DEMO_SIGNALS)
    setIsDemoDataset(true)
    setIsJudgeModeFlow(true)
    setSettings({
      thinking_level: 'high',
      baseline_window_size: 2,
      current_window_size: 2,
    })
    setResult(null)
    setError(null)
    setHighlightDriftBanner(false)
    setIsDemoResult(false)
    const judgeSettings: Settings = {
      thinking_level: 'high',
      baseline_window_size: 2,
      current_window_size: 2,
    }
    setLoading(true)
    setError(null)
    try {
      const demoResult = await getDemo()
      setResult(demoResult)
      setIsDemoResult(true)
      setLastFeedback(null)
      setSignals(DEMO_SIGNALS)
      setSettings(judgeSettings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(judgeSettings))
      setTimeout(() => {
        outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setHighlightDriftBanner(true)
        setTimeout(() => setHighlightDriftBanner(false), 1000)
      }, 100)
    } catch {
      try {
        const analysisResult = await analyze(DEMO_SIGNALS, undefined, judgeSettings)
        setResult(analysisResult)
        setIsDemoResult(false)
        setLastFeedback(null)
        setSignals(DEMO_SIGNALS)
        setSettings(judgeSettings)
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(judgeSettings))
        setTimeout(() => {
          outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setHighlightDriftBanner(true)
          setTimeout(() => setHighlightDriftBanner(false), 1000)
        }, 100)
      } catch (err) {
        setError(analysisErrorMessage(err))
        setResult(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (verdict: 'confirm' | 'reject', comment?: string) => {
    if (!result) return
    try {
      await submitFeedback(result.analysis_id, verdict, comment)
      const feedbackItem: FeedbackItem = {
        analysis_id: result.analysis_id,
        verdict,
        comment,
        created_at: new Date().toISOString(),
      }
      const updated = [...feedbackHistory, feedbackItem]
      setFeedbackHistory(updated)
      setLastFeedback(feedbackItem)
      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Failed to submit feedback')
      setError(msg)
    }
  }

  const handleClearHighlight = useCallback(() => {
    setPinnedDays(new Set())
    setActiveDay(null)
  }, [])

  return (
    <div className="app" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <HeaderBar
        versionInfo={versionInfo}
        settings={settings}
        loading={loading}
        onJudgeMode={handleJudgeMode}
        onDemoMode={handleLoadDemo}
      />

      <div className="app__grid">
        <aside className="app__col app__col--timeline">
          <TimelinePanel
            signals={signals}
            onAddSignal={handleAddSignal}
            highlightedDays={highlightedDays}
            activeDay={activeDay}
            setDayRef={setDayRef}
            isDemoDataset={isDemoDataset}
          />
        </aside>

        <main className="app__col app__col--analysis">
          <AnalysisPanel
            result={result}
            loading={loading}
            error={error}
            settings={settings}
            onSettingsChange={setSettings}
            onAnalyze={handleAnalyze}
            onFeedback={handleFeedback}
            lastFeedback={lastFeedback}
            highlightDriftBanner={highlightDriftBanner}
            signalsCount={signals.length}
            outputSectionRef={outputSectionRef}
            isJudgeModeFlow={isJudgeModeFlow}
            isDemoResult={isDemoResult}
            ensembleMode={ensembleMode}
            onEnsembleModeChange={setEnsembleMode}
            ensembleResponse={ensembleResponse}
          />
        </main>

        <aside className="app__col app__col--evidence">
          <EvidencePanel
            result={result}
            highlightedDays={highlightedDays}
            pinnedDays={pinnedDays}
            onEvidenceMouseEnter={setHoveredEvidenceDay}
            onEvidenceMouseLeave={() => setHoveredEvidenceDay(null)}
            onEvidenceClick={(day) => {
              setPinnedDays(new Set([day]))
              setActiveDay(day)
            }}
            onReasoningMouseEnter={setHoveredReasoningRefs}
            onReasoningMouseLeave={() => setHoveredReasoningRefs(null)}
            onReasoningClick={(refs) => {
              setPinnedDays(new Set(refs))
              if (refs.length > 0) setActiveDay(refs[0])
            }}
            onClearHighlight={handleClearHighlight}
          />
        </aside>
      </div>
    </div>
  )
}

export default App
