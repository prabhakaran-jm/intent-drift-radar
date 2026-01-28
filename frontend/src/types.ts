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
  signals: string[]
  feedback?: FeedbackItem[]
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
