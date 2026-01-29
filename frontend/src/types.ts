/** Types matching backend Pydantic models */

export interface IntentBlock {
  title: string
  detail: string
}

export interface EvidenceItem {
  day: string
  reason: string
}

export interface ReasoningCard {
  title: string
  body: string
  refs: string[]
}

export interface AnalysisResult {
  analysis_id: string
  baseline_intent: IntentBlock
  current_intent: IntentBlock
  drift_detected: boolean
  confidence: number
  drift_direction: string
  evidence: EvidenceItem[]
  reasoning_cards: ReasoningCard[]
  drift_signature: string
  one_question: string | null
}

export interface FeedbackItem {
  analysis_id: string
  verdict: 'confirm' | 'reject'
  comment?: string
  created_at: string
}

export interface AnalyzeRequest {
  signals: Signal[]
  feedback?: FeedbackItem[]
  settings?: Settings
}

export interface Signal {
  day: string
  type: string
  content: string
}

export interface Settings {
  baseline_window_size: number
  current_window_size: number
  thinking_level: 'low' | 'medium' | 'high'
}

export interface VersionInfo {
  git_sha: string
  build_time: string
  gemini_model: string
  service_name: string
}

/** Ensemble: evidence agreement buckets (3_of_3, 2_of_3, 1_of_3) */
export interface EvidenceAgreement {
  '3_of_3': EvidenceItem[]
  '2_of_3': EvidenceItem[]
  '1_of_3': EvidenceItem[]
}

export interface DirectionVote {
  value: string
  count: number
}

export interface Agreement {
  drift_detected_votes: { true: number; false: number }
  confidence_min: number
  confidence_max: number
  direction_votes: DirectionVote[]
  evidence_agreement: EvidenceAgreement
}

export interface EnsembleErrorItem {
  mode: string
  code: string
  message: string
}

export interface EnsembleMeta {
  modes: string[]
  duration_ms: number
  partial: boolean
  errors?: EnsembleErrorItem[] | null
}

export interface EnsembleResponse {
  analysis_id: string
  analyses: AnalysisResult[]
  consensus: AnalysisResult
  agreement: Agreement
  meta: EnsembleMeta
}
