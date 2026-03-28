import React, { useState, useEffect } from 'react'
import { BookOpen, Loader2, ChevronRight } from 'lucide-react'
import type { QuestionnaireType, PackageVariant, ImportedQuestionnaire, LearnerSession, Responses, DisplayPreferences } from '../../types'
import { hashCode, generateSalt, uint8ToBase64, deriveKey, encrypt, decrypt } from '../../lib/crypto'
import { loadSession, saveSession, saveSessionKey, loadAllSessionKeys, deleteSessionKey } from '../../lib/storage'
import { useLearner, DEFAULT_PREFERENCES } from '../../contexts/LearnerContext'
import { fetchImportedQuestionnaire, fetchQuestionnaireByCodeHash } from '../../lib/fetchQuestionnaire'

function parseCode(normalizedCode: string): { qType: QuestionnaireType; variant: PackageVariant; isCustom: boolean } | null {
  // Custom codes: CA = custom 16plus, CU = custom under-16
  if (normalizedCode.startsWith('CA')) return { qType: '16plus', variant: 'remainder', isCustom: true }
  if (normalizedCode.startsWith('CU')) return { qType: 'under16', variant: 'remainder', isCustom: true }
  // New-style random codes: V/B prefix + A/U age indicator
  if (normalizedCode.startsWith('VA')) return { qType: '16plus', variant: 'visual', isCustom: false }
  if (normalizedCode.startsWith('VU')) return { qType: 'under16', variant: 'visual', isCustom: false }
  if (normalizedCode.startsWith('BA')) return { qType: '16plus', variant: 'remainder', isCustom: false }
  if (normalizedCode.startsWith('BU')) return { qType: 'under16', variant: 'remainder', isCustom: false }
  // Legacy codes: A/U prefix + V/R package suffix
  if (normalizedCode.startsWith('AV')) return { qType: '16plus', variant: 'visual', isCustom: false }
  if (normalizedCode.startsWith('AR')) return { qType: '16plus', variant: 'remainder', isCustom: false }
  if (normalizedCode.startsWith('UV')) return { qType: 'under16', variant: 'visual', isCustom: false }
  if (normalizedCode.startsWith('UR')) return { qType: 'under16', variant: 'remainder', isCustom: false }
  // Simple A/U codes (background questionnaire only, no package suffix)
  if (normalizedCode.startsWith('A')) return { qType: '16plus', variant: 'remainder', isCustom: false }
  if (normalizedCode.startsWith('U')) return { qType: 'under16', variant: 'remainder', isCustom: false }
  return null
}

interface CodeEntryProps {
  onSuccess: () => void
  onAssessorClick: () => void
}

function variantLabel(variant: PackageVariant): string {
  return variant === 'visual' ? 'Visual Questionnaire' : 'Background Questionnaire'
}

export default function CodeEntry({ onSuccess, onAssessorClick }: CodeEntryProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoLoading, setAutoLoading] = useState(true)
  const [savedSessions, setSavedSessions] = useState<Array<{ session: LearnerSession; key: CryptoKey }>>([])
  const [showPicker, setShowPicker] = useState(false)
  const { initSession } = useLearner()

  useEffect(() => {
    const init = async () => {
      try {
        const allKeys = await loadAllSessionKeys()
        if (allKeys.length === 0) return

        const items: Array<{ session: LearnerSession; key: CryptoKey }> = []
        for (const { codeHash, cryptoKey: key } of allKeys) {
          const session = await loadSession(codeHash)
          if (session) {
            items.push({ session, key })
          } else {
            await deleteSessionKey(codeHash) // stale key, clean up
          }
        }

        if (items.length === 0) return

        // Show picker for any number of saved sessions (so learner can also enter a new code)
        setSavedSessions(items)
        setShowPicker(true)
      } catch {
        // Fall through to code entry form
      } finally {
        setAutoLoading(false)
      }
    }
    void init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePickerSelect = async (item: { session: LearnerSession; key: CryptoKey }) => {
    setLoading(true)
    setError('')
    try {
      const responses = await decrypt(item.key, item.session.encryptedResponses) as Responses
      const prefs = await decrypt(item.key, item.session.encryptedPreferences) as DisplayPreferences
      let importedQ: ImportedQuestionnaire | null = null
      if (item.session.importedQuestionnaireId) {
        importedQ = await fetchImportedQuestionnaire(item.session.importedQuestionnaireId)
      }
      initSession(item.session, item.key, responses, prefs, importedQ)
      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 4) {
      setError('Please enter a valid access code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const normalizedCode = code.toUpperCase()
      const hash = await hashCode(normalizedCode)
      const existingSession = await loadSession(hash)

      if (existingSession) {
        // Returning user
        const salt = Uint8Array.from(atob(existingSession.salt), c => c.charCodeAt(0))
        const key = await deriveKey(normalizedCode, salt)

        let responses: Responses = {}
        let preferences: DisplayPreferences = { ...DEFAULT_PREFERENCES }

        try {
          responses = await decrypt(key, existingSession.encryptedResponses) as Responses
        } catch {
          responses = {}
        }

        try {
          preferences = await decrypt(key, existingSession.encryptedPreferences) as DisplayPreferences
        } catch {
          preferences = { ...DEFAULT_PREFERENCES }
        }

        // Load custom questionnaire if this session uses one
        let importedQ: ImportedQuestionnaire | null = null
        if (existingSession.importedQuestionnaireId) {
          importedQ = await fetchImportedQuestionnaire(existingSession.importedQuestionnaireId)
          if (!importedQ) {
            setError('Could not load your questionnaire. Please check your internet connection and try again.')
            setLoading(false)
            return
          }
        }

        await saveSessionKey(hash, key)
        initSession(existingSession, key, responses, preferences, importedQ)
        onSuccess()
      } else {
        // New user - determine questionnaire type and package variant from code prefix
        const parsed = parseCode(normalizedCode)
        if (!parsed) {
          setError('Invalid code. Please check the code your assessor gave you and try again.')
          setLoading(false)
          return
        }

        // For custom questionnaires, fetch from Netlify Blobs using code hash
        let importedQ: ImportedQuestionnaire | null = null
        if (parsed.isCustom) {
          importedQ = await fetchQuestionnaireByCodeHash(hash)
          if (!importedQ) {
            setError('Could not load your questionnaire. Please check your internet connection and try again.')
            setLoading(false)
            return
          }
        }

        // Create new session
        const salt = generateSalt()
        const key = await deriveKey(normalizedCode, salt)
        const emptyResponses: Responses = {}
        const defaultPrefs: DisplayPreferences = { ...DEFAULT_PREFERENCES }

        const encryptedResponses = await encrypt(key, emptyResponses)
        const encryptedPreferences = await encrypt(key, defaultPrefs)

        const newSession: LearnerSession = {
          codeHash: hash,
          salt: uint8ToBase64(salt),
          questionnaireType: parsed.qType,
          packageVariant: parsed.variant,
          importedQuestionnaireId: importedQ?.id,
          encryptedResponses,
          encryptedPreferences,
          lastUpdated: new Date().toISOString(),
          submitted: false,
        }

        await saveSession(newSession)
        await saveSessionKey(hash, key)
        initSession(newSession, key, emptyResponses, defaultPrefs, importedQ)
        onSuccess()
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (autoLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (showPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-3">
              <div className="bg-primary-500 rounded-2xl p-3">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-primary-700">BGInfo</h1>
            <p className="text-gray-600 mt-2">Welcome back — select a questionnaire or enter a new code</p>
          </div>

          <div className="space-y-3 mb-4">
            {savedSessions.map(item => (
              <button
                key={item.session.codeHash}
                onClick={() => { void handlePickerSelect(item) }}
                disabled={loading}
                className="w-full bg-white rounded-2xl shadow-md p-5 text-left hover:shadow-lg transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <div className="font-semibold text-gray-900 text-lg group-hover:text-primary-700 transition-colors">
                    {variantLabel(item.session.packageVariant)}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {item.session.submitted ? 'Submitted' : 'In progress'}
                  </div>
                </div>
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary-400" /> : <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />}
              </button>
            ))}
            <button
              onClick={() => setShowPicker(false)}
              disabled={loading}
              className="w-full bg-white rounded-2xl shadow-md p-5 text-left hover:shadow-lg transition-all flex items-center justify-between group disabled:opacity-50"
            >
              <div>
                <div className="font-semibold text-gray-900 text-lg group-hover:text-primary-700 transition-colors">
                  Enter a new code
                </div>
                <div className="text-sm text-gray-500 mt-0.5">Start a different questionnaire</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
            </button>
          </div>

          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3 mb-4">{error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* App header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <div className="bg-primary-500 rounded-2xl p-3">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary-700">BGInfo</h1>
          <p className="text-gray-600 mt-2">Background Information for Dyslexia Assessment</p>
        </div>

        {/* Code entry card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Enter your access code
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setError('')
                }}
                placeholder="e.g. KP7X2MR4"
                maxLength={9}
                className="w-full text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-xl py-4 px-4 focus:outline-none focus:border-primary-500 transition-colors uppercase"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <p className="text-sm text-gray-500 text-center mt-2">
                Your assessor will have given you this code
              </p>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="w-full py-4 bg-yellow-400 text-gray-900 text-lg font-semibold rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>

        {/* Assessor link */}
        <div className="text-center mt-8">
          <button
            onClick={onAssessorClick}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Assessor Area
          </button>
        </div>
      </div>
    </div>
  )
}
