import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { uploadSync, downloadSync, type SyncPayload } from '../lib/sync'
import { loadAllAssessorRecords, loadAllImportedQuestionnaires, saveAssessorRecord, saveImportedQuestionnaire } from '../lib/storage'

interface SyncContextValue {
  triggerUpload: () => void
  restoreFromCloud: () => Promise<boolean>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { encryptionKey } = useAuth()
  const uploadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced upload — waits 2s after last change before uploading
  const triggerUpload = useCallback(() => {
    if (!encryptionKey) { console.log('[sync] triggerUpload skipped — no key'); return }
    if (uploadTimer.current) clearTimeout(uploadTimer.current)
    uploadTimer.current = setTimeout(async () => {
      console.log('[sync] uploading...')
      const [records, questionnaires] = await Promise.all([
        loadAllAssessorRecords(),
        loadAllImportedQuestionnaires(),
      ])
      console.log('[sync] uploading', records.length, 'records,', questionnaires.length, 'questionnaires')
      const payload: SyncPayload = {
        records,
        questionnaires,
        updatedAt: new Date().toISOString(),
      }
      try {
        await uploadSync(encryptionKey, payload)
        console.log('[sync] upload done')
      } catch (err) {
        console.error('[sync] upload error:', err)
      }
    }, 2000)
  }, [encryptionKey])

  // Called after key unlock — restore cloud data into local IndexedDB
  const restoreFromCloud = useCallback(async (): Promise<boolean> => {
    if (!encryptionKey) { console.log('[sync] restoreFromCloud skipped — no key'); return false }

    console.log('[sync] downloading from cloud...')
    const [cloudData, localRecords] = await Promise.all([
      downloadSync(encryptionKey),
      loadAllAssessorRecords(),
    ])

    console.log('[sync] cloud data exists:', !!cloudData, '| local records:', localRecords.length)
    if (!cloudData) return false

    // Only restore if cloud is newer than local, or local is empty
    const localEmpty = localRecords.length === 0
    const cloudNewer = localRecords.length > 0 &&
      new Date(cloudData.updatedAt) > new Date(Math.max(...localRecords.map(r => new Date(r.createdAt).getTime())))

    console.log('[sync] localEmpty:', localEmpty, '| cloudNewer:', cloudNewer, '| cloud updatedAt:', cloudData.updatedAt)
    if (!localEmpty && !cloudNewer) { console.log('[sync] restore skipped — local is newer'); return false }

    console.log('[sync] restoring', cloudData.records.length, 'records from cloud')
    // Restore records and questionnaires
    await Promise.all([
      ...cloudData.records.map(r => saveAssessorRecord(r)),
      ...cloudData.questionnaires.map(q => saveImportedQuestionnaire(q)),
    ])

    console.log('[sync] restore done')
    return true
  }, [encryptionKey])

  return (
    <SyncContext.Provider value={{ triggerUpload, restoreFromCloud }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
