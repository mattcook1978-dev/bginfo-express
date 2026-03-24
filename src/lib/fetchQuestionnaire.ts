/// <reference types="vite/client" />
import type { ImportedQuestionnaire } from '../types'

/** Fetch a published questionnaire by ID from Netlify Blobs (used by learner returning user) */
export async function fetchImportedQuestionnaire(id: string): Promise<ImportedQuestionnaire | null> {
  try {
    const res = await fetch(`/api/questionnaire?id=${encodeURIComponent(id)}`)
    if (!res.ok) return null
    return await res.json() as ImportedQuestionnaire
  } catch {
    return null
  }
}

/** Fetch a published questionnaire by code hash (used by new learner on first code entry) */
export async function fetchQuestionnaireByCodeHash(codeHash: string): Promise<ImportedQuestionnaire | null> {
  try {
    const res = await fetch(`/api/questionnaire?hash=${encodeURIComponent(codeHash)}`)
    if (!res.ok) return null
    return await res.json() as ImportedQuestionnaire
  } catch {
    return null
  }
}

/** Publish a questionnaire to Netlify Blobs (used by assessor app) */
export async function publishQuestionnaire(q: ImportedQuestionnaire): Promise<boolean> {
  const secret = import.meta.env.VITE_BGINFO_PUBLISH_SECRET as string | undefined
  if (!secret) {
    console.warn('VITE_BGINFO_PUBLISH_SECRET not set — cannot publish questionnaire')
    return false
  }
  try {
    const res = await fetch('/api/questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bginfo-secret': secret,
      },
      body: JSON.stringify(q),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Publish a code-hash → questionnaire-id mapping (called when assessor creates a learner with a custom questionnaire) */
export async function publishCodeMapping(codeHash: string, questionnaireId: string): Promise<boolean> {
  const secret = import.meta.env.VITE_BGINFO_PUBLISH_SECRET as string | undefined
  if (!secret) {
    console.warn('VITE_BGINFO_PUBLISH_SECRET not set — cannot publish code mapping')
    return false
  }
  try {
    const res = await fetch('/api/questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bginfo-secret': secret,
      },
      body: JSON.stringify({ type: 'mapping', hash: codeHash, questionnaireId }),
    })
    return res.ok
  } catch {
    return false
  }
}
