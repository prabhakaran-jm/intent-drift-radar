import { useState } from 'react'
import type { VersionInfo } from '../types'
import type { Settings } from '../types'

interface HeaderBarProps {
  versionInfo: VersionInfo | null
  settings: Settings
  loading: boolean
  onJudgeMode: () => void
  onDemoMode: () => void
}

export function HeaderBar({
  versionInfo,
  settings,
  loading,
  onJudgeMode,
  onDemoMode,
}: HeaderBarProps) {
  const [showVerifyHelp, setShowVerifyHelp] = useState(false)
  const gitShaShort =
    versionInfo?.git_sha && versionInfo.git_sha !== 'unknown'
      ? versionInfo.git_sha.slice(0, 7)
      : null

  return (
    <header className="header-bar">
      <h1 className="header-bar__title">Intent Drift Radar</h1>
      <div className="header-bar__badges">
        {versionInfo && (
          <span className="header-bar__badge" title="Model">
            Model: {versionInfo.gemini_model}
          </span>
        )}
        <span className="header-bar__badge" title="Thinking level">
          Thinking: {settings.thinking_level}
        </span>
        <span className="header-bar__badge" title="Window sizes">
          Windows: {settings.baseline_window_size} → {settings.current_window_size}
        </span>
        {gitShaShort && (
          <span className="header-bar__badge header-bar__badge--mono" title="Git SHA">
            {gitShaShort}
          </span>
        )}
      </div>
      <div className="header-bar__actions">
        <div className="header-bar__judge-cta">
          <button
            type="button"
            className="header-bar__btn header-bar__btn--judge"
            onClick={onJudgeMode}
            disabled={loading}
            title="Load demo dataset and see cached analysis in ~5 seconds"
          >
            {loading ? 'Loading…' : '▶ Quick Demo'}
          </button>
          <span className="header-bar__judge-hint">See it work in ~5 seconds</span>
          <button
            type="button"
            className="header-bar__verify-link"
            onClick={() => setShowVerifyHelp((v) => !v)}
            aria-expanded={showVerifyHelp}
          >
            How to verify
          </button>
          {showVerifyHelp && (
            <div className="header-bar__verify-help" role="region" aria-label="Verification help">
              Open DevTools → Network → check <strong>X-IDR-Mode</strong> header: <code>demo-cached</code> vs <code>live-gemini</code>
            </div>
          )}
        </div>
        <button
          type="button"
          className="header-bar__btn header-bar__btn--secondary"
          onClick={onDemoMode}
          disabled={loading}
          title="Load demo dataset only (no analysis)"
        >
          Demo Mode
        </button>
      </div>
    </header>
  )
}
