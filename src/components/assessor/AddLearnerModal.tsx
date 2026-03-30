import { useState, useEffect } from 'react'
import { X, Share2, Check } from 'lucide-react'
import type { QuestionnaireType, PackageVariant, ExpressLearnerRecord, ImportedQuestionnaire } from '../../types'
import { saveAssessorRecord, loadAllImportedQuestionnaires } from '../../lib/storage'
import { hashCode } from '../../lib/crypto'
import { publishCodeMapping } from '../../lib/fetchQuestionnaire'
import { supabase } from '../../lib/supabase'
import { useSubscription } from '../../contexts/SubscriptionContext'

interface AddLearnerModalProps {
  onClose: () => void
  onAdded: (record: ExpressLearnerRecord) => void
}

function generateInternalCode(qType: QuestionnaireType, variant: PackageVariant | 'custom'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let prefix: string
  if (variant === 'custom') prefix = qType === 'under16' ? 'CU' : 'CA'
  else if (variant === 'visual') prefix = qType === 'under16' ? 'VU' : 'VA'
  else prefix = qType === 'under16' ? 'U' : 'A'
  const array = new Uint8Array(7)
  crypto.getRandomValues(array)
  return prefix + Array.from(array).map(b => chars[b % chars.length]).join('')
}

export default function AddLearnerModal({ onClose, onAdded }: AddLearnerModalProps) {
  const { incrementMonthlyCount } = useSubscription()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [qType, setQType] = useState<QuestionnaireType>('under16')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [importedQuestionnaires, setImportedQuestionnaires] = useState<ImportedQuestionnaire[]>([])
  const [selectedImportedId, setSelectedImportedId] = useState<string>('')
  const [savedRecord, setSavedRecord] = useState<ExpressLearnerRecord | null>(null)
  const [copied, setCopied] = useState<'background' | 'visual' | null>(null)

  useEffect(() => {
    loadAllImportedQuestionnaires().then(qs => setImportedQuestionnaires(qs))
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required'
    if (!lastName.trim()) e.lastName = 'Last name is required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setSaving(true)
    try {
      // Check + increment monthly usage server-side before saving
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const usageRes = await fetch('/api/increment-monthly-usage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (usageRes.status === 429) {
          setErrors({ general: 'You have reached your monthly limit of 15 learners. This resets on the 1st of next month.' })
          return
        }
        if (!usageRes.ok) {
          setErrors({ general: 'Could not verify usage limit. Please try again.' })
          return
        }
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`
      const isCustom = selectedImportedId !== ''
      const code = generateInternalCode(qType, isCustom ? 'custom' : 'remainder')
      const visualCode = generateInternalCode(qType, 'visual')
      const record: ExpressLearnerRecord = {
        id: crypto.randomUUID(),
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        code,
        questionnaireType: qType,
        importedQuestionnaireId: isCustom ? selectedImportedId : undefined,
        createdAt: new Date().toISOString(),
        submitted: false,
        packages: {
          remainder: { status: 'sent', code },
          visual: { status: 'sent', code: visualCode },
        },
      }
      await saveAssessorRecord(record)
      if (isCustom) {
        const selectedQ = importedQuestionnaires.find(q => q.id === selectedImportedId)
        if (selectedQ?.publishedAt) {
          const codeHash = await hashCode(code)
          await publishCodeMapping(codeHash, selectedImportedId)
        }
      }
      incrementMonthlyCount()
      onAdded(record)
      setSavedRecord(record)
    } finally {
      setSaving(false)
    }
  }

  const buildShareMessage = (record: ExpressLearnerRecord, variant: 'background' | 'visual') => {
    const url = window.location.origin
    const code = variant === 'visual' ? record.packages?.visual?.code : record.code
    const label = variant === 'visual' ? 'Visual Questionnaire'
      : record.importedQuestionnaireId
        ? (importedQuestionnaires.find(q => q.id === record.importedQuestionnaireId)?.name ?? 'Custom Questionnaire')
        : 'Background Questionnaire'
    return `Hi ${record.firstName ?? record.name},

Here are your details to complete your ${label}:

Access code: ${code}
Link: ${url}

A few things to know:
• You can complete it over multiple sessions — you don't have to finish in one go.
• You must use the same device and browser each time you return. Your progress saves automatically.
• Please don't clear your browser data on that device, as this will erase your progress.
• Once you've finished all sections, you'll be prompted to send your completed questionnaire back to me.

If you have any questions, please get in touch.`
  }

  const handleShare = async (record: ExpressLearnerRecord, variant: 'background' | 'visual') => {
    const message = buildShareMessage(record, variant)
    if ('share' in navigator) {
      try { await navigator.share({ text: message }); return } catch { /* fall through */ }
    }
    await navigator.clipboard.writeText(message)
    setCopied(variant)
    setTimeout(() => setCopied(null), 2500)
  }

  if (savedRecord) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Learner Added</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-600">{savedRecord.name} has been added. Share the questionnaire code below.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {savedRecord.importedQuestionnaireId
                  ? (importedQuestionnaires.find(q => q.id === savedRecord.importedQuestionnaireId)?.name ?? 'Custom Questionnaire')
                  : 'Background Questionnaire'}
              </p>
              <p className="text-2xl font-bold tracking-widest text-navy-900 font-mono mb-3">{savedRecord.code}</p>
              <button
                onClick={() => handleShare(savedRecord, 'background')}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
              >
                {copied === 'background' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {copied === 'background' ? 'Copied!' : 'Share'}
              </button>
            </div>
            {savedRecord.packages?.visual?.code && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Visual Questionnaire</p>
                <p className="text-2xl font-bold tracking-widest text-navy-900 font-mono mb-3">{savedRecord.packages.visual.code}</p>
                <button
                  onClick={() => handleShare(savedRecord, 'visual')}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
                >
                  {copied === 'visual' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  {copied === 'visual' ? 'Copied!' : 'Share'}
                </button>
              </div>
            )}
          </div>
          <div className="p-5 border-t border-gray-100">
            <button onClick={onClose} className="w-full py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add New Learner</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {errors.general && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errors.general}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => { setFirstName(e.target.value); setErrors(prev => ({ ...prev, firstName: '' })) }}
                placeholder="First name"
                className={`w-full border-2 rounded-xl py-3 px-4 text-base focus:outline-none transition-colors ${errors.firstName ? 'border-red-400' : 'border-gray-300 focus:border-primary-500'}`}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => { setLastName(e.target.value); setErrors(prev => ({ ...prev, lastName: '' })) }}
                placeholder="Last name"
                className={`w-full border-2 rounded-xl py-3 px-4 text-base focus:outline-none transition-colors ${errors.lastName ? 'border-red-400' : 'border-gray-300 focus:border-primary-500'}`}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Questionnaire Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['under16', '16plus'] as QuestionnaireType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setQType(t)}
                  className={`py-3 px-4 rounded-xl border-2 font-medium transition-all text-sm ${
                    qType === t ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  {t === 'under16' ? 'Under 16' : '16 or over'}
                  <div className="text-xs font-normal opacity-75 mt-0.5">{t === 'under16' ? 'Parent/Carer' : 'Individual'}</div>
                </button>
              ))}
            </div>
          </div>

          {importedQuestionnaires.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Custom Questionnaire <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                value={selectedImportedId}
                onChange={e => setSelectedImportedId(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 text-base focus:outline-none focus:border-primary-500 transition-colors bg-white text-gray-700"
              >
                <option value="">Standard questionnaire</option>
                {importedQuestionnaires.map(q => (
                  <option key={q.id} value={q.id}>{q.name}{!q.publishedAt ? ' (not published)' : ''}</option>
                ))}
              </select>
              {selectedImportedId && !importedQuestionnaires.find(q => q.id === selectedImportedId)?.publishedAt && (
                <p className="text-xs text-amber-600 mt-1 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  This questionnaire has not been published yet. Publish it from the questionnaire list first.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Learner'}
          </button>
        </div>
      </div>
    </div>
  )
}
