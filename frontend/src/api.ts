/** API client for backend */

import type { AnalysisResult, AnalyzeRequest, FeedbackItem, Settings, Signal, VersionInfo } from './types'

// Use relative paths by default (same-origin for production)
// In dev mode, VITE_API_BASE can override to point to backend (e.g., http://localhost:8000)
// If not set in dev, Vite proxy handles /api routes
const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function getVersion(): Promise<VersionInfo> {
  const response = await fetch(`${API_BASE}/api/version`)
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  return response.json()
}

export async function analyze(
  signals: Signal[],
  feedback?: FeedbackItem[],
  settings?: Settings
): Promise<AnalysisResult> {
  const payload: AnalyzeRequest = { signals }
  if (feedback && feedback.length > 0) {
    payload.feedback = feedback
  }
  if (settings) {
    payload.settings = settings
  }
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`)
  }
  return response.json()
}

export async function submitFeedback(analysisId: string, verdict: 'confirm' | 'reject', comment?: string): Promise<{ ok: boolean; saved: boolean }> {
  const response = await fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysis_id: analysisId,
      verdict,
      comment,
    }),
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
