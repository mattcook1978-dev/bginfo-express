import { useState, useEffect } from 'react'
import { ChevronLeft, Users, BookOpen, LogOut, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSync } from '../../contexts/SyncContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import type { ExpressLearnerRecord, PackageRecord, PackageVariant } from '../../types'
import { loadAllAssessorRecords, updateAssessorRecord } from '../../lib/storage'
import { hashCode, deriveKey, decrypt } from '../../lib/crypto'
import LearnersScreen from './LearnersScreen'
import LearnerDetail from './LearnerDetail'
import AddLearnerModal from './AddLearnerModal'
import QuestionnaireList from './QuestionnaireList'

type View = 'hub' | 'learners' | 'detail' | 'questionnaires'

interface AssessorHomeProps {
  onBack: () => void
  onSubscription: () => void
  autoImportId?: string
}

interface ExportData {
  codeHash: string
  salt: string
  questionnaireType: string
  packageVariant: string
  encryptedResponses: string
  exportedAt: string
}

export default function AssessorHome({ onBack, onSubscription, autoImportId }: AssessorHomeProps) {
  const { signOut } = useAuth()
  const { triggerUpload } = useSync()
  const { isActive, status: subStatus } = useSubscription()
  const [view, setView] = useState<View>('hub')
  const [records, setRecords] = useState<ExpressLearnerRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ExpressLearnerRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [autoImportStatus, setAutoImportStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'not-found' | 'confirm-overwrite'>('idle')
  const [autoImportMessage, setAutoImportMessage] = useState('')
  const [autoImportUrl, setAutoImportUrl] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [pendingAutoImport, setPendingAutoImport] = useState<{
    data: ExportData
    matchedRecord: ExpressLearnerRecord
    variant: PackageVariant
    importId: string
  } | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  useEffect(() => {
    loadAllAssessorRecords().then(setRecords).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!autoImportId || loading) return
    void handleAutoImport(autoImportId)
  }, [autoImportId, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const doAutoImport = async (
    data: ExportData,
    matchedRecord: ExpressLearnerRecord,
    variant: PackageVariant,
    importId: string,
  ) => {
    const code = variant === 'visual'
      ? matchedRecord.packages?.visual?.code
      : (matchedRecord.packages?.remainder?.code ?? matchedRecord.code)
    const salt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0))
    const key = await deriveKey(code!, salt)
    await decrypt(key, data.encryptedResponses)

    const updatedPackages: Partial<Record<PackageVariant, PackageRecord>> = {
      ...matchedRecord.packages,
      [variant]: {
        status: 'imported' as const,
        encryptedResponses: data.encryptedResponses,
        encryptedResponsesSalt: data.salt,
        code,
        importedAt: new Date().toISOString(),
        importId,
      },
    }
    await updateAssessorRecord(matchedRecord.id, { packages: updatedPackages, submitted: true })
    const updated = { ...matchedRecord, packages: updatedPackages, submitted: true }
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
    triggerUpload()
    setAutoImportStatus('success')
    setAutoImportMessage(`Responses from ${matchedRecord.name} imported successfully.`)
    setSelectedRecord(updated)
    setView('detail')
  }

  const handleAutoImport = async (importId: string) => {
    setAutoImportStatus('loading')
    setAutoImportUrl(`${window.location.origin}/?import=${importId}`)
    try {
      const res = await fetch(`/api/retrieve?id=${importId}`)
      if (res.status === 404 || res.status === 410) {
        const alreadyImportedRecord = records.find(r =>
          r.packages && Object.values(r.packages).some(p => p?.importId === importId)
        )
        if (alreadyImportedRecord) {
          const variant: PackageVariant = Object.entries(alreadyImportedRecord.packages ?? {})
            .find(([, p]) => p?.importId === importId)?.[0] as PackageVariant ?? 'remainder'
          setPendingAutoImport({
            data: null as unknown as ExportData,
            matchedRecord: alreadyImportedRecord,
            variant,
            importId,
          })
          setAutoImportStatus('confirm-overwrite')
          return
        }
        setAutoImportStatus('not-found')
        setAutoImportMessage(res.status === 410 ? 'This link has expired.' : 'Responses not found — the link may have already been used.')
        return
      }
      if (!res.ok) throw new Error('Fetch failed')

      const data = await res.json() as ExportData
      const variant: PackageVariant = data.packageVariant === 'visual' ? 'visual' : 'remainder'

      let matchedRecord: ExpressLearnerRecord | null = null
      for (const record of records) {
        const code = variant === 'visual'
          ? record.packages?.visual?.code
          : (record.packages?.remainder?.code ?? record.code)
        if (!code) continue
        const hashed = await hashCode(code)
        if (hashed === data.codeHash) { matchedRecord = record; break }
      }

      if (!matchedRecord) {
        setAutoImportStatus('not-found')
        setAutoImportMessage('No matching learner found. Make sure you are on the correct device.')
        return
      }

      if (matchedRecord.packages?.[variant]?.status === 'imported') {
        setPendingAutoImport({ data, matchedRecord, variant, importId })
        setAutoImportStatus('confirm-overwrite')
        return
      }

      await doAutoImport(data, matchedRecord, variant, importId)
    } catch {
      setAutoImportStatus('error')
      setAutoImportMessage('Something went wrong. Please try again or import the file manually.')
    }
  }

  const handleAdded = (record: ExpressLearnerRecord) => {
    setRecords(prev => [...prev, record])
    triggerUpload()
  }

  const handleRecordUpdate = (updated: ExpressLearnerRecord) => {
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r))
    setSelectedRecord(updated)
    triggerUpload()
  }

  const handleFactoryReset = () => {
    indexedDB.deleteDatabase('bginfo-express')
    window.location.reload()
  }

  const handleDeleted = () => {
    if (selectedRecord) {
      setRecords(prev => prev.filter(r => r.id !== selectedRecord.id))
      setSelectedRecord(null)
      setView('learners')
      triggerUpload()
    }
  }

  // Loading overlay
  if (autoImportStatus === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-900 font-semibold">Importing responses...</p>
        </div>
      </div>
    )
  }

  // Duplicate confirmation
  if (autoImportStatus === 'confirm-overwrite' && pendingAutoImport) {
    const { data, matchedRecord, variant, importId } = pendingAutoImport
    const canUpdate = !!data
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full">
          <p className="text-gray-900 font-semibold mb-3">Responses already imported</p>
          <p className="text-gray-700 text-sm mb-3">
            You've already imported responses for <span className="text-gray-900 font-medium">{matchedRecord.name}</span>.
            {canUpdate ? ' If you continue, the existing responses will be replaced with this new submission.' : ''}
          </p>
          <p className="text-gray-600 text-sm mb-6">
            Any key notes you've already generated won't be updated automatically — regenerate them from the learner record if needed.
          </p>
          <div className="flex flex-col gap-2">
            {canUpdate && (
              <button
                onClick={async () => {
                  setAutoImportStatus('loading')
                  try {
                    await doAutoImport(data, matchedRecord, variant, importId)
                  } catch {
                    setAutoImportStatus('error')
                    setAutoImportMessage('Something went wrong. Please try again.')
                  }
                }}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl font-medium transition-colors"
              >
                Update responses
              </button>
            )}
            <button
              onClick={() => {
                setPendingAutoImport(null)
                setAutoImportStatus('success')
                setSelectedRecord(matchedRecord)
                setView('detail')
              }}
              className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-xl font-medium transition-colors"
            >
              Go to {matchedRecord.name}'s record
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error / not-found overlay
  if (autoImportStatus === 'error' || autoImportStatus === 'not-found') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-semibold mb-2">Import failed</p>
          <p className="text-gray-700 text-sm mb-6">{autoImportMessage}</p>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(autoImportUrl)
              setLinkCopied(true)
              setTimeout(() => setLinkCopied(false), 2500)
            }}
            className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-xl font-medium transition-colors"
          >
            {linkCopied ? 'Link copied!' : 'Copy link to open on correct device'}
          </button>
        </div>
      </div>
    )
  }

  if (view === 'questionnaires') {
    return <QuestionnaireList onBack={() => setView('hub')} />
  }

  if (view === 'detail' && selectedRecord) {
    return (
      <LearnerDetail
        record={selectedRecord}
        onBack={() => { setSelectedRecord(null); setView('learners') }}
        onDeleted={handleDeleted}
        onRecordUpdate={handleRecordUpdate}
        importSuccessMessage={autoImportStatus === 'success' ? autoImportMessage : undefined}
      />
    )
  }

  if (view === 'learners') {
    const atLimit = records.length >= 15 && !isActive
    return (
      <>
        <LearnersScreen
          records={records}
          loading={loading}
          onBack={() => setView('hub')}
          onAddLearner={atLimit ? onSubscription : () => setShowAddModal(true)}
          addBlocked={atLimit}
          onSelectRecord={record => { setSelectedRecord(record); setView('detail') }}
        />
        {showAddModal && (
          <AddLearnerModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />
        )}
      </>
    )
  }

  // Hub
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center py-1 mb-3">
            <img src="/Logo.png" alt="QUsable" className="h-7" />
          </div>
          <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg flex-1">Assessor Area</h1>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-xs font-medium transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

        {/* Grace period warning — shown when past_due but still within 3 days */}
        {subStatus === 'past_due' && (
          <button
            onClick={onSubscription}
            className="w-full flex items-start gap-3 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors rounded-xl px-4 py-3 text-left"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Payment failed</p>
              <p className="text-xs text-red-700 mt-0.5">Please update your payment method. Access will be suspended shortly.</p>
            </div>
          </button>
        )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setView('learners')}
          className="bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-900 transition-all rounded-2xl p-6 text-left group"
        >
          <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-100 transition-colors">
            <Users className="w-6 h-6 text-gray-900" />
          </div>
          <div className="font-bold text-gray-900 text-base sm:text-xl mb-1">Learners</div>
          <div className="text-gray-700 text-sm">
            {loading ? 'Loading...' : `${records.length} learner${records.length !== 1 ? 's' : ''}`}
          </div>
        </button>

        <button
          onClick={() => setView('questionnaires')}
          className="bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-900 transition-all rounded-2xl p-6 text-left group"
        >
          <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-100 transition-colors">
            <BookOpen className="w-6 h-6 text-gray-900" />
          </div>
          <div className="font-bold text-gray-900 text-base sm:text-xl mb-1">Questionnaires</div>
          <div className="text-gray-700 text-sm">Build &amp; import</div>
        </button>
      </div>

        {/* Factory reset */}
        <div className="border border-dashed border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Dev — Factory Reset</p>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              Reset all data
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">This will delete all learner records, sessions, and questionnaires. Cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleFactoryReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Yes, reset everything
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
