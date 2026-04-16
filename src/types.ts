export type QuestionType =
  | 'yes_no'
  | 'yes_no_notsure'
  | 'yes_no_prefernot'
  | 'yes_no_notsure_prefernot'
  | 'single_choice'
  | 'multi_choice'
  | 'free_text'

export interface FollowUp {
  condition: string | string[]
  questions: Question[]
}

export interface Question {
  id: string
  text: string
  type: QuestionType
  options?: string[]
  allowOtherText?: boolean
  followUps?: FollowUp[]
  note?: string
}

export interface Subsection {
  id: string
  title: string
  note?: string
  questions: Question[]
}

export interface Section {
  id: string
  title: string
  subsections?: Subsection[]
  questions?: Question[]
  reportSectionId?: string
}

export type QuestionnaireType = 'under16' | '16plus'

export type PackageVariant = 'visual' | 'remainder'

export interface PackageRecord {
  status: 'sent' | 'imported'
  code?: string
  encryptedResponses?: string
  encryptedResponsesSalt?: string
  importedAt?: string
  importId?: string
}

export interface Questionnaire {
  type: QuestionnaireType
  sections: Section[]
}

export interface DisplayPreferences {
  fontSize: number
  lineSpacing: number
  overlayColor: string | null
  overlayOpacity: number
  readingRuler: boolean
  bionicReading: boolean
  swReader: boolean
  fontFamily: 'default'
  ttsVoiceName: string | null
}

export interface LearnerSession {
  codeHash: string
  salt: string
  questionnaireType: QuestionnaireType
  packageVariant: PackageVariant
  encryptedResponses: string
  encryptedPreferences: string
  lastUpdated: string
  submitted: boolean
  importedQuestionnaireId?: string
}

export type Responses = Record<string, string | string[] | boolean>

export interface ExpressLearnerRecord {
  id: string
  name: string
  firstName?: string
  lastName?: string
  code: string
  questionnaireType: QuestionnaireType
  importedQuestionnaireId?: string
  createdAt: string
  submitted: boolean
  packages?: Partial<Record<PackageVariant, PackageRecord>>
  keyNotes?: Record<string, string> // reportSectionId → generated prose
}

export interface AssessorPreferences {
  mainQuestionnaire: 'under16' | '16plus' | string | null  // null = none, 'under16'/'16plus' = standard, string = custom ID
  includeVisual: boolean
}

// Key-points bank entry
export interface KPEntry {
  topic: string
  yes?: string
  no?: string
  not_sure?: string
  prefer_not_to_say?: string
  single_prefix?: string
  multi_prefix?: string
  multi_none?: string
  free_text_prefix?: string
}

export interface ImportedQuestionnaire {
  id: string
  name: string
  sections: Section[]
  keyPointsBank: Record<string, KPEntry>
  createdAt: string
  updatedAt: string
  keyPointsBankUpdatedAt?: string
  publishedAt?: string
}

export type AppView =
  | 'learner-code-entry'
  | 'learner-home'

  | 'learner-questions'
  | 'assessor-home'
  | 'subscription'
