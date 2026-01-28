import { useState, useEffect } from 'react'
import type { Settings } from '../types'

interface SettingsPanelProps {
  settings: Settings
  onSettingsChange: (settings: Settings) => void
}

const DEFAULT_SETTINGS: Settings = {
  baseline_window_size: 2,
  current_window_size: 2,
  thinking_level: 'medium',
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(() => {
    // Initialize from localStorage or use defaults
    const stored = localStorage.getItem('intent-drift-settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_SETTINGS, ...parsed }
      } catch {
        return DEFAULT_SETTINGS
      }
    }
    return DEFAULT_SETTINGS
  })

  useEffect(() => {
    // Notify parent of initial settings
    onSettingsChange(localSettings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (key: keyof Settings, value: string | number) => {
    const updated = { ...localSettings, [key]: value }
    setLocalSettings(updated)
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
            value={localSettings.baseline_window_size}
            onChange={(e) => handleChange('baseline_window_size', parseInt(e.target.value) || 1)}
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          Current Window Size
          <input
            type="number"
            min="1"
            value={localSettings.current_window_size}
            onChange={(e) => handleChange('current_window_size', parseInt(e.target.value) || 1)}
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </label>

        <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
          Thinking Level
          <select
            value={localSettings.thinking_level}
            onChange={(e) => handleChange('thinking_level', e.target.value as Settings['thinking_level'])}
            style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
    </div>
  )
}

export { DEFAULT_SETTINGS }
