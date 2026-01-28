/** API client for backend */

import type { AnalysisResult } from './types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export async function analyze(signals: string[]): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signals }),
  })
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  return response.json()
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/api/health`)
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  return response.json()
}
