import type { Question, Section, Subsection, Responses } from '../types'

function isAnswered(value: string | string[] | boolean | undefined): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'boolean') return true
  return false
}

function isHeaderQuestion(question: Question): boolean {
  return question.note === 'SECTION_HEADER' || question.note === 'SECTION_HEADER_VDQ'
}

function getActiveFollowUpQuestions(question: Question, responses: Responses): Question[] {
  if (!question.followUps) return []
  const answer = responses[question.id]
  const result: Question[] = []

  for (const followUp of question.followUps) {
    const condition = followUp.condition
    let triggered = false

    if (typeof answer === 'string') {
      if (Array.isArray(condition)) {
        triggered = condition.includes(answer)
      } else {
        triggered = answer === condition
      }
    } else if (Array.isArray(answer)) {
      if (Array.isArray(condition)) {
        triggered = condition.some(c => (answer as string[]).includes(c))
      } else {
        triggered = (answer as string[]).includes(condition)
      }
    }

    if (triggered) {
      result.push(...followUp.questions)
    }
  }

  return result
}

interface QuestionStats {
  total: number
  answered: number
}

function countQuestionsRecursive(question: Question, responses: Responses): QuestionStats {
  if (isHeaderQuestion(question)) return { total: 0, answered: 0 }

  const total = 1
  const answered = isAnswered(responses[question.id]) ? 1 : 0

  let subTotal = 0
  let subAnswered = 0

  const activeFollowUps = getActiveFollowUpQuestions(question, responses)
  for (const followUp of activeFollowUps) {
    const sub = countQuestionsRecursive(followUp, responses)
    subTotal += sub.total
    subAnswered += sub.answered
  }

  return { total: total + subTotal, answered: answered + subAnswered }
}

function countQuestionsInList(questions: Question[], responses: Responses): QuestionStats {
  let total = 0
  let answered = 0

  for (const q of questions) {
    const stats = countQuestionsRecursive(q, responses)
    total += stats.total
    answered += stats.answered
  }

  return { total, answered }
}

export function getSubsectionProgress(subsection: Subsection, responses: Responses): number {
  const stats = countQuestionsInList(subsection.questions, responses)
  if (stats.total === 0) return 100
  return Math.round((stats.answered / stats.total) * 100)
}

export function getSectionProgress(section: Section, responses: Responses): number {
  let total = 0
  let answered = 0

  if (section.questions) {
    const stats = countQuestionsInList(section.questions, responses)
    total += stats.total
    answered += stats.answered
  }

  if (section.subsections) {
    for (const subsection of section.subsections) {
      const stats = countQuestionsInList(subsection.questions, responses)
      total += stats.total
      answered += stats.answered
    }
  }

  if (total === 0) return 100
  return Math.round((answered / total) * 100)
}


export function getIncompleteSections(sections: Section[], responses: Responses): string[] {
  return sections
    .filter(s => getSectionProgress(s, responses) < 100)
    .map(s => s.title)
}
