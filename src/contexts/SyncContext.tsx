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
    if (!encryptionKey) return
    if (uploadTimer.current) clearTimeout(uploadTimer.current)
    uploadTimer.current = setTimeout(async () => {
      const [records, questionnaires] = await Promise.all([
        loadAllAssessorRecords(),
        loadAllImportedQuestionnaires(),
      ])
      const payload: SyncPayload = {
        records,
        questionnaires,
        updatedAt: new Date().toISOString(),
      }
      await uploadSync(encryptionKey, payload)
    }, 2000)
  }, [encryptionKey])

  // Called after key unlock — restore cloud data into local IndexedDB
  const restoreFromCloud = useCallback(async (): Promise<boolean> => {
    if (!encryptionKey) return false

    const [cloudData, localRecords] = await Promise.all([
      downloadSync(encryptionKey),
      loadAllAssessorRecords(),
    ])

    if (!cloudData) return false

    // Only restore if cloud is newer than local, or local is empty
    const localEmpty = localRecords.length === 0
    const cloudNewer = localRecords.length > 0 &&
      new Date(cloudData.updatedAt) > new Date(Math.max(...localRecords.map(r => new Date(r.createdAt).getTime())))

    if (!localEmpty && !cloudNewer) return false

    await Promise.all([
      ...cloudData.records.map(r => saveAssessorRecord(r)),
      ...cloudData.questionnaires.map(q => saveImportedQuestionnaire(q)),
    ])

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
