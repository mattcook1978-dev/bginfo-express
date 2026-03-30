import { useState, useRef } from 'react'
import { ArrowLeft, Upload, AlertCircle, Loader, ChevronRight, RotateCcw } from 'lucide-react'
import { jsonrepair } from 'jsonrepair'
import type { QuestionType } from '../../types'
import type { BSection, BQuestion } from './QuestionnaireBuilder'

// ── Internal types ────────────────────────────────────────────────────────────

interface MappedFollowUp {
  condition: string
  questions: MappedQuestion[]
}

interface MappedQuestion {
  uid: string
  text: string
  followUps: MappedFollowUp[]
}

interface MappedSection {
  headingId: string
  heading: string
  questions: MappedQuestion[]
}

type Stage = 'input' | 'analysing' | 'error'

const CHAR_WARNING = 30_000
const VALID_TYPES = new Set(['yes_no','yes_no_notsure','yes_no_prefernot','yes_no_notsure_prefernot','single_choice','multi_choice','free_text'])

// ── Helpers ───────────────────────────────────────────────────────────────────

async function streamToString(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  return result
}

function extractJsonArray(raw: string): string {
  const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const first = stripped.indexOf('[')
  const last = stripped.lastIndexOf(']')
  if (first !== -1 && last > first) return stripped.slice(first, last + 1)
  return stripped
}

function sanitiseForApi(raw: string): string {
  return raw
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
    .replace(/[\u2014\u2013\u2015]/g, '-')
    .replace(/\uFB00/g, 'ff').replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi').replace(/\uFB04/g, 'ffl')
    .replace(/[_.]{3,}/g, ' ').replace(/-{3,}/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\t/g, ' ').replace(/ {2,}/g, ' ')
    .replace(/ +$/gm, '').replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── HTML table extraction ─────────────────────────────────────────────────────

const RATING_WORDS_LC = new Set([
  'often', 'sometimes', 'never', 'always', 'usually', 'rarely',
  'frequently', 'occasionally', 'seldom', 'regularly',
  'strongly agree', 'agree', 'disagree', 'strongly disagree',
  'not at all', 'a little', 'quite a bit', 'very much',
])

function tableToStructured(table: Element): string {
  const rows: string[][] = []
  for (const tr of table.querySelectorAll('tr')) {
    const cells: string[] = []
    for (const cell of tr.querySelectorAll('td, th')) {
      cells.push((cell.textContent ?? '').replace(/\s+/g, ' ').trim())
    }
    if (cells.some(c => c)) rows.push(cells)
  }
  if (rows.length < 2) return rows.map(r => r.filter(c => c).join(' ')).join('\n')

  const headerOptions = rows[0].slice(1).filter(c => c)
  const isRatingTable = headerOptions.length >= 2 &&
    headerOptions.every(c => RATING_WORDS_LC.has(c.toLowerCase()))

  if (isRatingTable) {
    const annotation = `[${headerOptions.join('/')}]`
    const lines: string[] = [`[RATING TABLE: ${headerOptions.join(' | ')}]`]
    for (const row of rows.slice(1)) {
      const text = row[0]?.trim()
      if (text) lines.push(`${text} ${annotation}`)
    }
    lines.push('[END TABLE]')
    return lines.join('\n')
  }

  return rows.map(r => r.filter(c => c).join(' | ')).join('\n')
}

function htmlToStructuredText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const parts: string[] = []

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.replace(/\s+/g, ' ') ?? ''
      if (t.trim()) parts.push(t)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const tag = el.tagName.toUpperCase()
    if (tag === 'STYLE' || tag === 'SCRIPT') return
    if (tag === 'TABLE') { parts.push('\n' + tableToStructured(el) + '\n'); return }
    for (const child of el.childNodes) walk(child)
    if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BR'].includes(tag)) parts.push('\n')
  }

  walk(doc.body)
  return parts.join('').replace(/ +\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

// Parse flat question strings (with "If [condition]: ..." follow-up detection)
function parseFlatQuestions(raw: unknown[]): MappedQuestion[] {
  const results: MappedQuestion[] = []
  let currentParent: MappedQuestion | null = null
  for (const item of raw) {
    const text = String(item ?? '').trim()
    if (!text) continue
    const followUpMatch = text.match(/^[Ii]f\s+([^:]+):\s*(.+)$/s)
    if (followUpMatch) {
      const condition = followUpMatch[1].trim().toLowerCase()
      const questionText = followUpMatch[2].trim()
      const followUpQ: MappedQuestion = { uid: crypto.randomUUID(), text: questionText, followUps: [] }
      if (currentParent) {
        let fuGroup = currentParent.followUps.find(f => f.condition === condition)
        if (!fuGroup) { fuGroup = { condition, questions: [] }; currentParent.followUps.push(fuGroup) }
        fuGroup.questions.push(followUpQ)
      } else {
        results.push(followUpQ)
        currentParent = followUpQ
      }
    } else {
      const q: MappedQuestion = { uid: crypto.randomUUID(), text, followUps: [] }
      results.push(q)
      currentParent = q
    }
  }
  return results
}

// Flatten MappedQuestion tree to {uid, text} pairs for the detect-types call
function flattenForClassify(questions: MappedQuestion[]): Array<{ uid: string; text: string }> {
  const flat: Array<{ uid: string; text: string }> = []
  for (const q of questions) {
    flat.push({ uid: q.uid, text: q.text })
    for (const fu of q.followUps) flat.push(...flattenForClassify(fu.questions))
  }
  return flat
}

// Heuristic fallback type when AI classification is missing
function heuristicType(text: string): { type: QuestionType; options: string[] } {
  const annotationMatch = text.match(/\[([A-Za-z][^\]]*\/[^\]]+)\]\s*$/)
  if (annotationMatch) {
    const opts = annotationMatch[1].split('/').map(s => s.trim()).filter(Boolean)
    if (opts.length >= 2) return { type: 'single_choice', options: opts }
  }
  if (/\b(describe|explain|tell us|please note|in your own words|provide details|write|list)\b/i.test(text)) {
    return { type: 'free_text', options: [] }
  }
  return { type: 'yes_no', options: [] }
}

function safeType(t: string): QuestionType {
  return VALID_TYPES.has(t) ? (t as QuestionType) : 'yes_no'
}

// Convert MappedSection[] + classify map → BSection[] for the builder
function toBSections(
  sections: MappedSection[],
  classMap: Map<string, { type: string; options: string[] }>,
): BSection[] {
  function toQ(mq: MappedQuestion): BQuestion {
    const classified = classMap.get(mq.uid)
    const fallback = heuristicType(mq.text)
    return {
      uid: mq.uid,
      text: mq.text.replace(/\s*\[[A-Za-z][^\]]*\/[^\]]+\]\s*$/, '').trim(),
      type: classified ? safeType(classified.type) : fallback.type,
      options: classified?.options ?? fallback.options,
      // Only the first follow-up condition group is wired up; additional groups
      // (e.g. both "if yes" and "if no" chains) can be added manually in the builder.
      followUp: mq.followUps.length > 0
        ? { trigger: mq.followUps[0].condition, questions: mq.followUps[0].questions.map(toQ) }
        : null,
    }
  }
  return sections.map(s => ({
    uid: crypto.randomUUID(),
    title: s.heading,
    questions: s.questions.map(toQ),
    reportSectionId: s.headingId,
  }))
}

// ── File readers ──────────────────────────────────────────────────────────────

async function readDocxFile(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return htmlToStructuredText(result.value)
}

async function readPdfFile(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => ('str' in item ? (item.str as string) : '')).join(' ')
    pages.push(pageText)
  }
  return pages.join('\n\n')
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
  onReadyForBuilder: (sections: BSection[]) => void
}

export default function QuestionnaireImport({ onBack, onReadyForBuilder }: Props) {
  const [stage, setStage] = useState<Stage>('input')
  const [rawText, setRawText] = useState('')
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // ── File handling ───────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setError('')
    try {
      let text = ''
      if (file.name.endsWith('.docx')) {
        text = await readDocxFile(file)
      } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
        text = await readPdfFile(file)
      } else {
        text = await file.text()
      }
      setRawText(text)
    } catch (err) {
      console.error('File read error:', err)
      setError('Could not read this file. Please try copying and pasting the text instead.')
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html')
    if (html && html.toLowerCase().includes('<table')) {
      e.preventDefault()
      const structured = htmlToStructuredText(html)
      setRawText(prev => prev ? `${prev}\n\n${structured}` : structured)
    }
  }

  // ── Analyse: Call 1 (map-sections) + Calls 2-N (detect-types per section) ──

  const handleAnalyse = async () => {
    if (!rawText.trim()) { setError('Please paste or upload questionnaire text first.'); return }
    setStage('analysing')
    setError('')

    const sanitised = sanitiseForApi(rawText)

    // ── Call 1: map sections and questions ────────────────────────────────────
    setLoadingStatus('Analysing questionnaire structure…')
    let mappedSections: MappedSection[] = []

    try {
      const res = await fetch('/api/map-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sanitised }),
      })

      if (!res.ok || !res.body) {
        const bodyText = await res.text().catch(() => '')
        let errMsg = `Analysis failed (${res.status}) — please try again.`
        try { errMsg = (JSON.parse(bodyText) as { error?: string }).error ?? errMsg } catch { /* ignore */ }
        setError(errMsg)
        setStage('error')
        return
      }

      const raw = await streamToString(res.body)
      let data: unknown
      try { data = JSON.parse(extractJsonArray(raw)) }
      catch { try { data = JSON.parse(jsonrepair(extractJsonArray(raw))) } catch { data = null } }

      if (!Array.isArray(data) || data.length === 0) {
        setError('No questions were found. Please check the text and try again.')
        setStage('error')
        return
      }

      mappedSections = (data as any[]).map(s => ({
        headingId: String(s.headingId ?? 'section'),
        heading: String(s.heading ?? 'Section'),
        questions: parseFlatQuestions(Array.isArray(s.questions) ? s.questions : []),
      }))
    } catch {
      setError('Could not reach the analysis service. Check your internet connection and try again.')
      setStage('error')
      return
    }

    // ── Calls 2-N: detect types, one call per section ─────────────────────────
    const classMap = new Map<string, { type: string; options: string[] }>()
    const nonEmpty = mappedSections.filter(s => s.questions.length > 0)

    for (let i = 0; i < nonEmpty.length; i++) {
      const section = nonEmpty[i]
      setLoadingStatus(`Determining question types — section ${i + 1} of ${nonEmpty.length}…`)

      const toClassify = flattenForClassify(section.questions)
      const BATCH = 30

      for (let start = 0; start < toClassify.length; start += BATCH) {
        const batch = toClassify.slice(start, start + BATCH)
        try {
          const res = await fetch('/api/detect-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: batch }),
          })

          if (!res.ok || !res.body) { console.warn(`detect-types: HTTP ${res.status} for "${section.heading}"`); continue }

          const raw = await streamToString(res.body)
          let results: Array<{ uid: string; type: string; options?: string[] }>
          try { results = JSON.parse(extractJsonArray(raw)) }
          catch { try { results = JSON.parse(jsonrepair(extractJsonArray(raw))) } catch { results = [] } }

          for (const r of results) {
            if (r.uid) classMap.set(r.uid, { type: r.type ?? 'yes_no', options: r.options ?? [] })
          }
        } catch (e) {
          console.warn(`detect-types: batch failed for "${section.heading}":`, e)
        }
      }
    }

    // ── Convert to BSection[] and hand off to builder ─────────────────────────
    const bSections = toBSections(nonEmpty, classMap)
    onReadyForBuilder(bSections)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const charCount = rawText.length
  const charOverLimit = charCount > CHAR_WARNING

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-t-4 border-yellow-400 border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Import Custom Questionnaire</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">

        {/* ── Input ─────────────────────────────────────────────────────────── */}
        {stage === 'input' && (
          <div className="max-w-2xl space-y-5">
            <p className="text-sm text-gray-600 leading-relaxed">
              Upload or paste your blank questionnaire below. <strong>Please do not use a completed version or include any personal data.</strong>
              <br /><br />
              QUsable will identify sections, questions, and types - then open everything in the builder for you to review and edit before saving.
            </p>

            {/* File upload */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-900 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-5 h-5 text-gray-500 shrink-0" />
              <div>
                <p className="text-sm text-gray-700">Upload a file or drag and drop here</p>
                <p className="text-xs text-gray-400 mt-0.5">Supported: .pdf, .docx, .txt</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".txt,.pdf,.docx" className="hidden" onChange={handleFileInputChange} />

            {/* Paste area */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Or paste text here</label>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste your questionnaire text here…"
                rows={14}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 resize-none"
              />
              <p className={`text-xs ${charOverLimit ? 'text-amber-600' : 'text-gray-400'}`}>
                {charCount.toLocaleString()} characters
                {charOverLimit && ' — this document is quite long. If analysis fails, try splitting it into sections and importing separately.'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleAnalyse}
              disabled={!rawText.trim()}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              Analyse questionnaire
            </button>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {stage === 'analysing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <Loader className="w-8 h-8 text-gray-600 animate-spin" />
            <p className="text-gray-600 text-sm text-center max-w-xs">{loadingStatus}</p>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {stage === 'error' && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 mb-1">Something went wrong</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
            <button
              onClick={() => { setStage('input'); setError('') }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Start over
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
