import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
} from 'docx'
import type { Questionnaire, Responses, Question, Section, Subsection } from '../types'

// ── Palette ───────────────────────────────────────────────────────────────────
const C_DARK = '1B3A5C'
const C_MID  = '2E75B6'
const C_BODY = '111111'
const C_GREY = '666666'

// ── Size constants (half-points) ──────────────────────────────────────────────
const SZ_TITLE = 56  // 28pt
const SZ_H1    = 28  // 14pt
const SZ_BODY  = 22  // 11pt
const SZ_SMALL = 20  // 10pt

const IND = 360

const BASE_DOC_STYLES = {
  default: {
    document: {
      run: { font: 'Arial', size: SZ_BODY },
    },
  },
}

// ── Structural helpers ────────────────────────────────────────────────────────

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: C_DARK, size: SZ_H1, font: 'Arial' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C_DARK, space: 4 } },
    spacing: { before: 560, after: 200 },
  })
}

function bodyParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: SZ_BODY, color: C_BODY, font: 'Arial' })],
    spacing: { before: 80, after: 80 },
  })
}

function greyNote(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: C_GREY, size: SZ_SMALL, font: 'Arial' })],
    spacing: { before: 60, after: 120 },
  })
}

function coverTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: C_DARK, size: SZ_TITLE, font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 240 },
  })
}

function coverSubtitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, color: C_MID, size: SZ_H1, font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  })
}

function divider(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '', font: 'Arial' })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
    spacing: { before: 80, after: 80 },
  })
}

async function saveDocx(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Report sections (fixed order) ────────────────────────────────────────────

const REPORT_SECTION_LABELS: Record<string, string> = {
  'bg-health':      'Health & Developmental History',
  'bg-family':      'Family History',
  'bg-linguistic':  'Linguistic History',
  'bg-educational': 'Educational History',
  'bg-current':     'Current Situation',
  'bg-further':     'Further Information',
}

const REPORT_SECTION_ORDER = ['bg-health', 'bg-family', 'bg-linguistic', 'bg-educational', 'bg-current', 'bg-further']

// ── Raw Q&A helpers ───────────────────────────────────────────────────────────

function formatAnswer(value: string | string[] | boolean | undefined): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  const norm: Record<string, string> = {
    yes: 'Yes', no: 'No', not_sure: 'Not sure', prefer_not_to_say: 'Prefer not to say',
  }
  return norm[String(value)] ?? String(value)
}

function isAnswered(value: string | string[] | boolean | undefined): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'boolean') return true
  return false
}

function getActiveFollowUps(question: Question, responses: Responses) {
  if (!question.followUps) return []
  const answer = responses[question.id]
  return question.followUps.filter(fu => {
    const condition = fu.condition
    if (typeof answer === 'string') {
      return Array.isArray(condition) ? condition.includes(answer) : answer === condition
    }
    if (Array.isArray(answer)) {
      return Array.isArray(condition) ? condition.some(c => answer.includes(c)) : answer.includes(condition)
    }
    return false
  })
}

function buildRQParagraphs(question: Question, responses: Responses, depth: number): Paragraph[] {
  if (question.note === 'SECTION_HEADER' || question.note === 'SECTION_HEADER_VDQ') return []
  const answer = responses[question.id]
  if (!isAnswered(answer)) return []

  const ind = depth > 0 ? { left: depth * IND } : undefined
  const paras: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: question.text, bold: true, size: SZ_BODY, color: C_BODY, font: 'Arial' })],
      indent: ind,
      spacing: { before: 160, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: formatAnswer(answer), size: SZ_BODY, color: C_BODY, font: 'Arial' })],
      indent: ind,
      spacing: { before: 0, after: 100 },
    }),
  ]

  for (const fu of getActiveFollowUps(question, responses)) {
    for (const fq of fu.questions) {
      paras.push(...buildRQParagraphs(fq, responses, depth + 1))
    }
  }
  return paras
}

function buildRSubsectionParagraphs(sub: Subsection, responses: Responses): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      style: 'Heading2',
      children: [new TextRun({ text: sub.title, font: 'Arial' })],
    }),
  ]
  for (const q of sub.questions) paras.push(...buildRQParagraphs(q, responses, 0))
  return paras
}

function buildRSectionParagraphs(section: Section, responses: Responses): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      style: 'Heading1',
      children: [new TextRun({ text: section.title, font: 'Arial' })],
    }),
  ]
  if (section.questions) {
    for (const q of section.questions) paras.push(...buildRQParagraphs(q, responses, 0))
  }
  if (section.subsections) {
    for (const sub of section.subsections) paras.push(...buildRSubsectionParagraphs(sub, responses))
  }
  return paras
}

// ── Key Notes helpers ─────────────────────────────────────────────────────────

function buildKeyNotesParagraphs(keyNotes: Record<string, string>): Paragraph[] {
  const paras: Paragraph[] = []
  const hasAny = REPORT_SECTION_ORDER.some(id => keyNotes[id]?.trim())
  if (!hasAny) {
    paras.push(greyNote('No key notes generated yet.'))
    return paras
  }
  for (const sectionId of REPORT_SECTION_ORDER) {
    const prose = keyNotes[sectionId]?.trim()
    if (!prose) continue
    paras.push(
      new Paragraph({
        style: 'Heading2',
        children: [new TextRun({ text: REPORT_SECTION_LABELS[sectionId] ?? sectionId, font: 'Arial' })],
      })
    )
    for (const sentence of prose.split('\n').map(s => s.trim().replace(/—/g, '-')).filter(Boolean)) {
      paras.push(bodyParagraph(sentence))
    }
  }
  return paras
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function downloadExpressDoc(
  learnerName: string,
  questionnaire: Questionnaire,
  responses: Responses,
  keyNotes: Record<string, string>,
): Promise<void> {
  const paras: Paragraph[] = []

  paras.push(coverTitle('BGInfo Express'))
  paras.push(coverSubtitle(learnerName))
  paras.push(divider())

  paras.push(sectionHeading('Background Information - Key Notes'))
  paras.push(...buildKeyNotesParagraphs(keyNotes))

  paras.push(sectionHeading('Questionnaire Responses'))
  for (const section of questionnaire.sections) {
    paras.push(...buildRSectionParagraphs(section, responses))
  }

  const doc = new Document({ styles: BASE_DOC_STYLES, sections: [{ children: paras }] })
  const safeName = learnerName.replace(/[^a-z0-9 ]/gi, '').trim() || 'learner'
  await saveDocx(doc, `BGInfo Express - ${safeName}.docx`)
}

export async function downloadKeyNotesDoc(
  learnerName: string,
  keyNotes: Record<string, string>,
): Promise<void> {
  const paras: Paragraph[] = []

  paras.push(coverTitle('BGInfo Express'))
  paras.push(coverSubtitle(learnerName))
  paras.push(divider())
  paras.push(sectionHeading('Background Information - Key Notes'))
  paras.push(...buildKeyNotesParagraphs(keyNotes))

  const doc = new Document({ styles: BASE_DOC_STYLES, sections: [{ children: paras }] })
  const safeName = learnerName.replace(/[^a-z0-9 ]/gi, '').trim() || 'learner'
  await saveDocx(doc, `BGInfo Express - ${safeName} - Key Notes.docx`)
}

export async function downloadResponsesDoc(
  learnerName: string,
  variant: 'background' | 'visual',
  questionnaire: Questionnaire,
  responses: Responses,
): Promise<void> {
  const label = variant === 'visual' ? 'Visual Questionnaire' : 'Background Questionnaire'
  const paras: Paragraph[] = [
    coverTitle('BGInfo Express'),
    coverSubtitle(`${learnerName} - ${label}`),
    divider(),
    sectionHeading('Questionnaire Responses'),
  ]
  for (const section of questionnaire.sections) {
    paras.push(...buildRSectionParagraphs(section, responses))
  }
  const doc = new Document({ styles: BASE_DOC_STYLES, sections: [{ children: paras }] })
  const safeName = learnerName.replace(/[^a-z0-9 ]/gi, '').trim() || 'learner'
  const safeVariant = variant === 'visual' ? 'Visual' : 'Background'
  await saveDocx(doc, `BGInfo Express - ${safeName} - ${safeVariant}.docx`)
}

// ── Learner draft export (used by AccessibilityToolbar Save button) ───────────

export async function exportLearnerDraft(questionnaire: Questionnaire, responses: Responses): Promise<void> {
  const paras: Paragraph[] = [
    coverTitle('BGInfo Express - Draft'),
    divider(),
    sectionHeading('Your Responses So Far'),
  ]
  for (const section of questionnaire.sections) {
    paras.push(...buildRSectionParagraphs(section, responses))
  }
  const doc = new Document({ styles: BASE_DOC_STYLES, sections: [{ children: paras }] })
  await saveDocx(doc, 'BGInfo Express - draft.docx')
}
