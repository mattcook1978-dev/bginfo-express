import { openDB, type IDBPDatabase } from 'idb'
import type { LearnerSession, ExpressLearnerRecord, ImportedQuestionnaire, AssessorPreferences } from '../types'

const DB_NAME = 'bginfo-express'
const DB_VERSION = 2

interface ExpressDB {
  sessions: {
    key: string
    value: LearnerSession
  }
  assessor: {
    key: string
    value: ExpressLearnerRecord
  }
  importedQuestionnaires: {
    key: string
    value: ImportedQuestionnaire
  }
  sessionKeys: {
    key: string
    value: { codeHash: string; cryptoKey: CryptoKey }
  }
  preferences: {
    key: string
    value: { key: string } & AssessorPreferences
  }
}

let dbPromise: Promise<IDBPDatabase<ExpressDB>> | null = null

function getDB(): Promise<IDBPDatabase<ExpressDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ExpressDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('sessions', { keyPath: 'codeHash' })
          db.createObjectStore('assessor', { keyPath: 'id' })
          db.createObjectStore('importedQuestionnaires', { keyPath: 'id' })
          db.createObjectStore('sessionKeys', { keyPath: 'codeHash' })
        }
        if (oldVersion < 2) {
          db.createObjectStore('preferences', { keyPath: 'key' })
        }
      },
      blocked() {
        console.warn('BGInfo Express DB upgrade blocked by another tab')
      },
      blocking() {
        window.location.reload()
      },
    })
  }
  return dbPromise
}

// ── Learner session storage ───────────────────────────────────────────────────

export async function saveSession(session: LearnerSession): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

export async function loadSession(codeHash: string): Promise<LearnerSession | undefined> {
  const db = await getDB()
  return db.get('sessions', codeHash)
}

export async function saveSessionKey(codeHash: string, cryptoKey: CryptoKey): Promise<void> {
  const db = await getDB()
  await db.put('sessionKeys', { codeHash, cryptoKey })
}

export async function loadAllSessionKeys(): Promise<Array<{ codeHash: string; cryptoKey: CryptoKey }>> {
  const db = await getDB()
  return db.getAll('sessionKeys')
}

export async function deleteSessionKey(codeHash: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessionKeys', codeHash)
}

// ── Assessor record storage ───────────────────────────────────────────────────

export async function saveAssessorRecord(record: ExpressLearnerRecord): Promise<void> {
  const db = await getDB()
  await db.put('assessor', record)
}

export async function loadAllAssessorRecords(): Promise<ExpressLearnerRecord[]> {
  const db = await getDB()
  return db.getAll('assessor')
}

export async function updateAssessorRecord(id: string, updates: Partial<ExpressLearnerRecord>): Promise<void> {
  const db = await getDB()
  const existing = await db.get('assessor', id)
  if (!existing) throw new Error(`Record ${id} not found`)
  await db.put('assessor', { ...existing, ...updates })
}

export async function deleteAssessorRecord(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('assessor', id)
}

// ── Imported questionnaire storage ───────────────────────────────────────────

export async function saveImportedQuestionnaire(q: ImportedQuestionnaire): Promise<void> {
  const db = await getDB()
  await db.put('importedQuestionnaires', q)
}

export async function loadImportedQuestionnaire(id: string): Promise<ImportedQuestionnaire | undefined> {
  const db = await getDB()
  return db.get('importedQuestionnaires', id)
}

export async function loadAllImportedQuestionnaires(): Promise<ImportedQuestionnaire[]> {
  const db = await getDB()
  return db.getAll('importedQuestionnaires')
}

export async function deleteImportedQuestionnaire(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('importedQuestionnaires', id)
}

// ── Assessor preferences ──────────────────────────────────────────────────────

export async function saveAssessorPreferences(prefs: AssessorPreferences): Promise<void> {
  const db = await getDB()
  await db.put('preferences', { key: 'assessor', ...prefs })
}

export async function loadAssessorPreferences(): Promise<AssessorPreferences | undefined> {
  const db = await getDB()
  const row = await db.get('preferences', 'assessor')
  if (!row) return undefined
  const { key: _key, ...prefs } = row
  return prefs as AssessorPreferences
}
