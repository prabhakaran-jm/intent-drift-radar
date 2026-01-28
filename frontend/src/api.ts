/** API client for backend */

import type { AnalysisResult, AnalyzeRequest, FeedbackItem } from './types'

// In dev mode, use relative URLs to leverage Vite proxy
// In production, use VITE_API_BASE env var or default to relative
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '' : 'http://localhost:8000')

export async function analyze(signals: string[], feedback?: FeedbackItem[]): Promise<AnalysisResult> {
  const payload: AnalyzeRequest = { signals }
  if (feedback && feedback.length > 0) {
    payload.feedback = feedback
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
