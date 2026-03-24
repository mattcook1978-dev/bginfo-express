import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Download, Trash2, RefreshCw, Share2, Check, Upload } from 'lucide-react'
import type { ExpressLearnerRecord, PackageVariant, PackageRecord, Responses, Questionnaire, KPEntry, ImportedQuestionnaire } from '../../types'
import { updateAssessorRecord, deleteAssessorRecord, loadImportedQuestionnaire, saveImportedQuestionnaire } from '../../lib/storage'
import { deriveKey, decrypt } from '../../lib/crypto'
import { generateKeyPoints } from '../../lib/sentenceGenerator'
import { generateKeyPointsBank } from '../../lib/generateKeyPointsBank'
import { questionnaireUnder16 } from '../../data/questionnaire-under16'
import { questionnaire16plus } from '../../data/questionnaire-16plus'
import { questionnaireVisual } from '../../lib/questionnaire'
import { downloadExpressDoc, downloadKeyNotesDoc, downloadResponsesDoc } from '../../lib/wordExport'

const REPORT_SECTION_ORDER = ['bg-health', 'bg-family', 'bg-linguistic', 'bg-educational', 'bg-current', 'bg-further']
const REPORT_SECTION_LABELS: Record<string, string> = {
  'bg-health':      'Health & Developmental History',
  'bg-family':      'Family History',
  'bg-linguistic':  'Linguistic History',
  'bg-educational': 'Educational History',
  'bg-current':     'Current Situation',
  'bg-further':     'Further Information',
}

interface LearnerDetailProps {
  record: ExpressLearnerRecord
  onBack: () => void
  onDeleted: () => void
  onRecordUpdate: (updated: ExpressLearnerRecord) => void
  importSuccessMessage?: string
}

function pkgCode(pkg: PackageRecord | undefined): string {
  return pkg?.code ?? ''
}

export default function LearnerDetail({ record, onBack, onDeleted, onRecordUpdate, importSuccessMessage }: LearnerDetailProps) {
  const [currentRecord, setCurrentRecord] = useState(record)
  const [packageResponses, setPackageResponses] = useState<Partial<Record<PackageVariant, Responses>>>({})
  const [decryptError, setDecryptError] = useState('')
  const [importingPackage, setImportingPackage] = useState<PackageVariant | null>(null)
  const [backgroundQuestionnaire, setBackgroundQuestionnaire] = useState<Questionnaire | null>(null)
  const [importedQuestionnaire, setImportedQuestionnaire] = useState<ImportedQuestionnaire | null>(null)
  const [keyNotes, setKeyNotes] = useState<Record<string, string>>(record.keyNotes ?? {})
  const [generatingKeyNotes, setGeneratingKeyNotes] = useState(false)
  const [generatingFirstTime, setGeneratingFirstTime] = useState(false)
  const [keyNotesStale, setKeyNotesStale] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingKeyNotes, setDownloadingKeyNotes] = useState(false)
  const [downloadingResponses, setDownloadingResponses] = useState<PackageVariant | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [shareCopied, setShareCopied] = useState<PackageVariant | null>(null)

  const packages: Partial<Record<PackageVariant, PackageRecord>> = currentRecord.packages ?? {}
  const hasAnyImported = Object.values(packages).some(p => p?.status === 'imported')

  // Load questionnaire
  useEffect(() => {
    if (currentRecord.importedQuestionnaireId) {
      loadImportedQuestionnaire(currentRecord.importedQuestionnaireId).then(iq => {
        if (iq) {
          setImportedQuestionnaire(iq)
          setBackgroundQuestionnaire({ type: currentRecord.questionnaireType, sections: iq.sections })
          const hasBank = Object.keys(iq.keyPointsBank).length > 0
          const stale = hasBank && !!iq.keyPointsBankUpdatedAt && iq.updatedAt > iq.keyPointsBankUpdatedAt
          setKeyNotesStale(stale)
        }
      })
    } else {
      setImportedQuestionnaire(null)
      setBackgroundQuestionnaire(
        currentRecord.questionnaireType === '16plus' ? questionnaire16plus : questionnaireUnder16
      )
    }
  }, [currentRecord.questionnaireType, currentRecord.importedQuestionnaireId])

  // Auto-decrypt imported responses
  useEffect(() => {
    if (!hasAnyImported || Object.keys(packageResponses).length > 0) return
    const loadAll = async () => {
      const result: Partial<Record<PackageVariant, Responses>> = {}
      for (const [v, pkg] of Object.entries(packages) as [PackageVariant, PackageRecord][]) {
        if (pkg?.status === 'imported' && pkg.encryptedResponses && pkg.encryptedResponsesSalt) {
          try {
            const salt = Uint8Array.from(atob(pkg.encryptedResponsesSalt), c => c.charCodeAt(0))
            const key = await deriveKey(pkgCode(pkg), salt)
            result[v as PackageVariant] = await decrypt(key, pkg.encryptedResponses) as Responses
          } catch { /* skip */ }
        }
      }
      if (Object.keys(result).length > 0) setPackageResponses(result)
    }
    void loadAll()
  }, [hasAnyImported]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateRecord = useCallback((updates: Partial<ExpressLearnerRecord>) => {
    const updated = { ...currentRecord, ...updates }
    setCurrentRecord(updated)
    onRecordUpdate(updated)
    void updateAssessorRecord(updated.id, updates)
  }, [currentRecord, onRecordUpdate])

  // Manual .bginfo file import
  const handleFileImport = async (variant: PackageVariant, file: File) => {
    setImportingPackage(variant)
    setDecryptError('')
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { salt: string; encryptedResponses: string }
      const code = pkgCode(packages[variant])
      const salt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0))
      const key = await deriveKey(code, salt)
      const decrypted = await decrypt(key, data.encryptedResponses) as Responses

      const updatedPackages: Partial<Record<PackageVariant, PackageRecord>> = {
        ...packages,
        [variant]: {
          status: 'imported' as const,
          encryptedResponses: data.encryptedResponses,
          encryptedResponsesSalt: data.salt,
          code,
          importedAt: new Date().toISOString(),
        },
      }
      updateRecord({ packages: updatedPackages, submitted: true })
      setPackageResponses(prev => ({ ...prev, [variant]: decrypted }))
    } catch {
      setDecryptError('Could not import — check the file is the right one for this learner.')
    } finally {
      setImportingPackage(null)
    }
  }

  const handleGenerateKeyNotes = async (forceRegenerate = false) => {
    if (!backgroundQuestionnaire) return
    const allResponses: Responses = { ...packageResponses.remainder, ...packageResponses.visual }
    if (Object.keys(allResponses).length === 0) return

    setGeneratingKeyNotes(true)

    // Get or generate the key points bank
    let bank: Record<string, KPEntry> | undefined
    if (importedQuestionnaire) {
      const hasBank = Object.keys(importedQuestionnaire.keyPointsBank).length > 0
      if (!hasBank || forceRegenerate || keyNotesStale) {
        const isFirstTime = !hasBank
        setGeneratingFirstTime(isFirstTime)
        try {
          bank = await generateKeyPointsBank(importedQuestionnaire)
          const now = new Date().toISOString()
          const updatedIq = { ...importedQuestionnaire, keyPointsBank: bank, keyPointsBankUpdatedAt: now }
          await saveImportedQuestionnaire(updatedIq)
          setImportedQuestionnaire(updatedIq)
          setKeyNotesStale(false)
        } catch {
          setGeneratingKeyNotes(false)
          setGeneratingFirstTime(false)
          return
        }
        setGeneratingFirstTime(false)
      } else {
        bank = importedQuestionnaire.keyPointsBank
      }
    }

    // Generate per report section
    const newNotes: Record<string, string> = {}
    for (const sectionId of REPORT_SECTION_ORDER) {
      const matchingSections = backgroundQuestionnaire.sections.filter(
        s => s.reportSectionId === sectionId
      )
      // Also include visual sections if applicable
      if (packageResponses.visual && questionnaireVisual) {
        const visualSections = questionnaireVisual.sections.filter(
          s => s.reportSectionId === sectionId
        )
        matchingSections.push(...visualSections)
      }
      if (matchingSections.length === 0) continue
      const prose = generateKeyPoints(matchingSections, allResponses, bank)
      if (prose.trim()) newNotes[sectionId] = prose
    }

    setKeyNotes(newNotes)
    updateRecord({ keyNotes: newNotes })
    setGeneratingKeyNotes(false)
  }

  const handleKeyNoteChange = (sectionId: string, value: string) => {
    const updated = { ...keyNotes, [sectionId]: value }
    setKeyNotes(updated)
    updateRecord({ keyNotes: updated })
  }

  const handleDownload = async () => {
    if (!backgroundQuestionnaire) return
    setDownloading(true)
    try {
      const allResponses: Responses = { ...packageResponses.remainder, ...packageResponses.visual }
      const questionnaire: Questionnaire = {
        type: currentRecord.questionnaireType,
        sections: [
          ...backgroundQuestionnaire.sections,
          ...(packageResponses.visual ? questionnaireVisual.sections : []),
        ],
      }
      await downloadExpressDoc(currentRecord.name, questionnaire, allResponses, keyNotes)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadKeyNotes = async () => {
    setDownloadingKeyNotes(true)
    try {
      await downloadKeyNotesDoc(currentRecord.name, keyNotes)
    } finally {
      setDownloadingKeyNotes(false)
    }
  }

  const handleDownloadResponses = async (variant: PackageVariant) => {
    if (!backgroundQuestionnaire) return
    setDownloadingResponses(variant)
    try {
      const responses = packageResponses[variant]
      if (!responses) return
      const questionnaire: Questionnaire =
        variant === 'visual'
          ? { type: currentRecord.questionnaireType, sections: questionnaireVisual.sections }
          : { type: currentRecord.questionnaireType, sections: backgroundQuestionnaire.sections }
      await downloadResponsesDoc(
        currentRecord.name,
        variant === 'visual' ? 'visual' : 'background',
        questionnaire,
        responses,
      )
    } finally {
      setDownloadingResponses(null)
    }
  }

  const handleDelete = async () => {
    // Delete any stored import links from Netlify
    for (const pkg of Object.values(packages)) {
      if (pkg?.importId) {
        try { await fetch(`/api/retrieve?id=${pkg.importId}`, { method: 'DELETE' }) } catch { /* ignore */ }
      }
    }
    await deleteAssessorRecord(currentRecord.id)
    onDeleted()
  }

  const buildShareMessage = (variant: PackageVariant) => {
    const code = variant === 'visual' ? packages.visual?.code : currentRecord.code
    const label = variant === 'visual' ? 'Visual Questionnaire' : 'Background Questionnaire'
    const firstName = currentRecord.firstName ?? currentRecord.name.split(' ')[0]
    return `Hi ${firstName},

Here are your details to complete your ${label}:

Access code: ${code}
Link: ${window.location.origin}

A few things to know:
• You can complete it over multiple sessions — you don't have to finish in one go.
• You must use the same device and browser each time you return. Your progress saves automatically.
• Please don't clear your browser data on that device, as this will erase your progress.
• Once you've finished all sections, you'll be prompted to send your completed questionnaire back to me.

If you have any questions, please get in touch.`
  }

  const handleShare = async (variant: PackageVariant) => {
    const message = buildShareMessage(variant)
    if ('share' in navigator) {
      try { await navigator.share({ text: message }); return } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(message)
    setShareCopied(variant)
    setTimeout(() => setShareCopied(null), 2500)
  }

  const hasKeyNotes = Object.values(keyNotes).some(v => v?.trim())
  const canDownload = hasAnyImported && Object.keys(packageResponses).length > 0

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Header */}
      <div className="bg-navy-950 border-b border-navy-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-navy-800 transition-colors text-navy-300 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-white text-lg flex-1 truncate">{currentRecord.name}</h1>
          <button
            onClick={handleDownload}
            disabled={!canDownload || !hasKeyNotes || downloading}
            title={!hasKeyNotes ? 'Generate key notes first' : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Preparing...' : 'Download all'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Import success banner */}
        {importSuccessMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
            {importSuccessMessage}
          </div>
        )}

        {/* Questionnaire packages */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white text-sm">Questionnaires</h2>

          {decryptError && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{decryptError}</p>
          )}

          {(['remainder', 'visual'] as PackageVariant[]).map(variant => {
            const pkg = packages[variant]
            if (!pkg) return null
            const isImported = pkg.status === 'imported'
            const label = variant === 'visual' ? 'Visual' : 'Background'
            const code = pkgCode(pkg)

            return (
              <div key={variant} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isImported
                        ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                        : 'bg-navy-700 text-navy-400 border border-navy-600'
                    }`}>
                      {isImported ? 'Imported' : 'Awaiting'}
                    </span>
                  </div>
                  {code && <div className="text-xs text-navy-400 mt-0.5 font-mono">{code}</div>}
                </div>

                {!isImported && (
                  <button
                    onClick={() => handleShare(variant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {shareCopied === variant ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    {shareCopied === variant ? 'Copied!' : 'Share'}
                  </button>
                )}

                {isImported && (
                  <button
                    onClick={() => void handleDownloadResponses(variant)}
                    disabled={downloadingResponses === variant}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
                    title="Download responses as Word doc"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloadingResponses === variant ? 'Saving...' : 'Download'}
                  </button>
                )}

                {/* Manual file import */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {importingPackage === variant ? 'Importing...' : isImported ? 'Re-import' : 'Import file'}
                  <input
                    type="file"
                    accept=".bginfo"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) void handleFileImport(variant, file)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            )
          })}
        </div>

        {/* Key Notes */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-white text-sm">Key Notes</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleDownloadKeyNotes()}
                disabled={!hasKeyNotes || downloadingKeyNotes}
                title={!hasKeyNotes ? 'Generate key notes first' : undefined}
                className="flex items-center gap-1.5 px-3 py-2 bg-navy-700 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingKeyNotes ? 'Saving...' : 'Download key notes'}
              </button>
              <button
                onClick={() => void handleGenerateKeyNotes(false)}
                disabled={!canDownload || generatingKeyNotes}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingKeyNotes ? 'animate-spin' : ''}`} />
                {generatingKeyNotes
                  ? generatingFirstTime
                    ? 'Generating (first time - up to 1 min)...'
                    : 'Generating...'
                  : hasKeyNotes ? 'Regenerate' : '+ Generate Key Notes'}
              </button>
            </div>
          </div>

          {keyNotesStale && (
            <p className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              The questionnaire has been updated since the key points bank was last generated. Regenerate to get up-to-date notes.
            </p>
          )}

          {!canDownload && (
            <p className="text-navy-400 text-sm">Import responses to generate key notes.</p>
          )}

          {canDownload && !hasKeyNotes && !generatingKeyNotes && (
            <p className="text-navy-400 text-sm">Click "Generate Key Notes" to produce report-ready prose from the questionnaire responses.</p>
          )}

          {(hasKeyNotes || generatingKeyNotes) && (
            <div className="space-y-4">
              {REPORT_SECTION_ORDER.map(sectionId => {
                const label = REPORT_SECTION_LABELS[sectionId]
                const value = keyNotes[sectionId] ?? ''
                return (
                  <div key={sectionId}>
                    <label className="block text-xs font-semibold text-navy-300 mb-1.5 uppercase tracking-wide">{label}</label>
                    <textarea
                      value={value}
                      onChange={e => handleKeyNoteChange(sectionId, e.target.value)}
                      placeholder={`No key notes for ${label.toLowerCase()}.`}
                      rows={3}
                      className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-600 focus:outline-none focus:border-primary-500 resize-y"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        <div className="bg-navy-800 border border-navy-700 rounded-xl p-5">
          <h2 className="font-semibold text-white text-sm mb-3">Danger Zone</h2>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/40 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete learner record
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-navy-300">This will permanently delete {currentRecord.name}'s record and all associated data. This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm font-medium transition-colors"
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
