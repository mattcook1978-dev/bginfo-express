import type { QuestionType } from '../../types'

// ── Exported builder types ─────────────────────────────────────────────────────

export interface BFollowUp {
  trigger: string | string[]
  questions: BQuestion[]
}

export interface BQuestion {
  uid: string
  text: string
  type: QuestionType
  options: string[]
  followUp: BFollowUp | null
  flagged?: boolean
}

export interface BSubsection {
  uid: string
  title: string
  questions: BQuestion[]
}

export interface BSection {
  uid: string
  title: string
  questions: BQuestion[]
  subsections: BSubsection[]
  reportSectionId?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'yes_no_notsure', label: 'Yes / No / Not Sure' },
  { value: 'yes_no_prefernot', label: 'Yes / No / Prefer Not to Say' },
  { value: 'yes_no_notsure_prefernot', label: 'Yes / No / Not Sure / Prefer Not' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multi_choice', label: 'Multi Choice' },
  { value: 'free_text', label: 'Free Text' },
]

export const TRIGGER_OPTIONS: Record<QuestionType, string[]> = {
  yes_no: ['Yes', 'No'],
  yes_no_notsure: ['Yes', 'No', 'Not Sure'],
  yes_no_prefernot: ['Yes', 'No', 'Prefer Not to Say'],
  yes_no_notsure_prefernot: ['Yes', 'No', 'Not Sure', 'Prefer Not to Say'],
  single_choice: [],
  multi_choice: [],
  free_text: [],
}

export const REPORT_SECTIONS = [
  { value: 'bg-health',      label: 'Health & Developmental History' },
  { value: 'bg-family',      label: 'Family History' },
  { value: 'bg-linguistic',  label: 'Linguistic History' },
  { value: 'bg-educational', label: 'Educational & Work History' },
  { value: 'bg-current',     label: "Current Situation & Individual's Voice" },
  { value: 'bg-further',     label: 'Further Information' },
]

// ── UID + factory helpers ──────────────────────────────────────────────────────

let _uidCounter = 0

export function uid(): string {
  return `b${++_uidCounter}-${Math.random().toString(36).slice(2, 6)}`
}

export function newQuestion(): BQuestion {
  return { uid: uid(), text: '', type: 'yes_no', options: [], followUp: null }
}

export function newSubsection(title = ''): BSubsection {
  return { uid: uid(), title, questions: [newQuestion()] }
}
