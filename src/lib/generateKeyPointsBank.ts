import { jsonrepair } from 'jsonrepair'
import type { ImportedQuestionnaire, Question, KPEntry } from '../types'

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

function extractJsonObject(raw: string): string {
  const stripped = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const first = stripped.indexOf('{')
  const last = stripped.lastIndexOf('}')
  if (first !== -1 && last > first) return stripped.slice(first, last + 1)
  return stripped
}

function flattenQuestions(
  questions: Question[],
): Array<{ id: string; text: string; type: string; options: string[] }> {
  const flat: Array<{ id: string; text: string; type: string; options: string[] }> = []
  for (const q of questions) {
    flat.push({ id: q.id, text: q.text, type: q.type, options: q.options ?? [] })
    if (q.followUps) {
      for (const fu of q.followUps) flat.push(...flattenQuestions(fu.questions))
    }
  }
  return flat
}

function fallbackEntry(q: { text: string; type: string; options: string[] }): KPEntry {
  const topic = q.text
    .replace(/\s*\[[^\]]+\]\s*$/, '')
    .replace(/\?+$/, '')
    .replace(/^(do|does|did|has|have|is|are|was|were|will|can|could|would|should)\s+you\s+/i, '')
    .slice(0, 60)
    .toLowerCase()
    .trim()
  if (q.type === 'free_text') return { topic, free_text_prefix: topic || 'Additional information' }
  if (q.type === 'single_choice') return { topic, single_prefix: topic || 'Response' }
  if (q.type === 'multi_choice') return { topic, multi_prefix: 'Reported', multi_none: 'Nothing reported.' }
  return {
    topic,
    yes: `${topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : 'This'} reported.`,
    no: `No ${topic || 'information'} reported.`,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 8

export async function generateKeyPointsBank(
  questionnaire: ImportedQuestionnaire,
): Promise<Record<string, KPEntry>> {
  const bank: Record<string, KPEntry> = {}

  // Build a flat lookup of all questions for fallback auto-fill
  const allQuestions = new Map<string, { text: string; type: string; options: string[] }>()
  for (const section of questionnaire.sections) {
    for (const q of flattenQuestions(section.questions ?? [])) {
      allQuestions.set(q.id, q)
    }
  }

  // Build batched jobs: one small batch per section, 8 questions at a time
  for (let si = 0; si < questionnaire.sections.length; si++) {
    const section = questionnaire.sections[si]
    const flat = flattenQuestions(section.questions ?? [])
    if (flat.length === 0) continue

    for (let start = 0; start < flat.length; start += BATCH_SIZE) {
      const batch = flat.slice(start, start + BATCH_SIZE)
      try {
        const res = await fetch('/api/keypointsbank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sections: [{ id: String(si + 1), title: section.title, questions: batch }],
          }),
        })

        if (!res.ok || !res.body) {
          console.warn(`[KPB] HTTP ${res.status} for section "${section.title}"`)
          continue
        }

        const raw = await streamToString(res.body)
        let data: { keyPointsBank?: Record<string, KPEntry> }
        try { data = JSON.parse(extractJsonObject(raw)) }
        catch { try { data = JSON.parse(jsonrepair(extractJsonObject(raw))) } catch { data = {} } }

        if (data.keyPointsBank) Object.assign(bank, data.keyPointsBank)
      } catch (e) {
        console.warn(`[KPB] Batch failed for "${section.title}":`, e)
      }
    }
  }

  // Auto-fill any questions the AI didn't return entries for
  for (const [id, q] of allQuestions) {
    if (!bank[id]) bank[id] = fallbackEntry(q)
  }

  return bank
}
