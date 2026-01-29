import type { Settings } from '../types'

interface SettingsPanelProps {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  ensembleMode?: boolean
  onEnsembleModeChange?: (on: boolean) => void
}

export const DEFAULT_SETTINGS: Settings = {
  baseline_window_size: 2,
  current_window_size: 2,
  thinking_level: 'medium',
}

export function SettingsPanel({ settings, onSettingsChange, ensembleMode = false, onEnsembleModeChange }: SettingsPanelProps) {
  const handleChange = (key: keyof Settings, value: string | number) => {
    const updated = { ...settings, [key]: value }
    localStorage.setItem('intent-drift-settings', JSON.stringify(updated))
    onSettingsChange(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>Settings</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          Baseline Window Size
          <input
            type="number"
            min="1"
            value={settings.baseline_window_size}
            onChange={(e) => handleChange('baseline_window_size', parseInt(e.target.value) || 1)}
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          Current Window Size
          <input
            type="number"
            min="1"
            value={settings.current_window_size}
            onChange={(e) => handleChange('current_window_size', parseInt(e.target.value) || 1)}
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          Thinking Level
          <select
            value={settings.thinking_level}
            onChange={(e) => handleChange('thinking_level', e.target.value as Settings['thinking_level'])}
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        {onEnsembleModeChange != null && (
          <label className="settings-panel__ensemble-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              checked={ensembleMode}
              onChange={(e) => onEnsembleModeChange(e.target.checked)}
              aria-label="Ensemble Mode (3 runs)"
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Ensemble Mode (3 runs)</span>
            <span style={{ fontSize: '0.75rem', color: '#555' }}>Shows disagreement and consensus (slower)</span>
          </label>
        )}
      </div>
    </div>
  )
}

