/** API client for backend */

import type { AnalysisResult, AnalyzeRequest, EnsembleResponse, FeedbackItem, Settings, Signal, VersionInfo } from './types'

// Use relative paths by default (same-origin for production)
// In dev mode, VITE_API_BASE can override to point to backend (e.g., http://localhost:8000)
// If not set in dev, Vite proxy handles /api routes
const API_BASE = import.meta.env.VITE_API_BASE || ''

/** Error thrown when backend returns {"error":{"code":"...","message":"..."}} */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  let code = 'UNKNOWN'
  let message = response.statusText || 'Request failed'
  try {
    const body = (await response.json()) as Record<string, unknown>
    // FastAPI HTTPException returns { detail: { error: { code, message } } } or { detail: "string" }
    const detail = body?.detail
    const errBlock =
      detail && typeof detail === 'object' && (detail as Record<string, unknown>).error
        ? (detail as { error: { code?: string; message?: string } }).error
        : body?.error && typeof body.error === 'object'
          ? (body.error as { code?: string; message?: string })
          : null
    if (errBlock && typeof errBlock.code === 'string') code = errBlock.code
    if (errBlock && typeof errBlock.message === 'string') message = errBlock.message
  } catch {
    // non-JSON or gateway timeout body; use status-based message
    if (response.status === 504) {
      code = 'MODEL_TIMEOUT'
      message = 'Request timed out. For Ensemble, try Quick Demo instead or increase Cloud Run timeout (see README).'
    }
  }
  throw new ApiError(code, message)
}

export async function getVersion(): Promise<VersionInfo> {
  const response = await fetch(`${API_BASE}/api/version`)
  await throwIfNotOk(response)
  return response.json()
}

export async function getDemo(): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE}/api/demo`)
  await throwIfNotOk(response)
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
  await throwIfNotOk(response)
  return response.json()
}

export async function analyzeEnsemble(
  signals: Signal[],
  settings?: Settings,
  feedback?: FeedbackItem[]
): Promise<EnsembleResponse> {
  const payload = { signals, settings: settings ?? undefined, feedback: feedback && feedback.length > 0 ? feedback : undefined }
  const response = await fetch(`${API_BASE}/api/analyze/ensemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await throwIfNotOk(response)
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
  await throwIfNotOk(response)
  return response.json()
}

export async function healthCheck(): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/api/health`)
  await throwIfNotOk(response)
  return response.json()
}
