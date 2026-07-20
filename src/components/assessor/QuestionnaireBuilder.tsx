import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronLeft, Save, Undo2, Eye, BookOpen, CheckCircle, ChevronRight, X, Pencil, Copy, FileDown, HelpCircle } from 'lucide-react'
import type { ImportedQuestionnaire, QuestionType, Section, Subsection, Question, Questionnaire } from '../../types'
import { saveImportedQuestionnaire } from '../../lib/storage'
import { publishQuestionnaire } from '../../lib/fetchQuestionnaire'
import { downloadBlankQuestionnaireDoc } from '../../lib/wordExport'
import QuestionnaireTableEditor from './QuestionnaireTableEditor'
import SpotlightTour, { TOUR_SEEN_KEY } from './SpotlightTour'
import {
  type BFollowUp, type BQuestion, type BSubsection, type BSection,
  REPORT_SECTIONS, uid,
} from './questionnaireBuilderShared'
import QuestionFlow from '../learner/QuestionFlow'
import { PreviewLearnerProvider, useLearner } from '../../contexts/LearnerContext'
import { getSectionProgress } from '../../lib/progress'

// ── Re-export types so existing importers don't break ─────────────────────────

export type { BFollowUp, BQuestion, BSubsection, BSection }
export { REPORT_SECTIONS }


// ── Conversion helpers ─────────────────────────────────────────────────────────

function denormalizeTrigger(type: QuestionType, options: string[], stored: string): string {
  const opts = (type === 'single_choice' || type === 'multi_choice') ? options : (['Yes', 'No', 'Not Sure', 'Prefer Not to Say'])
  return opts.find(o => o.toLowerCase().replace(/ /g, '_') === stored) ?? stored
}

// ── Initialise 6 fixed sections, optionally pre-populated from initialData ─────

function makeFixedSections(initialData?: { sections: BSection[] }): BSection[] {
  return REPORT_SECTIONS.map(rs => {
    const matching = initialData?.sections.filter(s =>
      s.reportSectionId === rs.value ||
      (!s.reportSectionId && rs.value === 'bg-further')
    ) ?? []
    const questions = matching.flatMap(s => s.questions)
    const subsections = matching.flatMap(s => s.subsections ?? [])
    return {
      uid: rs.value,
      title: rs.label,
      reportSectionId: rs.value,
      questions,
      subsections,
    }
  })
}

// ── Exported: convert an ImportedQuestionnaire back to BSection[] for editing ──

export function importedQuestionnaireToBuilderSections(iq: ImportedQuestionnaire): BSection[] {
  function questionToBQuestion(q: Question): BQuestion {
    const followUp = q.followUps?.[0]
    return {
      uid: uid(),
      text: q.text,
      type: q.type,
      options: q.options ?? [],
      followUp: followUp
        ? {
            trigger: q.type === 'multi_choice' && Array.isArray(followUp.condition)
              ? followUp.condition
              : denormalizeTrigger(
                  q.type,
                  q.options ?? [],
                  Array.isArray(followUp.condition) ? followUp.condition[0] : followUp.condition as string,
                ),
            questions: followUp.questions.map(questionToBQuestion),
          }
        : null,
    }
  }
  return iq.sections.map(s => ({
    uid: s.reportSectionId ?? uid(),
    title: s.title,
    reportSectionId: s.reportSectionId,
    questions: (s.questions ?? []).map(questionToBQuestion),
    subsections: (s.subsections ?? []).map(sub => ({
      uid: uid(),
      title: sub.title,
      questions: sub.questions.map(questionToBQuestion),
    })),
  }))
}

// ── Convert builder output to ImportedQuestionnaire format ─────────────────────

function convertQuestion(bq: BQuestion, qId: string): Question {
  const q: Question = { id: qId, text: bq.text, type: bq.type }
  if (bq.options.length > 0) q.options = bq.options
  if (bq.followUp && bq.followUp.questions.length > 0) {
    const isYesNo = ['yes_no', 'yes_no_notsure', 'yes_no_prefernot', 'yes_no_notsure_prefernot'].includes(bq.type)
    const normalize = (t: string) => isYesNo ? t.toLowerCase().replace(/ /g, '_') : t
    const condition = Array.isArray(bq.followUp.trigger)
      ? bq.followUp.trigger.map(normalize)
      : normalize(bq.followUp.trigger)
    q.followUps = [{
      condition,
      questions: bq.followUp.questions.map((fq, fqi) =>
        convertQuestion(fq, `${qId}.${fqi + 1}`)
      ),
    }]
  }
  return q
}

function buildOutput(
  name: string,
  sections: BSection[],
  existingId?: string,
  existingCreatedAt?: string,
): ImportedQuestionnaire {
  const keyPointsBank: Record<string, never> = {}
  let sectionCounter = 0
  const outSections: Section[] = sections
    .filter(bs =>
      bs.questions.some(q => q.text.trim()) ||
      bs.subsections.some(sub => sub.questions.some(q => q.text.trim()))
    )
    .map(bs => {
      sectionCounter++
      let qCounter = 0
      const questions = bs.questions
        .filter(q => q.text.trim())
        .map(bq => convertQuestion(bq, `${sectionCounter}.${++qCounter}`))
      const subsections: Subsection[] = bs.subsections
        .filter(sub => sub.questions.some(q => q.text.trim()))
        .map((sub, subi) => ({
          id: `section-${sectionCounter}-sub-${subi + 1}`,
          title: sub.title,
          questions: sub.questions
            .filter(q => q.text.trim())
            .map(bq => convertQuestion(bq, `${sectionCounter}.${++qCounter}`)),
        }))
      const section: Section = { id: `section-${sectionCounter}`, title: bs.title, questions }
      if (subsections.length > 0) section.subsections = subsections
      if (bs.reportSectionId) section.reportSectionId = bs.reportSectionId
      return section
    })
  const now = new Date().toISOString()
  return {
    id: existingId ?? `iq_${Date.now()}`,
    name,
    sections: outSections,
    keyPointsBank,
    createdAt: existingCreatedAt ?? now,
    updatedAt: now,
  }
}

// ── Interactive learner preview ────────────────────────────────────────────────

function PreviewSectionList({ sections, onSelect }: {
  sections: Section[]
  onSelect: (id: string) => void
}) {
  const { responses } = useLearner()
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <div className="bg-gray-100 rounded-lg p-1.5">
          <BookOpen className="w-5 h-5 text-gray-900" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-lg">QUsable</h1>
          <p className="text-xs text-gray-500">Preview — responses not saved</p>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h2>
        <p className="text-gray-600 mb-6">Please complete each section below. Your progress is saved automatically.</p>
        {sections.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No questions added yet.</p>
        ) : (
          <div className="space-y-3">
            {sections.map(section => {
              const progress = getSectionProgress(section, responses)
              const isComplete = progress === 100
              return (
                <button key={section.id} onClick={() => onSelect(section.id)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {isComplete
                        ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                        : <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${progress > 0 ? 'border-primary-400' : 'border-gray-300'}`} />
                      }
                      <span className="font-semibold text-gray-900">{section.title}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LearnerPreviewContent({ sections }: { sections: BSection[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const iq = useMemo(() => buildOutput('Preview', sections), [sections])
  const q: Questionnaire = { type: '16plus', sections: iq.sections }

  if (selectedId) {
    const section = iq.sections.find(s => s.id === selectedId)
    if (section) {
      const allQuestions = [
        ...(section.questions ?? []),
        ...(section.subsections?.flatMap(sub => sub.questions) ?? []),
      ]
      return (
        <QuestionFlow
          questions={allQuestions}
          onBack={() => setSelectedId(null)}
          title={section.title}
          questionnaire={q}
        />
      )
    }
  }

  return <PreviewSectionList sections={iq.sections} onSelect={setSelectedId} />
}

function LearnerPreviewView({ sections, onClose }: { sections: BSection[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-50">
      <button
        onClick={onClose}
        title="Close preview"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <X className="w-4 h-4" />
        Close preview
      </button>
      <PreviewLearnerProvider>
        <LearnerPreviewContent sections={sections} />
      </PreviewLearnerProvider>
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────────────────

interface QuestionnaireBuilderProps {
  onBack: () => void
  onSaved: (q: ImportedQuestionnaire) => void
  allowSubsections?: boolean
  startReadOnly?: boolean
  isBuiltIn?: boolean
  onDuplicateAndEdit?: () => void
  initialData?: {
    sections: BSection[]
    name?: string
    id?: string
    createdAt?: string
  }
}

export default function QuestionnaireBuilder({
  onBack, onSaved, initialData, startReadOnly, isBuiltIn, onDuplicateAndEdit,
}: QuestionnaireBuilderProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [sections, setSections] = useState<BSection[]>(makeFixedSections(initialData))
  const [readOnly, setReadOnly] = useState(startReadOnly ?? false)
  const [editorKey, setEditorKey] = useState(0)
  const [showTour, setShowTour] = useState(() => !localStorage.getItem(TOUR_SEEN_KEY))
  const [previewMode, setPreviewMode] = useState(false)
  const [undoStack, setUndoStack] = useState<BSection[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishWarning, setPublishWarning] = useState(false)
  const [lastSaved, setLastSaved] = useState<ImportedQuestionnaire | null>(null)

  const sectionsRef = useRef(sections)
  useEffect(() => { sectionsRef.current = sections }, [sections])

  const isEditing = !!initialData?.id

  function captureUndo() {
    setUndoStack(sectionsRef.current)
  }

  function handleUndo() {
    if (!undoStack) return
    setSections(undoStack)
    setUndoStack(null)
  }

  async function handleSave() {
    setError(null)
    if (!name.trim()) {
      setError('Please give the questionnaire a name.')
      nameInputRef.current?.focus()
      return
    }
    const hasQ = sections.some(s => s.questions.some(q => q.text.trim()))
    if (!hasQ) { setError('Add at least one question with text.'); return }

    setSaving(true)
    setPublishWarning(false)
    setLastSaved(null)
    try {
      const q = buildOutput(name.trim(), sections, initialData?.id, initialData?.createdAt)
      const published = await publishQuestionnaire(q)
      if (published) q.publishedAt = new Date().toISOString()
      await saveImportedQuestionnaire(q)
      if (published) {
        onSaved(q)
      } else {
        setPublishWarning(true)
        setLastSaved(q)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleWordDownload() {
    const iq = buildOutput(name || 'Questionnaire', sections)
    await downloadBlankQuestionnaireDoc(iq.name, iq.sections)
  }

  const flaggedTotal = sections.reduce((sum, s) => sum + s.questions.filter(q => q.flagged).length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-sm font-semibold text-gray-900 flex-1 text-center">
          {readOnly ? name || 'Questionnaire' : (isEditing ? 'Edit Questionnaire' : 'Build Questionnaire')}
        </h1>

        {readOnly ? (
          <>
            {/* Word download */}
            <button
              onClick={handleWordDownload}
              title="Download as Word"
              className="flex items-center gap-1 p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Word</span>
            </button>

            {/* Preview */}
            <button
              onClick={() => setPreviewMode(true)}
              title="Preview questionnaire"
              className="flex items-center gap-1 p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Preview</span>
            </button>

            {/* Edit / Duplicate & Edit */}
            {isBuiltIn ? (
              <button
                onClick={onDuplicateAndEdit}
                title="Duplicate and edit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Duplicate &amp; Edit</span>
              </button>
            ) : (
              <button
                onClick={() => { setReadOnly(false); setEditorKey(k => k + 1) }}
                title="Edit questionnaire"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </>
        ) : (
          <>
            {/* Flagged count */}
            {flaggedTotal > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                {flaggedTotal} flagged
              </span>
            )}

            {/* Undo last delete */}
            <button
              onClick={handleUndo}
              disabled={!undoStack}
              title={undoStack ? 'Undo last deletion' : 'Nothing to undo'}
              className="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Preview */}
            <button
              onClick={() => setPreviewMode(true)}
              title="Preview questionnaire"
              className="flex items-center gap-1 p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Preview</span>
            </button>

            {/* Save & Publish */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-gray-900 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save & Publish'}</span>
            </button>
          </>
        )}

        {/* Tour button — always visible */}
        <button
          onClick={() => setShowTour(true)}
          title="Open tour"
          className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {previewMode && (
        <LearnerPreviewView sections={sections} onClose={() => setPreviewMode(false)} />
      )}

      {showTour && (
        <SpotlightTour onClose={() => { localStorage.setItem(TOUR_SEEN_KEY, '1'); setShowTour(false) }} />
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Questionnaire name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Questionnaire name</label>
            <input
              ref={nameInputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              readOnly={readOnly}
              placeholder="e.g. Adult Background Questionnaire"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 text-sm ${readOnly ? 'border-gray-200 text-gray-600 cursor-default focus:outline-none' : 'border-gray-300 focus:outline-none focus:border-gray-900'}`}
            />
          </div>

          {/* Table editor */}
          <QuestionnaireTableEditor
            key={editorKey}
            sections={sections}
            onChange={setSections}
            onBeforeDelete={captureUndo}
            readOnly={readOnly}
            defaultExpanded={false}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {publishWarning && lastSaved && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex items-start justify-between gap-3">
              <p>
                Saved locally, but publishing failed. Learners won't be able to access this
                questionnaire until it is published. Check that your publish secret is configured
                correctly.
              </p>
              <button
                onClick={() => onSaved(lastSaved)}
                className="shrink-0 text-amber-700 underline hover:no-underline whitespace-nowrap"
              >
                Continue anyway
              </button>
            </div>
          )}
        </div>
    </div>
  )
}
