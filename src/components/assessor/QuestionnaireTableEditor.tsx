import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Flag, ChevronDown, ChevronRight, ChevronUp, CornerDownRight, X, RefreshCw, GripVertical, List } from 'lucide-react'
import type { QuestionType } from '../../types'
import {
  type BSection, type BQuestion,
  REPORT_SECTIONS, QUESTION_TYPES, TRIGGER_OPTIONS,
  newQuestion,
} from './questionnaireBuilderShared'

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['m','cm','d','cd','c','xc','l','xl','x','ix','v','iv','i']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

interface SectionStyle {
  outerBorder: string; headerBg: string; headerText: string
  bodyBg: string; badge: string; divider: string; dividerText: string
}

const SECTION_STYLES: Record<string, SectionStyle> = {
  'bg-health':      { outerBorder: 'border-rose-200',    headerBg: 'bg-rose-100',    headerText: 'text-rose-950',    bodyBg: 'bg-rose-50',    badge: 'bg-rose-200 text-rose-800',      divider: 'bg-rose-200',    dividerText: 'text-rose-500' },
  'bg-family':      { outerBorder: 'border-orange-200',  headerBg: 'bg-orange-100',  headerText: 'text-orange-950',  bodyBg: 'bg-orange-50',  badge: 'bg-orange-200 text-orange-800',  divider: 'bg-orange-200',  dividerText: 'text-orange-500' },
  'bg-linguistic':  { outerBorder: 'border-sky-200',     headerBg: 'bg-sky-100',     headerText: 'text-sky-950',     bodyBg: 'bg-sky-50',     badge: 'bg-sky-200 text-sky-800',        divider: 'bg-sky-200',     dividerText: 'text-sky-600' },
  'bg-educational': { outerBorder: 'border-emerald-200', headerBg: 'bg-emerald-100', headerText: 'text-emerald-950', bodyBg: 'bg-emerald-50', badge: 'bg-emerald-200 text-emerald-800', divider: 'bg-emerald-200', dividerText: 'text-emerald-600' },
  'bg-current':     { outerBorder: 'border-violet-200',  headerBg: 'bg-violet-100',  headerText: 'text-violet-950',  bodyBg: 'bg-violet-50',  badge: 'bg-violet-200 text-violet-800',  divider: 'bg-violet-200',  dividerText: 'text-violet-500' },
  'bg-further':     { outerBorder: 'border-cyan-200',    headerBg: 'bg-cyan-100',    headerText: 'text-cyan-950',    bodyBg: 'bg-cyan-50',    badge: 'bg-cyan-200 text-cyan-800',      divider: 'bg-cyan-200',    dividerText: 'text-cyan-600' },
}

function getSectionStyle(id?: string): SectionStyle {
  if (id && SECTION_STYLES[id]) return SECTION_STYLES[id]
  return { outerBorder: 'border-gray-200', headerBg: 'bg-gray-100', headerText: 'text-gray-900', bodyBg: 'bg-gray-50', badge: 'bg-gray-200 text-gray-700', divider: 'bg-gray-300', dividerText: 'text-gray-500' }
}

function updateQByUid(questions: BQuestion[], targetUid: string, fn: (q: BQuestion) => BQuestion): BQuestion[] {
  return questions.map(q => {
    if (q.uid === targetUid) return fn(q)
    if (q.followUp) return { ...q, followUp: { ...q.followUp, questions: updateQByUid(q.followUp.questions, targetUid, fn) } }
    return q
  })
}

function deleteQByUid(questions: BQuestion[], targetUid: string): BQuestion[] {
  return questions.filter(q => q.uid !== targetUid).map(q => {
    if (!q.followUp) return q
    const updated = deleteQByUid(q.followUp.questions, targetUid)
    return { ...q, followUp: updated.length === 0 ? null : { ...q.followUp, questions: updated } }
  })
}

function AutoTextarea({ value, onChange, placeholder, className, readOnly }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; readOnly?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
      readOnly={readOnly} placeholder={readOnly ? undefined : placeholder} rows={1}
      className={`resize-none overflow-hidden ${className ?? ''}`} />
  )
}

function OptionsStrip({ q, onChange }: { q: BQuestion; onChange: (q: BQuestion) => void }) {
  const [newOpt, setNewOpt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  function addOption() {
    const val = newOpt.trim()
    if (!val || q.options.includes(val)) return
    onChange({ ...q, options: [...q.options, val] }); setNewOpt(''); inputRef.current?.focus()
  }
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs text-gray-500 font-medium">Answer options</p>
      <div className="flex flex-wrap gap-1.5">
        {q.options.map((opt, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-800">
            {opt}
            <button onClick={() => onChange({ ...q, options: q.options.filter((_, idx) => idx !== i) })} className="text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input ref={inputRef} value={newOpt} onChange={e => setNewOpt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
          placeholder="Type option, press Enter…"
          className="text-xs border-b border-dashed border-gray-300 focus:border-gray-500 outline-none bg-transparent text-gray-700 placeholder-gray-400 min-w-[160px] py-0.5" />
      </div>
    </div>
  )
}

function OptionsPopover({ options, onChange, readOnly, autoOpen, onAutoOpened }: { options: string[]; onChange: (opts: string[]) => void; readOnly?: boolean; autoOpen?: boolean; onAutoOpened?: () => void }) {
  const [open, setOpen] = useState(false)
  const [newOpt, setNewOpt] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoOpen) { setOpen(true); onAutoOpened?.() }
  }, [autoOpen])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function addOption() {
    const val = newOpt.trim()
    if (!val || options.includes(val)) return
    onChange([...options, val])
    setNewOpt('')
    inputRef.current?.focus()
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        title="Edit options"
        className={`p-0.5 rounded transition-colors ${open ? 'text-blue-500' : 'text-gray-300 hover:text-gray-500'}`}
      >
        <List className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-3 w-64">
          <p className="text-xs font-medium text-gray-500 mb-2">Answer options</p>
          <div className="space-y-1 mb-2">
            {options.length === 0 && (
              <p className="text-xs text-gray-300 italic">No options yet</p>
            )}
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5 group">
                <span className="flex-1 text-xs text-gray-700 truncate">{opt}</span>
                {!readOnly && (
                  <button
                    onClick={() => onChange(options.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1.5 border-t border-gray-100 pt-2">
              <input
                ref={inputRef}
                value={newOpt}
                onChange={e => setNewOpt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                placeholder="Add option…"
                className="flex-1 text-xs border-b border-dashed border-gray-300 focus:border-gray-500 outline-none bg-transparent text-gray-700 placeholder-gray-400 py-0.5"
              />
              <button
                onClick={addOption}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnswerTypePreview({ q, onChange }: { q: BQuestion; onChange: (q: BQuestion) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const { type, options } = q
  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const changeBtn = (
    <div ref={pickerRef} className="relative shrink-0 self-start">
      <button onClick={() => setPickerOpen(o => !o)} title="Change question type"
        className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      {pickerOpen && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]">
          {QUESTION_TYPES.map(t => (
            <button key={t.value}
              onClick={() => { onChange({ ...q, type: t.value, options: [], followUp: null }); setPickerOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gray-50 ${q.type === t.value ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const yesNoLabels: Partial<Record<QuestionType, string[]>> = {
    yes_no: ['Yes', 'No'], yes_no_notsure: ['Yes', 'No', 'Not sure'],
    yes_no_prefernot: ['Yes', 'No', 'Prefer not to say'],
    yes_no_notsure_prefernot: ['Yes', 'No', 'Not sure', 'Prefer not to say'],
  }
  if (yesNoLabels[type]) {
    return (
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pointer-events-none select-none">
          {yesNoLabels[type]!.map(label => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
          ))}
        </div>
        {changeBtn}
      </div>
    )
  }
  if (type === 'free_text') {
    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 px-3 py-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-300 italic pointer-events-none select-none">
          Learner types their answer here…
        </div>
        {changeBtn}
      </div>
    )
  }
  const isMulti = type === 'multi_choice'
  if (options.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <p className="text-xs text-gray-300 italic pointer-events-none select-none flex-1">Add options below to preview</p>
        {changeBtn}
      </div>
    )
  }
  return (
    <div className="mt-2 flex items-start gap-2">
      <div className="flex flex-col gap-1.5 pointer-events-none select-none flex-1">
        {options.map(opt => (
          <div key={opt} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 ${isMulti ? 'rounded' : 'rounded-full'} border-2 border-gray-300 shrink-0`} />
            <span className="text-sm text-gray-400">{opt}</span>
          </div>
        ))}
      </div>
      {changeBtn}
    </div>
  )
}

function FollowUpBlock({ parentQ, parentLabel, parentDepth, onUpdateParent }: {
  parentQ: BQuestion; parentLabel: string; parentDepth: number; onUpdateParent: (updated: BQuestion) => void
}) {
  const fu = parentQ.followUp
  if (!fu) return null
  const triggers = parentQ.type === 'single_choice' || parentQ.type === 'multi_choice'
    ? parentQ.options : (TRIGGER_OPTIONS[parentQ.type] ?? [])
  const childLabel = (i: number) => parentDepth === 0 ? `${parentLabel}${toRoman(i + 1)}` : `${parentLabel}-${i + 1}`
  const updateFuQ = (i: number, updated: BQuestion) => onUpdateParent({ ...parentQ, followUp: { ...fu!, questions: fu!.questions.map((q, idx) => idx === i ? updated : q) } })
  const deleteFuQ = (i: number) => {
    const qs = fu!.questions.filter((_, idx) => idx !== i)
    onUpdateParent({ ...parentQ, followUp: qs.length === 0 ? null : { ...fu!, questions: qs } })
  }
  return (
    <div className="ml-3 pl-3 pt-1 pb-0.5 border-l-2 border-gray-200">
      <div className="flex items-center gap-1.5 mb-2">
        <CornerDownRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-xs text-gray-500 shrink-0">If answer is</span>
        {triggers.length > 0 ? (
          <select value={fu.trigger} onChange={e => onUpdateParent({ ...parentQ, followUp: { ...fu!, trigger: e.target.value } })}
            className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-700 focus:outline-none focus:border-gray-500">
            {triggers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : <span className="text-xs italic text-gray-400">any answer</span>}
        <span className="text-xs text-gray-400 shrink-0">→ show:</span>
      </div>
      <div className="space-y-2">
        {fu.questions.map((fq, i) => (
          <QuestionRow key={fq.uid} q={fq} label={childLabel(i)} depth={parentDepth + 1}
            sectionOptions={[]} onChange={updated => updateFuQ(i, updated)} onDelete={() => deleteFuQ(i)} />
        ))}
      </div>
      <button onClick={() => onUpdateParent({ ...parentQ, followUp: { ...fu!, questions: [...fu!.questions, newQuestion()] } })}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2 py-0.5">
        <Plus className="w-3 h-3" /> Add follow-up question
      </button>
    </div>
  )
}

interface SectionOption { value: string; label: string }

function SectionBadge({ label, depth, currentSectionId, sectionOptions, onMoveSection, readOnly }: {
  label: string; depth: number; currentSectionId?: string
  sectionOptions: SectionOption[]; onMoveSection?: (toId: string) => void; readOnly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const style = getSectionStyle(currentSectionId)
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (depth > 0) {
    return <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0 mt-0.5 leading-none select-none">{label}</span>
  }
  if (readOnly) {
    const style = getSectionStyle(currentSectionId)
    return <span className={`text-xs font-bold rounded px-1.5 py-0.5 leading-none shrink-0 mt-0.5 select-none ${style.headerBg} ${style.headerText}`}>{label}</span>
  }
  return (
    <div ref={ref} className="relative shrink-0 mt-0.5">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }} title="Click to move to a different section"
        className={`text-xs font-bold rounded px-1.5 py-0.5 leading-none transition-opacity hover:opacity-70 ${style.headerBg} ${style.headerText}`}>
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[230px]">
          {sectionOptions.map(s => {
            const ss = getSectionStyle(s.value)
            return (
              <button key={s.value} onClick={() => { onMoveSection?.(s.value); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-gray-50 ${s.value === currentSectionId ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                <span className={`w-3 h-3 rounded-sm shrink-0 ${ss.headerBg}`} />{s.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Drag state shared across sections ─────────────────────────────────────────

interface DragOver { uid: string; position: 'before' | 'after' }

interface SectionDragHandlers {
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

interface DragHandlers {
  onDragStart: (uid: string) => void
  onDragEnd: () => void
  onDragOver: (uid: string, e: React.DragEvent) => void
  onDrop: (uid: string) => void
  onSectionDrop: (e: React.DragEvent) => void
  dragOver: DragOver | null
}

// ── Delete confirmation popover ───────────────────────────────────────────────

function DeleteConfirm({ message = 'Delete?', onConfirm, className }: {
  message?: string; onConfirm: () => void; className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className={`relative shrink-0 ${className ?? ''}`} ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        title="Delete"
        className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-3 min-w-max">
          <p className="text-xs text-gray-600 mb-2.5">{message}</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={e => { e.stopPropagation(); setOpen(false) }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={e => { e.stopPropagation(); onConfirm(); setOpen(false) }}
              className="text-xs bg-red-500 text-white hover:bg-red-600 px-2 py-1 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Follow-up overview rows (Level 2 — indented, trigger editable) ───────────

type BFollowUp = NonNullable<BQuestion['followUp']>

function TypePicker({ type, onChange, readOnly }: { type: QuestionType; onChange: (t: QuestionType) => void; readOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const typeName = QUESTION_TYPES.find(t => t.value === type)?.label ?? type
  if (readOnly) return <span className="text-xs text-gray-400 px-1.5 py-0.5 shrink-0 select-none">{typeName}</span>

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        title="Change question type"
        className="text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors select-none"
      >
        {typeName}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-max">
          {QUESTION_TYPES.map(t => (
            <button
              key={t.value}
              onClick={e => { e.stopPropagation(); onChange(t.value); setOpen(false) }}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${t.value === type ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function triggerLabel(trigger: string | string[]): string {
  if (Array.isArray(trigger)) {
    if (trigger.length === 0) return '—'
    if (trigger.length === 1) return trigger[0]
    return `${trigger[0]} or ${trigger.length - 1} more`
  }
  return trigger || '—'
}

function TriggerPicker({ fu, triggerOptions, isMulti, onChangeTrigger, readOnly }: {
  fu: BFollowUp
  triggerOptions: string[]
  isMulti: boolean
  onChangeTrigger: (t: string | string[]) => void
  readOnly?: boolean
}) {
  if (readOnly) return <span className="text-xs italic text-gray-400 shrink-0">if {triggerLabel(fu.trigger)}</span>
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = Array.isArray(fu.trigger) ? fu.trigger : (fu.trigger ? [fu.trigger] : [])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (triggerOptions.length === 0) {
    return <span className="text-xs italic text-gray-300 shrink-0">if {triggerLabel(fu.trigger)}</span>
  }

  function toggleOption(opt: string) {
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected, opt]
    onChangeTrigger(next.length === 1 ? next[0] : next)
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-xs italic text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-1 py-0.5 rounded transition-colors"
        title="Change trigger"
      >
        if {triggerLabel(fu.trigger)}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-max">
          {triggerOptions.map(t => isMulti ? (
            <label key={t} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(t)}
                onChange={() => toggleOption(t)}
                onClick={e => e.stopPropagation()}
                className="rounded"
              />
              {t}
            </label>
          ) : (
            <button
              key={t}
              onClick={e => { e.stopPropagation(); onChangeTrigger(t); setOpen(false) }}
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${t === fu.trigger ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FollowUpOverview({ fu, parentLabel, depth, parentType, parentOptions, onChangeFu, readOnly }: {
  fu: BFollowUp; parentLabel: string; depth: number
  parentType: QuestionType; parentOptions: string[]
  onChangeFu: (updated: BFollowUp) => void
  readOnly?: boolean
}) {
  const triggerOptions = parentType === 'single_choice' || parentType === 'multi_choice'
    ? parentOptions : (TRIGGER_OPTIONS[parentType] ?? [])
  const [autoOpenOpts, setAutoOpenOpts] = useState<Record<number, boolean>>({})

  function moveQuestion(fromIdx: number, toIdx: number) {
    const qs = [...fu.questions]
    const [moved] = qs.splice(fromIdx, 1)
    qs.splice(toIdx, 0, moved)
    onChangeFu({ ...fu, questions: qs })
  }



  return (
    <>
      <TriggerPicker
        fu={fu}
        triggerOptions={triggerOptions}
        isMulti={parentType === 'multi_choice'}
        onChangeTrigger={t => onChangeFu({ ...fu, trigger: t })}
        readOnly={readOnly}
      />
      {fu.questions.map((fq, i) => {
        const label = depth === 0 ? `${parentLabel}${toRoman(i + 1)}` : `${parentLabel}-${i + 1}`
        return (
          <div key={fq.uid} className="group">
            <div className="flex items-center gap-1.5 py-0.5">
              {!readOnly && (
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); moveQuestion(i, i - 1) }}
                    disabled={i === 0}
                    className="text-gray-200 hover:text-gray-500 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); moveQuestion(i, i + 1) }}
                    disabled={i === fu.questions.length - 1}
                    className="text-gray-200 hover:text-gray-500 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              )}
              <CornerDownRight className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-xs font-bold text-gray-300 shrink-0">{label}</span>
              <AutoTextarea
                value={fq.text}
                onChange={text => {
                  const updatedQuestions = fu.questions.map((q, idx) => idx === i ? { ...q, text } : q)
                  onChangeFu({ ...fu, questions: updatedQuestions })
                }}
                readOnly={readOnly}
                placeholder="Follow-up question…"
                className="flex-1 text-xs text-gray-400 min-w-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-200 rounded px-1 -mx-1 cursor-text"
              />
              <TypePicker type={fq.type} onChange={t => {
                const updatedQuestions = fu.questions.map((q, idx) => idx === i ? { ...q, type: t } : q)
                onChangeFu({ ...fu, questions: updatedQuestions })
                if (t === 'single_choice' || t === 'multi_choice') setAutoOpenOpts(prev => ({ ...prev, [i]: true }))
              }} readOnly={readOnly} />
              {(fq.type === 'single_choice' || fq.type === 'multi_choice') && (
                <OptionsPopover
                  options={fq.options}
                  onChange={opts => {
                    const updatedQuestions = fu.questions.map((q, idx) => idx === i ? { ...q, options: opts } : q)
                    onChangeFu({ ...fu, questions: updatedQuestions })
                  }}
                  readOnly={readOnly}
                  autoOpen={autoOpenOpts[i]} onAutoOpened={() => setAutoOpenOpts(prev => ({ ...prev, [i]: false }))}
                />
              )}
              {!readOnly && (
                <DeleteConfirm
                  message="Delete this follow-up question?"
                  onConfirm={() => {
                    const qs = fu.questions.filter((_, idx) => idx !== i)
                    onChangeFu({ ...fu, questions: qs })
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </div>
            {fq.followUp && fq.followUp.questions.length > 0 && (
              <div className="pl-4">
                <FollowUpOverview
                  fu={fq.followUp}
                  parentLabel={label}
                  depth={depth + 1}
                  parentType={fq.type}
                  parentOptions={fq.options}
                  readOnly={readOnly}
                  onChangeFu={updatedNested => {
                    const updatedQuestions = fu.questions.map((q, idx) =>
                      idx === i ? { ...q, followUp: updatedNested.questions.length === 0 ? null : updatedNested } : q
                    )
                    onChangeFu({ ...fu, questions: updatedQuestions })
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
      {!readOnly && (
        <button
          onClick={() => onChangeFu({ ...fu, questions: [...fu.questions, newQuestion()] })}
          className="flex items-center gap-1 text-xs text-gray-300 hover:text-gray-500 transition-colors pt-1 pl-4"
        >
          <Plus className="w-3 h-3" /> {depth === 0 ? 'add follow-up' : 'add follow-up to follow-up'}
        </button>
      )}
    </>
  )
}

// ── Overview row (Level 2) ────────────────────────────────────────────────────

function QuestionOverviewRow({ q, label, currentSectionId, sectionOptions, onMoveSection, onChange, onDelete, readOnly, dragHandlers }: {
  q: BQuestion; label: string; currentSectionId?: string
  sectionOptions: SectionOption[]; onMoveSection?: (toId: string) => void
  onChange: (updated: BQuestion) => void; onDelete: () => void
  readOnly?: boolean; dragHandlers: DragHandlers
}) {
  const dragOver = !readOnly && dragHandlers.dragOver?.uid === q.uid ? dragHandlers.dragOver : null
  const [showFollowUps, setShowFollowUps] = useState(false)
  const [autoOpenOptions, setAutoOpenOptions] = useState(false)
  const hasFollowUps = !!(q.followUp && q.followUp.questions.length > 0)

  return (
    <div className="relative">
      {dragOver?.position === 'before' && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-blue-400 rounded pointer-events-none z-10" />
      )}
      <div
        draggable={!readOnly}
        className={`flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50 ${readOnly ? '' : 'cursor-grab active:cursor-grabbing select-none'}`}
        onDragStart={readOnly ? undefined : e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('question-drag', q.uid); dragHandlers.onDragStart(q.uid) }}
        onDragEnd={readOnly ? undefined : dragHandlers.onDragEnd}
        onDragOver={readOnly ? undefined : e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; dragHandlers.onDragOver(q.uid, e) }}
        onDrop={readOnly ? undefined : e => { e.preventDefault(); e.stopPropagation(); dragHandlers.onDrop(q.uid) }}
      >
        {!readOnly && <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />}

        <SectionBadge label={label} depth={0} currentSectionId={currentSectionId}
          sectionOptions={sectionOptions} onMoveSection={onMoveSection} readOnly={readOnly} />

        <AutoTextarea
          value={q.text}
          onChange={text => onChange({ ...q, text })}
          placeholder="Question text…"
          readOnly={readOnly}
          className="flex-1 text-sm text-gray-700 min-w-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-200 rounded px-1 -mx-1"
        />

        <TypePicker type={q.type} onChange={t => {
          onChange({ ...q, type: t })
          if (t === 'single_choice' || t === 'multi_choice') setAutoOpenOptions(true)
        }} readOnly={readOnly} />
        {(q.type === 'single_choice' || q.type === 'multi_choice') && (
          <OptionsPopover options={q.options} onChange={opts => onChange({ ...q, options: opts })} readOnly={readOnly}
            autoOpen={autoOpenOptions} onAutoOpened={() => setAutoOpenOptions(false)} />
        )}
        {!readOnly && <DeleteConfirm message="Delete this question?" onConfirm={onDelete} />}
      </div>

      {/* Follow-ups — collapsed by default, click to expand */}
      {hasFollowUps && (
        <div className="ml-10 mt-0.5">
          {showFollowUps ? (
            <div className="border-l-2 border-gray-100 pl-3 space-y-0.5 pb-0.5">
              <FollowUpOverview
                fu={q.followUp!}
                parentLabel={label}
                depth={0}
                parentType={q.type}
                parentOptions={q.options}
                readOnly={readOnly}
                onChangeFu={updatedFu => onChange({ ...q, followUp: updatedFu.questions.length === 0 ? null : updatedFu })}
              />
              <button
                onClick={() => setShowFollowUps(false)}
                className="text-xs text-gray-300 hover:text-gray-500 transition-colors pt-0.5"
              >
                Hide follow-ups
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowFollowUps(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors py-0.5"
            >
              <CornerDownRight className="w-3 h-3" />
              Follow-ups
            </button>
          )}
        </div>
      )}

      {!hasFollowUps && !readOnly && (
        <div className="ml-10 mt-0.5">
          <button
            onClick={() => {
              const triggerOpts = TRIGGER_OPTIONS[q.type]
              const defaultTrigger = triggerOpts.length > 0 ? triggerOpts[0] : (q.options[0] ?? '')
              onChange({ ...q, followUp: { trigger: defaultTrigger, questions: [newQuestion()] } })
              setShowFollowUps(true)
            }}
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors py-0.5"
          >
            + Follow-up
          </button>
        </div>
      )}

      {dragOver?.position === 'after' && (
        <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-400 rounded pointer-events-none z-10" />
      )}
    </div>
  )
}

// ── Expanded question row (Level 3) ───────────────────────────────────────────

interface QuestionRowProps {
  q: BQuestion; label: string; depth: number
  sectionOptions: SectionOption[]; currentSectionId?: string
  onChange: (q: BQuestion) => void; onDelete: () => void
  onMoveSection?: (toSectionId: string) => void
}

function QuestionRow({ q, label, depth, sectionOptions, currentSectionId, onChange, onDelete, onMoveSection }: QuestionRowProps) {
  const needsOptions = q.type === 'single_choice' || q.type === 'multi_choice'
  const triggers = needsOptions ? q.options : (TRIGGER_OPTIONS[q.type] ?? [])
  const canAddFollowUp = depth < 3 && triggers.length > 0
  const isTopLevel = depth === 0
  const cardClass = isTopLevel ? 'bg-white border border-gray-200 rounded-xl shadow-sm' : 'bg-white border border-gray-200 rounded-lg'

  function toggleFollowUp() {
    if (q.followUp) onChange({ ...q, followUp: null })
    else onChange({ ...q, followUp: { trigger: triggers[0] ?? 'Yes', questions: [newQuestion()] } })
  }

  return (
    <div className={cardClass}>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <SectionBadge label={label} depth={depth} currentSectionId={currentSectionId}
            sectionOptions={sectionOptions} onMoveSection={onMoveSection} />
          <AutoTextarea value={q.text} onChange={text => onChange({ ...q, text })}
            placeholder={isTopLevel ? 'Question text…' : 'Follow-up question…'}
            className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent" />
        </div>
        <div className="pl-8">
          <AnswerTypePreview q={q} onChange={onChange} />
        </div>
        {needsOptions && <div className="pl-8 mt-3"><OptionsStrip q={q} onChange={onChange} /></div>}
        <div className="flex items-center justify-end gap-1.5 flex-wrap pl-8 mt-3">
          {canAddFollowUp && (
            <button onClick={toggleFollowUp}
              className={`flex items-center gap-0.5 text-xs transition-colors ${q.followUp ? 'text-red-400 hover:text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
              title={q.followUp ? 'Remove follow-up' : 'Add follow-up questions'}>
              {q.followUp ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {q.followUp ? 'Remove follow-up' : 'Add follow-up'}
            </button>
          )}
          <button onClick={() => onChange({ ...q, flagged: !q.flagged })}
            title={q.flagged ? 'Flagged — click to clear' : 'Flag for review'}
            className={`p-1 rounded transition-colors ${q.flagged ? 'text-amber-500 hover:text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}>
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} title="Delete question"
            className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {q.followUp && (
        <div className="px-3 pb-3">
          <FollowUpBlock parentQ={q} parentLabel={label} parentDepth={depth} onUpdateParent={onChange} />
        </div>
      )}
    </div>
  )
}

// ── Section group ──────────────────────────────────────────────────────────────

function SectionGroup({ bs, sectionOptions, onChange, onMoveQuestion, onBeforeDelete, onDelete, readOnly, defaultExpanded, dragHandlers, sectionDrag }: {
  bs: BSection; sectionOptions: SectionOption[]
  onChange: (updated: BSection) => void
  onMoveQuestion: (questionUid: string, toSectionId: string) => void
  onBeforeDelete: () => void
  onDelete: () => void
  readOnly?: boolean
  defaultExpanded?: boolean
  dragHandlers: DragHandlers
  sectionDrag: SectionDragHandlers
}) {
  const style = getSectionStyle(bs.reportSectionId)
  const directCount = bs.questions.filter(q => q.text.trim()).length
  const subCount = bs.subsections.reduce((a, s) => a + s.questions.filter(q => q.text.trim()).length, 0)
  const questionCount = directCount + subCount
  const flaggedCount = [...bs.questions, ...bs.subsections.flatMap(s => s.questions)].filter(q => q.flagged).length

  const [collapsed, setCollapsed] = useState(!defaultExpanded)
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null)

  const labelMap = new Map<string, string>()
  let qIdx = 0
  for (const sub of bs.subsections) for (const q of sub.questions) labelMap.set(q.uid, `Q${++qIdx}`)
  for (const q of bs.questions) labelMap.set(q.uid, `Q${++qIdx}`)

  function updateQuestion(qUid: string, updated: BQuestion) {
    onChange({ ...bs, questions: updateQByUid(bs.questions, qUid, () => updated) })
  }
  function deleteQuestion(qUid: string) {
    onBeforeDelete(); onChange({ ...bs, questions: deleteQByUid(bs.questions, qUid) })
  }
  function updateSubsectionQuestion(si: number, qUid: string, updated: BQuestion) {
    onChange({ ...bs, subsections: bs.subsections.map((sub, i) =>
      i === si ? { ...sub, questions: updateQByUid(sub.questions, qUid, () => updated) } : sub) })
  }
  function deleteSubsectionQuestion(si: number, qUid: string) {
    onBeforeDelete(); onChange({ ...bs, subsections: bs.subsections.map((sub, i) =>
      i === si ? { ...sub, questions: deleteQByUid(sub.questions, qUid) } : sub) })
  }
  function updateSubsectionTitle(si: number, title: string) {
    onChange({ ...bs, subsections: bs.subsections.map((sub, i) => i === si ? { ...sub, title } : sub) })
  }
  function insertQuestion(atIndex: number) {
    const qs = [...bs.questions]
    qs.splice(atIndex, 0, newQuestion())
    onChange({ ...bs, questions: qs })
    if (collapsed) setCollapsed(false)
  }

  function insertSubsectionQuestion(si: number, atIndex: number) {
    onChange({ ...bs, subsections: bs.subsections.map((sub, i) => {
      if (i !== si) return sub
      const qs = [...sub.questions]
      qs.splice(atIndex, 0, newQuestion())
      return { ...sub, questions: qs }
    })})
    if (collapsed) setCollapsed(false)
  }

  function addQuestion() {
    onChange({ ...bs, questions: [...bs.questions, newQuestion()] })
    if (collapsed) setCollapsed(false)
  }

  function renderQ(q: BQuestion, onUpdate: (u: BQuestion) => void, onDel: () => void) {
    const label = labelMap.get(q.uid) ?? 'Q?'
    return (
      <QuestionOverviewRow key={q.uid} q={q} label={label}
        currentSectionId={bs.reportSectionId} sectionOptions={sectionOptions}
        onMoveSection={toId => onMoveQuestion(q.uid, toId)}
        onChange={onUpdate}
        onDelete={onDel}
        readOnly={readOnly}
        dragHandlers={dragHandlers} />
    )
  }

  const headerRounding = collapsed ? 'rounded-xl' : 'rounded-t-xl'

  return (
    <div className={`border shadow-sm rounded-xl ${style.outerBorder}`}>
      <div
        className={`flex items-center gap-2 px-4 py-3 ${style.headerBg} ${headerRounding}`}
        onDragOver={e => { if (e.dataTransfer.types.includes('section-drag')) { e.preventDefault(); sectionDrag.onDragOver(e) } }}
        onDrop={e => { if (e.dataTransfer.types.includes('section-drag')) sectionDrag.onDrop(e) }}
      >
        {/* Section drag handle */}
        {!readOnly && (
          <div
            draggable
            onDragStart={e => { e.stopPropagation(); sectionDrag.onDragStart(e) }}
            onDragEnd={e => { e.stopPropagation(); sectionDrag.onDragEnd() }}
            onClick={e => e.stopPropagation()}
            className={`cursor-grab active:cursor-grabbing shrink-0 opacity-40 hover:opacity-70 transition-opacity ${style.headerText}`}
            title="Drag to reorder section"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left select-none">
          <span className={`font-semibold text-sm flex-1 truncate ${style.headerText}`}>{bs.title}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {flaggedCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Flag className="w-3 h-3" />{flaggedCount}
              </span>
            )}
            {questionCount > 0 && (
              <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${style.badge}`}>
                {questionCount} {questionCount === 1 ? 'question' : 'questions'}
              </span>
            )}
          </div>
          {collapsed ? <ChevronRight className={`w-4 h-4 shrink-0 ${style.headerText}`} />
                     : <ChevronDown className={`w-4 h-4 shrink-0 ${style.headerText}`} />}
        </button>
        {!readOnly && <DeleteConfirm message="Delete this section and all its questions?" onConfirm={onDelete} />}
      </div>

      {!collapsed && (
        <div
          className={`${style.bodyBg} p-3 space-y-2 rounded-b-xl`}
          onDragOver={e => { if (e.dataTransfer.types.includes('question-drag')) e.preventDefault() }}
          onDrop={e => { if (e.dataTransfer.types.includes('question-drag')) dragHandlers.onSectionDrop(e) }}
        >
          {questionCount === 0 && (
            <p className="text-xs text-gray-400 italic text-center py-2">No questions yet — add one below</p>
          )}

          {bs.subsections.map((sub, si) => sub.questions.length === 0 ? null : (
            <div key={sub.uid}>
              <div className="flex items-center gap-2 py-1 px-1">
                <div className={`flex-1 h-px ${style.divider}`} />
                {!readOnly && editingSubIdx === si ? (
                  <input
                    autoFocus
                    value={sub.title}
                    onChange={e => updateSubsectionTitle(si, e.target.value)}
                    onBlur={() => setEditingSubIdx(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingSubIdx(null) }}
                    className={`text-xs font-medium bg-transparent border-b focus:outline-none text-center px-1 ${style.dividerText}`}
                    style={{ minWidth: '80px', width: `${Math.max((sub.title || '').length + 4, 16)}ch` }}
                  />
                ) : readOnly ? (
                  <span className={`text-xs font-medium px-2 shrink-0 ${style.dividerText}`}>
                    {sub.title || <span className="italic opacity-60">Untitled subsection</span>}
                  </span>
                ) : (
                  <button onClick={() => setEditingSubIdx(si)} title="Click to edit heading"
                    className={`text-xs font-medium px-2 shrink-0 ${style.dividerText} hover:opacity-70 cursor-text`}>
                    {sub.title || <span className="italic opacity-60">Untitled subsection</span>}
                  </button>
                )}
                <div className={`flex-1 h-px ${style.divider}`} />
              </div>
              <div className="space-y-2">
                {sub.questions.map((q, idx) => (
                  <div key={q.uid} className={!readOnly ? 'relative pt-2.5' : undefined}>
                    {!readOnly && (
                      <button
                        onClick={() => insertSubsectionQuestion(si, idx)}
                        title="Insert question here"
                        className="absolute top-2.5 -translate-y-1/2 right-10 z-10 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-400 hover:text-primary-500 hover:border-primary-400 transition-colors select-none"
                      >
                        +Q
                      </button>
                    )}
                    {renderQ(q,
                      updated => updateSubsectionQuestion(si, q.uid, updated),
                      () => deleteSubsectionQuestion(si, q.uid),
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {bs.questions.map((q, idx) => (
            <div key={q.uid} className={!readOnly ? 'relative pt-2.5' : undefined}>
              {!readOnly && (
                <button
                  onClick={() => insertQuestion(idx)}
                  title="Insert question here"
                  className="absolute top-2.5 -translate-y-1/2 right-10 z-10 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-400 hover:text-primary-500 hover:border-primary-400 transition-colors select-none"
                >
                  +Q
                </button>
              )}
              {renderQ(q, updated => updateQuestion(q.uid, updated), () => deleteQuestion(q.uid))}
            </div>
          ))}

          {!readOnly && (
            <button onClick={addQuestion}
              className={`flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium ${style.dividerText} hover:text-gray-700 hover:bg-white rounded-lg border border-dashed ${style.divider} transition-colors`}>
              <Plus className="w-3.5 h-3.5" /> Add question to this section
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function QuestionnaireTableEditor({ sections, onChange, onBeforeDelete, readOnly, defaultExpanded }: {
  sections: BSection[]; onChange: (sections: BSection[]) => void; onBeforeDelete: () => void; readOnly?: boolean; defaultExpanded?: boolean
}) {
  const dragRef = useRef<string | null>(null)
  const dropPositionRef = useRef<'before' | 'after'>('before')
  const dragOverRef = useRef<DragOver | null>(null)
  const [dragOver, setDragOver] = useState<DragOver | null>(null)

  const sectionDragRef = useRef<number | null>(null)
  const sectionDragOverRef = useRef<{ idx: number; position: 'before' | 'after' } | null>(null)
  const [sectionDragOver, setSectionDragOver] = useState<{ idx: number; position: 'before' | 'after' } | null>(null)

  const sectionOptions: SectionOption[] = REPORT_SECTIONS.map(rs => ({ value: rs.value, label: rs.label }))

  function updateSection(i: number, updated: BSection) {
    const next = [...sections]; next[i] = updated; onChange(next)
  }

  function deleteSection(i: number) {
    onChange(sections.filter((_, idx) => idx !== i))
  }

  function moveQuestionToSection(questionUid: string, toSectionId: string) {
    let moved: BQuestion | null = null
    const withRemoved = sections.map(s => {
      const idx = s.questions.findIndex(q => q.uid === questionUid)
      if (idx >= 0) { moved = s.questions[idx]; return { ...s, questions: s.questions.filter(q => q.uid !== questionUid) } }
      for (let si = 0; si < s.subsections.length; si++) {
        const subIdx = s.subsections[si].questions.findIndex(q => q.uid === questionUid)
        if (subIdx >= 0) {
          moved = s.subsections[si].questions[subIdx]
          return { ...s, subsections: s.subsections.map((sub, i) =>
            i === si ? { ...sub, questions: sub.questions.filter(q => q.uid !== questionUid) } : sub) }
        }
      }
      return s
    })
    if (!moved) return
    onChange(withRemoved.map(s => s.reportSectionId === toSectionId ? { ...s, questions: [...s.questions, moved!] } : s))
  }

  function moveQuestionRelative(fromUid: string, nearUid: string, position: 'before' | 'after') {
    let movedQ: BQuestion | null = null
    const withRemoved = sections.map(s => {
      const idx = s.questions.findIndex(q => q.uid === fromUid)
      if (idx >= 0) { movedQ = s.questions[idx]; return { ...s, questions: s.questions.filter(q => q.uid !== fromUid) } }
      for (let si = 0; si < s.subsections.length; si++) {
        const subIdx = s.subsections[si].questions.findIndex(q => q.uid === fromUid)
        if (subIdx >= 0) {
          movedQ = s.subsections[si].questions[subIdx]
          return { ...s, subsections: s.subsections.map((sub, i) =>
            i === si ? { ...sub, questions: sub.questions.filter(q => q.uid !== fromUid) } : sub) }
        }
      }
      return s
    })
    if (!movedQ) return
    onChange(withRemoved.map(s => {
      const idx = s.questions.findIndex(q => q.uid === nearUid)
      if (idx >= 0) {
        const qs = [...s.questions]
        qs.splice(position === 'before' ? idx : idx + 1, 0, movedQ!)
        return { ...s, questions: qs }
      }
      for (let si = 0; si < s.subsections.length; si++) {
        const subIdx = s.subsections[si].questions.findIndex(q => q.uid === nearUid)
        if (subIdx >= 0) {
          return { ...s, subsections: s.subsections.map((sub, i) => {
            if (i !== si) return sub
            const qs = [...sub.questions]
            qs.splice(position === 'before' ? subIdx : subIdx + 1, 0, movedQ!)
            return { ...sub, questions: qs }
          })}
        }
      }
      return s
    }))
  }

  const dragHandlers: DragHandlers = {
    onDragStart: (uid) => { dragRef.current = uid },
    onDragEnd: () => { dragRef.current = null; setDragOver(null) },
    onDragOver: (uid, e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
      dropPositionRef.current = position
      dragOverRef.current = { uid, position }
      setDragOver({ uid, position })
    },
    onDrop: (targetUid) => {
      const fromUid = dragRef.current
      const position = dropPositionRef.current
      dragRef.current = null; dragOverRef.current = null; setDragOver(null)
      if (!fromUid || fromUid === targetUid) return
      moveQuestionRelative(fromUid, targetUid, position)
    },
    onSectionDrop: (e) => {
      e.preventDefault()
      const fromUid = dragRef.current
      const near = dragOverRef.current
      dragRef.current = null; dragOverRef.current = null; setDragOver(null)
      if (!fromUid || !near || fromUid === near.uid) return
      moveQuestionRelative(fromUid, near.uid, near.position)
    },
    dragOver,
  }

  function reorderSection(fromIdx: number, nearIdx: number, position: 'before' | 'after') {
    if (fromIdx === nearIdx) return
    const next = [...sections]
    const [moved] = next.splice(fromIdx, 1)
    let insertAt = fromIdx < nearIdx ? nearIdx - 1 : nearIdx
    if (position === 'after') insertAt += 1
    next.splice(insertAt, 0, moved)
    onChange(next)
  }

  function makeSectionDrag(i: number): SectionDragHandlers {
    return {
      onDragStart: (e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('section-drag', String(i))
        sectionDragRef.current = i
      },
      onDragEnd: () => { sectionDragRef.current = null; sectionDragOverRef.current = null; setSectionDragOver(null) },
      onDragOver: (e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
        sectionDragOverRef.current = { idx: i, position }
        setSectionDragOver({ idx: i, position })
      },
      onDrop: (e) => {
        e.preventDefault()
        const fromIdx = sectionDragRef.current
        const near = sectionDragOverRef.current
        sectionDragRef.current = null; sectionDragOverRef.current = null; setSectionDragOver(null)
        if (fromIdx === null || !near || fromIdx === near.idx) return
        reorderSection(fromIdx, near.idx, near.position)
      },
    }
  }

  return (
    <div className="space-y-4">
      {sections.map((bs, i) => {
        const isOver = sectionDragOver?.idx === i
        return (
          <div key={bs.uid} className="relative">
            {isOver && sectionDragOver?.position === 'before' && (
              <div className="absolute -top-2 left-0 right-0 h-0.5 bg-blue-400 rounded pointer-events-none z-20" />
            )}
            <SectionGroup bs={bs} sectionOptions={sectionOptions}
              onChange={updated => updateSection(i, updated)}
              onMoveQuestion={(qUid, toId) => moveQuestionToSection(qUid, toId)}
              onBeforeDelete={onBeforeDelete}
              onDelete={() => deleteSection(i)}
              readOnly={readOnly}
              defaultExpanded={defaultExpanded && (bs.questions.length + bs.subsections.reduce((n, s) => n + s.questions.length, 0)) > 0}
              dragHandlers={dragHandlers}
              sectionDrag={makeSectionDrag(i)} />
            {isOver && sectionDragOver?.position === 'after' && (
              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-blue-400 rounded pointer-events-none z-20" />
            )}
          </div>
        )
      })}
    </div>
  )
}
