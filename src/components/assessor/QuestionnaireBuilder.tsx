import { useState, useRef, useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronLeft, Plus, Trash2, GripVertical, X, ChevronDown, ChevronRight,
  Save, Undo2, Eye, EyeOff, ChevronsUpDown,
} from 'lucide-react'
import type { ImportedQuestionnaire, QuestionType, Section, Subsection, Question } from '../../types'
import { saveImportedQuestionnaire } from '../../lib/storage'
import { publishQuestionnaire } from '../../lib/fetchQuestionnaire'

// ── Exported builder types ─────────────────────────────────────────────────────

export interface BFollowUp {
  trigger: string
  questions: BQuestion[]
}

export interface BQuestion {
  uid: string
  text: string
  type: QuestionType
  options: string[]
  followUp: BFollowUp | null
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

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'yes_no_notsure', label: 'Yes / No / Not Sure' },
  { value: 'yes_no_notsure_prefernot', label: 'Yes / No / Not Sure / Prefer Not to Say' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multi_choice', label: 'Multiple Choice' },
  { value: 'free_text', label: 'Free Text' },
]

const TRIGGER_OPTIONS: Record<QuestionType, string[]> = {
  yes_no: ['Yes', 'No'],
  yes_no_notsure: ['Yes', 'No', 'Not Sure'],
  yes_no_prefernot: ['Yes', 'No', 'Prefer Not to Say'],
  yes_no_notsure_prefernot: ['Yes', 'No', 'Not Sure', 'Prefer Not to Say'],
  single_choice: [],
  multi_choice: [],
  free_text: [],
}

// The six fixed report subheadings — sections always map 1:1 to these
export const REPORT_SECTIONS = [
  { value: 'bg-health',      label: 'Health & Developmental History' },
  { value: 'bg-family',      label: 'Family History' },
  { value: 'bg-linguistic',  label: 'Linguistic History' },
  { value: 'bg-educational', label: 'Educational & Work History' },
  { value: 'bg-current',     label: "Current Situation & Individual's Voice" },
  { value: 'bg-further',     label: 'Further Information' },
]

// Question type → display label + colour pill class
const TYPE_LABEL: Record<QuestionType, string> = {
  yes_no: 'Yes / No',
  yes_no_notsure: 'Yes / No / Not Sure',
  yes_no_prefernot: 'Yes / No / Prefer Not',
  yes_no_notsure_prefernot: 'Yes / No / Not Sure / Prefer Not',
  single_choice: 'Single Choice',
  multi_choice: 'Multi Choice',
  free_text: 'Free Text',
}

const TYPE_PILL: Record<QuestionType, string> = {
  yes_no: 'bg-emerald-500/20 text-emerald-400',
  yes_no_notsure: 'bg-emerald-500/20 text-emerald-400',
  yes_no_prefernot: 'bg-emerald-500/20 text-emerald-400',
  yes_no_notsure_prefernot: 'bg-emerald-500/20 text-emerald-400',
  single_choice: 'bg-sky-500/20 text-sky-400',
  multi_choice: 'bg-violet-500/20 text-violet-400',
  free_text: 'bg-amber-500/20 text-amber-400',
}

const DEPTH_BORDER = ['', 'border-sky-500/60', 'border-violet-500/60', 'border-amber-500/60']
function depthBorder(depth: number) {
  return DEPTH_BORDER[Math.min(depth, DEPTH_BORDER.length - 1)]
}

function triggerOptions(q: BQuestion): string[] {
  if (q.type === 'single_choice' || q.type === 'multi_choice') return q.options
  return TRIGGER_OPTIONS[q.type] ?? []
}

// Convert a stored (normalised) condition back to the display label used in the dropdown
function denormalizeTrigger(type: QuestionType, options: string[], stored: string): string {
  const opts = (type === 'single_choice' || type === 'multi_choice') ? options : (TRIGGER_OPTIONS[type] ?? [])
  return opts.find(o => o.toLowerCase().replace(/ /g, '_') === stored) ?? stored
}

// ── ID helpers ─────────────────────────────────────────────────────────────────

let _uidCounter = 0
function uid(): string {
  return `b${++_uidCounter}-${Math.random().toString(36).slice(2, 6)}`
}

function newQuestion(): BQuestion {
  return { uid: uid(), text: '', type: 'yes_no', options: [], followUp: null }
}

function newSubsection(title = ''): BSubsection {
  return { uid: uid(), title, questions: [newQuestion()] }
}

// ── Initialise 6 fixed sections, optionally pre-populated from initialData ─────

function makeFixedSections(initialData?: { sections: BSection[] }): BSection[] {
  return REPORT_SECTIONS.map(rs => {
    // Merge all input sections that map to this report heading (or unmapped → bg-further)
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
            trigger: denormalizeTrigger(q.type, q.options ?? [], Array.isArray(followUp.condition) ? followUp.condition[0] : followUp.condition as string),
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

// ── Conversion to output format ────────────────────────────────────────────────

function convertQuestion(bq: BQuestion, qId: string): Question {
  const q: Question = { id: qId, text: bq.text, type: bq.type }
  if (bq.options.length > 0) q.options = bq.options
  if (bq.followUp && bq.followUp.questions.length > 0) {
    // yes_no* answers are stored normalised (lowercase + underscores); single_choice answers are stored verbatim
    const isYesNo = ['yes_no', 'yes_no_notsure', 'yes_no_prefernot', 'yes_no_notsure_prefernot'].includes(bq.type)
    const condition = isYesNo ? bq.followUp.trigger.toLowerCase().replace(/ /g, '_') : bq.followUp.trigger
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

// ── Question editor (recursive — used at all depths) ───────────────────────────

interface QuestionEditorProps {
  q: BQuestion
  qId: string
  depth: number
  tint: 'a' | 'b'
  onChange: (q: BQuestion) => void
  onDelete: () => void
  dragHandle?: React.ReactNode
}

function QuestionEditor({ q, qId, depth, tint, onChange, onDelete, dragHandle }: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(true)
  const [newOption, setNewOption] = useState('')
  const optionInputRef = useRef<HTMLInputElement>(null)

  const needsOptions = q.type === 'single_choice' || q.type === 'multi_choice'
  const canHaveFollowUp = !needsOptions || q.options.length > 0
  const triggers = triggerOptions(q)

  useEffect(() => {
    if (needsOptions) optionInputRef.current?.focus()
  }, [needsOptions])

  function addOption() {
    const val = newOption.trim()
    if (!val || q.options.includes(val)) return
    onChange({ ...q, options: [...q.options, val] })
    setNewOption('')
  }

  function removeOption(i: number) {
    const opts = q.options.filter((_, idx) => idx !== i)
    onChange({ ...q, options: opts, followUp: q.followUp ? { ...q.followUp, trigger: opts[0] ?? '' } : null })
  }

  function toggleFollowUp() {
    if (q.followUp) {
      onChange({ ...q, followUp: null })
    } else {
      onChange({ ...q, followUp: { trigger: triggers[0] ?? '', questions: [newQuestion()] } })
    }
  }

  function updateFollowUpQ(idx: number, fq: BQuestion) {
    if (!q.followUp) return
    const updated = [...q.followUp.questions]
    updated[idx] = fq
    onChange({ ...q, followUp: { ...q.followUp, questions: updated } })
  }

  function deleteFollowUpQ(idx: number) {
    if (!q.followUp) return
    const updated = q.followUp.questions.filter((_, i) => i !== idx)
    onChange({ ...q, followUp: updated.length === 0 ? null : { ...q.followUp, questions: updated } })
  }

  function addFollowUpQ() {
    if (!q.followUp) return
    onChange({ ...q, followUp: { ...q.followUp, questions: [...q.followUp.questions, newQuestion()] } })
  }

  const bg = tint === 'a' ? 'bg-white' : 'bg-sky-50'

  return (
    <div className={`${bg} border border-gray-200 rounded-lg`}>
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {dragHandle}
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-mono text-gray-400 shrink-0">{qId}</span>
          {depth > 0 && <span className="text-xs text-gray-400 italic shrink-0">follow-up</span>}
          {/* Type pill + preview text when collapsed */}
          {!expanded && (
            <>
              <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_PILL[q.type]}`}>
                {TYPE_LABEL[q.type]}
              </span>
              {q.text && <span className="text-sm text-gray-700 truncate">{q.text}</span>}
            </>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-red-500 shrink-0"
          title="Delete question"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 ml-8">
          {/* Question text */}
          <textarea
            value={q.text}
            onChange={e => onChange({ ...q, text: e.target.value })}
            placeholder="Question text…"
            rows={2}
            className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 resize-none"
          />

          {/* Type selector */}
          <select
            value={q.type}
            onChange={e => onChange({ ...q, type: e.target.value as QuestionType, options: [], followUp: null })}
            className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-gray-900"
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* Options (single / multi choice) */}
          {needsOptions && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Answer options</p>
              {q.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {q.options.map((opt, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 text-sm text-gray-900"
                    >
                      {opt}
                      <button
                        onClick={() => removeOption(i)}
                        className="text-gray-400 hover:text-red-500 ml-0.5"
                        aria-label={`Remove ${opt}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={optionInputRef}
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                placeholder="Type an option and press Enter…"
                className="w-full bg-gray-50 border border-gray-300 rounded px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900"
              />
            </div>
          )}

          {/* Follow-up toggle + nested questions */}
          {canHaveFollowUp && triggers.length > 0 && (
            <div>
              <button
                onClick={toggleFollowUp}
                className="text-xs text-gray-900 hover:text-gray-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {q.followUp ? 'Remove follow-up' : 'Add follow-up questions'}
              </button>

              {q.followUp && (
                <div className={`mt-2 pl-4 border-l-2 ${depthBorder(depth + 1)} space-y-2`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Show when answer is</span>
                    <select
                      value={q.followUp.trigger}
                      onChange={e => onChange({ ...q, followUp: { ...q.followUp!, trigger: e.target.value } })}
                      className="bg-gray-50 border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-900 focus:outline-none focus:border-gray-900"
                    >
                      {triggers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {q.followUp.questions.map((fq, fqi) => (
                    <QuestionEditor
                      key={fq.uid}
                      q={fq}
                      qId={`${qId}.${fqi + 1}`}
                      depth={depth + 1}
                      tint={tint}
                      onChange={updated => updateFollowUpQ(fqi, updated)}
                      onDelete={() => deleteFollowUpQ(fqi)}
                    />
                  ))}

                  <button
                    onClick={addFollowUpQ}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                  >
                    <Plus className="w-3 h-3" /> Add another follow-up
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Sortable question wrapper ──────────────────────────────────────────────────

interface SortableQProps {
  q: BQuestion
  sectionIdx: number
  qIdx: number
  onChange: (q: BQuestion) => void
  onDelete: () => void
}

function SortableQuestion({ q, sectionIdx, qIdx, onChange, onDelete }: SortableQProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: q.uid })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0"
      title="Drag to reorder"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  )

  const tint: 'a' | 'b' = qIdx % 2 === 0 ? 'a' : 'b'

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionEditor
        q={q}
        qId={`${sectionIdx + 1}.${qIdx + 1}`}
        depth={0}
        tint={tint}
        onChange={onChange}
        onDelete={onDelete}
        dragHandle={dragHandle}
      />
    </div>
  )
}

// ── Subsection block ──────────────────────────────────────────────────────────

interface SubsectionBlockProps {
  sub: BSubsection
  sectionIdx: number
  onChange: (sub: BSubsection) => void
  onDelete: () => void
  onBeforeDelete: (label: string) => void
}

function SubsectionBlock({ sub, sectionIdx, onChange, onDelete, onBeforeDelete }: SubsectionBlockProps) {
  const [collapsed, setCollapsed] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))
  const questionCount = sub.questions.filter(q => q.text.trim()).length

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = sub.questions.findIndex(q => q.uid === active.id)
    const newIdx = sub.questions.findIndex(q => q.uid === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    onChange({ ...sub, questions: arrayMove(sub.questions, oldIdx, newIdx) })
  }

  function updateQuestion(idx: number, q: BQuestion) {
    const updated = [...sub.questions]
    updated[idx] = q
    onChange({ ...sub, questions: updated })
  }

  function deleteQuestion(idx: number) {
    const q = sub.questions[idx]
    const label = q.text.trim()
      ? `"${q.text.trim().slice(0, 40)}${q.text.length > 40 ? '…' : ''}"`
      : `question ${sectionIdx + 1}.${idx + 1}`
    onBeforeDelete(label)
    onChange({ ...sub, questions: sub.questions.filter((_, i) => i !== idx) })
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden ml-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200">
        <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-600 shrink-0">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <input
          value={sub.title}
          onChange={e => onChange({ ...sub, title: e.target.value })}
          placeholder="Subsection title…"
          className="flex-1 bg-transparent text-sm font-medium text-gray-700 focus:outline-none border-b border-transparent focus:border-gray-400 placeholder-gray-400"
        />
        {questionCount > 0 && (
          <span className="text-xs text-gray-500 shrink-0">{questionCount}q</span>
        )}
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 shrink-0" title="Delete subsection">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sub.questions.map(q => q.uid)} strategy={verticalListSortingStrategy}>
              {sub.questions.map((q, qi) => (
                <SortableQuestion
                  key={q.uid}
                  q={q}
                  sectionIdx={sectionIdx}
                  qIdx={qi}
                  onChange={updated => updateQuestion(qi, updated)}
                  onDelete={() => deleteQuestion(qi)}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            onClick={() => onChange({ ...sub, questions: [...sub.questions, newQuestion()] })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg w-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add question
          </button>
        </div>
      )}
    </div>
  )
}

// ── Fixed section (title fixed to report heading, questions drag/droppable) ────

interface FixedSectionProps {
  bs: BSection
  sectionIdx: number
  collapsed: boolean
  allowSubsections: boolean
  onToggleCollapse: () => void
  onChange: (bs: BSection) => void
  onBeforeDelete: (label: string) => void
}

function FixedSection({ bs, sectionIdx, collapsed, allowSubsections, onToggleCollapse, onChange, onBeforeDelete }: FixedSectionProps) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))
  const directCount = bs.questions.filter(q => q.text.trim()).length
  const subCount = bs.subsections.reduce((acc, sub) => acc + sub.questions.filter(q => q.text.trim()).length, 0)
  const questionCount = directCount + subCount

  function handleQuestionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = bs.questions.findIndex(q => q.uid === active.id)
    const newIdx = bs.questions.findIndex(q => q.uid === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    onChange({ ...bs, questions: arrayMove(bs.questions, oldIdx, newIdx) })
  }

  function updateQuestion(idx: number, q: BQuestion) {
    const updated = [...bs.questions]
    updated[idx] = q
    onChange({ ...bs, questions: updated })
  }

  function deleteQuestion(idx: number) {
    const q = bs.questions[idx]
    const label = q.text.trim()
      ? `"${q.text.trim().slice(0, 40)}${q.text.length > 40 ? '…' : ''}"`
      : `question ${sectionIdx + 1}.${idx + 1}`
    onBeforeDelete(label)
    onChange({ ...bs, questions: bs.questions.filter((_, i) => i !== idx) })
  }

  function updateSubsection(idx: number, sub: BSubsection) {
    const updated = [...bs.subsections]
    updated[idx] = sub
    onChange({ ...bs, subsections: updated })
  }

  function deleteSubsection(idx: number) {
    onChange({ ...bs, subsections: bs.subsections.filter((_, i) => i !== idx) })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Section header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200 cursor-pointer select-none"
        onClick={onToggleCollapse}
      >
        <span className="text-gray-400 shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-900">{bs.title}</span>
        {questionCount > 0 && (
          <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">
            {questionCount} {questionCount === 1 ? 'question' : 'questions'}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3" onClick={e => e.stopPropagation()}>
          {/* Direct questions */}
          {bs.questions.length > 0 && (
            <div className="space-y-2">
              {bs.subsections.length > 0 && (
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">General</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                <SortableContext items={bs.questions.map(q => q.uid)} strategy={verticalListSortingStrategy}>
                  {bs.questions.map((q, qi) => (
                    <SortableQuestion
                      key={q.uid}
                      q={q}
                      sectionIdx={sectionIdx}
                      qIdx={qi}
                      onChange={updated => updateQuestion(qi, updated)}
                      onDelete={() => deleteQuestion(qi)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Subsections */}
          {bs.subsections.map((sub, si) => (
            <SubsectionBlock
              key={sub.uid}
              sub={sub}
              sectionIdx={sectionIdx}
              onChange={updated => updateSubsection(si, updated)}
              onDelete={() => deleteSubsection(si)}
              onBeforeDelete={onBeforeDelete}
            />
          ))}

          {/* Add subsection */}
          {allowSubsections && (
            <button
              onClick={() => onChange({ ...bs, subsections: [...bs.subsections, newSubsection()] })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-dashed border-gray-300 rounded-lg w-full transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add subsection
            </button>
          )}

          {/* Add question */}
          <button
            onClick={() => onChange({ ...bs, questions: [...bs.questions, newQuestion()] })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg w-full transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add question
          </button>
        </div>
      )}
    </div>
  )
}

// ── Preview mode ───────────────────────────────────────────────────────────────

function PreviewQuestion({ q, qId, depth, tint }: { q: BQuestion; qId: string; depth: number; tint: 'a' | 'b' }) {
  const bg = tint === 'a' ? 'bg-white' : 'bg-sky-50'
  return (
    <div className={`${bg} rounded px-2 py-1.5 ${depth > 0 ? 'ml-4 border-l-2 border-sky-200' : ''}`}>
      <div className="flex items-start gap-2">
        <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5">{qId}</span>
        <div className="flex-1 min-w-0">
          {depth > 0 && (
            <p className="text-xs text-gray-400 italic mb-0.5">
              If <span className="text-gray-600 font-medium">{q.followUp?.trigger ?? ''}</span>:
            </p>
          )}
          <p className="text-sm text-gray-900">
            {q.text || <em className="text-gray-400">No question text</em>}
          </p>
          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${TYPE_PILL[q.type]}`}>
            {TYPE_LABEL[q.type]}
          </span>
          {q.options.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {q.options.map((opt, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                  {opt}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {q.followUp && (
        <div className="mt-1 space-y-1">
          {q.followUp.questions.map((fq, fqi) => (
            <PreviewQuestion
              key={fq.uid}
              q={fq}
              qId={`${qId}.${fqi + 1}`}
              depth={depth + 1}
              tint={tint}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PreviewView({ name, sections }: { name: string; sections: BSection[] }) {
  const populated = sections.filter(s =>
    s.questions.some(q => q.text.trim()) ||
    s.subsections.some(sub => sub.questions.some(q => q.text.trim()))
  )
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {name && <h2 className="text-lg font-semibold text-gray-900">{name}</h2>}
      {populated.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No questions added yet.</p>
      ) : (
        populated.map((bs, si) => {
          let qCounter = 0
          const directQuestions = bs.questions.filter(q => q.text.trim())
          return (
            <div key={bs.uid} className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 pb-1 border-b border-gray-200">
                {bs.title}
              </h3>
              <div className="space-y-1">
                {directQuestions.map(q => {
                  const tint: 'a' | 'b' = qCounter % 2 === 0 ? 'a' : 'b'
                  qCounter++
                  return <PreviewQuestion key={q.uid} q={q} qId={`${si + 1}.${qCounter}`} depth={0} tint={tint} />
                })}
                {bs.subsections.map(sub => {
                  const subQs = sub.questions.filter(q => q.text.trim())
                  if (subQs.length === 0) return null
                  return (
                    <div key={sub.uid} className="mt-3 space-y-1">
                      {sub.title && (
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          {sub.title}
                        </p>
                      )}
                      {subQs.map(q => {
                        const tint: 'a' | 'b' = qCounter % 2 === 0 ? 'a' : 'b'
                        qCounter++
                        return <PreviewQuestion key={q.uid} q={q} qId={`${si + 1}.${qCounter}`} depth={0} tint={tint} />
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────────────────

interface QuestionnaireBuilderProps {
  onBack: () => void
  onSaved: (q: ImportedQuestionnaire) => void
  allowSubsections?: boolean
  initialData?: {
    sections: BSection[]
    name?: string       // set when editing an existing questionnaire
    id?: string         // set when editing — preserved in output
    createdAt?: string  // set when editing — preserved in output
  }
}

export default function QuestionnaireBuilder({ onBack, onSaved, allowSubsections = true, initialData }: QuestionnaireBuilderProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [sections, setSections] = useState<BSection[]>(makeFixedSections(initialData))
  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>({})
  const [previewMode, setPreviewMode] = useState(false)
  const [undoStack, setUndoStack] = useState<{ label: string; sections: BSection[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishWarning, setPublishWarning] = useState(false)
  const [lastSaved, setLastSaved] = useState<ImportedQuestionnaire | null>(null)

  // Ref so captureUndo always snapshots the latest sections without stale closures
  const sectionsRef = useRef(sections)
  useEffect(() => { sectionsRef.current = sections }, [sections])

  const isEditing = !!initialData?.id
  const allCollapsed = REPORT_SECTIONS.every(rs => sectionCollapsed[rs.value])

  function toggleCollapseAll() {
    const next: Record<string, boolean> = {}
    for (const rs of REPORT_SECTIONS) next[rs.value] = !allCollapsed
    setSectionCollapsed(next)
  }

  // Snapshot current sections before a delete (called by FixedSection before mutating)
  function captureUndo(label: string) {
    setUndoStack({ label, sections: sectionsRef.current })
  }

  function handleUndo() {
    if (!undoStack) return
    setSections(undoStack.sections)
    setUndoStack(null)
  }

  function updateSection(idx: number, bs: BSection) {
    // Any non-delete change clears undo to avoid confusion
    setSections(prev => { const u = [...prev]; u[idx] = bs; return u })
  }

  async function handleSave() {
    setError(null)
    if (!name.trim()) { setError('Please give the questionnaire a name.'); nameInputRef.current?.focus(); return }
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
        // Stay on builder so user sees the warning and can choose to continue
        setPublishWarning(true)
        setLastSaved(q)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

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
          {isEditing ? 'Edit Questionnaire' : 'Build Questionnaire'}
        </h1>

        {/* Undo delete */}
        <button
          onClick={handleUndo}
          disabled={!undoStack}
          title={undoStack ? `Undo delete: ${undoStack.label}` : 'Nothing to undo'}
          className="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Collapse / expand all */}
        <button
          onClick={toggleCollapseAll}
          title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
          className="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
        >
          <ChevronsUpDown className="w-4 h-4" />
        </button>

        {/* Preview toggle */}
        <button
          onClick={() => setPreviewMode(p => !p)}
          title={previewMode ? 'Back to editor' : 'Preview questionnaire'}
          className="flex items-center gap-1 p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
        >
          {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden sm:inline text-xs">{previewMode ? 'Edit' : 'Preview'}</span>
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
      </div>

      {previewMode ? (
        <PreviewView name={name} sections={sections} />
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Questionnaire name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Questionnaire name</label>
            <input
              ref={nameInputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Adult Background Questionnaire"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 text-sm"
            />
          </div>

          {/* Fixed sections */}
          <div className="space-y-3">
            {sections.map((bs, si) => (
              <FixedSection
                key={bs.uid}
                bs={bs}
                sectionIdx={si}
                collapsed={!!sectionCollapsed[bs.uid]}
                allowSubsections={allowSubsections}
                onToggleCollapse={() =>
                  setSectionCollapsed(prev => ({ ...prev, [bs.uid]: !prev[bs.uid] }))
                }
                onChange={updated => updateSection(si, updated)}
                onBeforeDelete={captureUndo}
              />
            ))}
          </div>

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
      )}
    </div>
  )
}
