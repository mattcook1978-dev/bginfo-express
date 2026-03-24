import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { QuestionnaireType, PackageVariant, Responses, DisplayPreferences, LearnerSession, ImportedQuestionnaire } from '../types'
import { encrypt } from '../lib/crypto'
import { saveSession, deleteSessionKey } from '../lib/storage'

const DEFAULT_PREFERENCES: DisplayPreferences = {
  fontSize: 3,
  lineSpacing: 2,
  overlayColor: null,
  overlayOpacity: 0.3,
  readingRuler: false,
  bionicReading: false,
  swReader: false,
  fontFamily: 'default',
  ttsVoiceName: null,
}

interface LearnerContextValue {
  questionnaireType: QuestionnaireType | null
  packageVariant: PackageVariant | null
  importedQuestionnaire: ImportedQuestionnaire | null
  responses: Responses
  preferences: DisplayPreferences
  cryptoKey: CryptoKey | null
  codeHash: string | null
  session: LearnerSession | null
  isLoading: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'

  setResponses: (responses: Responses) => void
  updateResponse: (questionId: string, value: string | string[] | boolean) => void
  updatePreferences: (prefs: Partial<DisplayPreferences>) => void
  initSession: (
    session: LearnerSession,
    key: CryptoKey,
    responses: Responses,
    preferences: DisplayPreferences,
    importedQuestionnaire?: ImportedQuestionnaire | null
  ) => void
  clearSession: () => void
}

const LearnerContext = createContext<LearnerContextValue | null>(null)

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [questionnaireType, setQuestionnaireType] = useState<QuestionnaireType | null>(null)
  const [packageVariant, setPackageVariant] = useState<PackageVariant | null>(null)
  const [importedQuestionnaire, setImportedQuestionnaire] = useState<ImportedQuestionnaire | null>(null)
  const [responses, setResponsesState] = useState<Responses>({})
  const [preferences, setPreferencesState] = useState<DisplayPreferences>(DEFAULT_PREFERENCES)
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null)
  const [codeHash, setCodeHash] = useState<string | null>(null)
  const [session, setSession] = useState<LearnerSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistSession = useCallback(
    async (newResponses: Responses, newPreferences: DisplayPreferences, currentSession: LearnerSession, key: CryptoKey) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaveStatus('saving')
        try {
          const encryptedResponses = await encrypt(key, newResponses)
          const encryptedPreferences = await encrypt(key, newPreferences)
          const updated: LearnerSession = {
            ...currentSession,
            encryptedResponses,
            encryptedPreferences,
            lastUpdated: new Date().toISOString(),
          }
          await saveSession(updated)
          setSession(updated)
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('error')
        }
      }, 500)
    },
    []
  )

  const initSession = useCallback(
    (
      sess: LearnerSession,
      key: CryptoKey,
      loadedResponses: Responses,
      loadedPreferences: DisplayPreferences,
      iq?: ImportedQuestionnaire | null
    ) => {
      setSession(sess)
      setCryptoKey(key)
      setCodeHash(sess.codeHash)
      setQuestionnaireType(sess.questionnaireType)
      setPackageVariant(sess.packageVariant)
      setImportedQuestionnaire(iq ?? null)
      setResponsesState(loadedResponses)
      setPreferencesState(loadedPreferences)
      setIsLoading(false)
    },
    []
  )

  const setResponses = useCallback(
    (newResponses: Responses) => {
      setResponsesState(newResponses)
      if (session && cryptoKey) {
        persistSession(newResponses, preferences, session, cryptoKey)
      }
    },
    [session, cryptoKey, preferences, persistSession]
  )

  const updateResponse = useCallback(
    (questionId: string, value: string | string[] | boolean) => {
      setResponsesState(prev => {
        const updated = { ...prev, [questionId]: value }
        if (session && cryptoKey) {
          persistSession(updated, preferences, session, cryptoKey)
        }
        return updated
      })
    },
    [session, cryptoKey, preferences, persistSession]
  )

  const updatePreferences = useCallback(
    (prefs: Partial<DisplayPreferences>) => {
      setPreferencesState(prev => {
        const updated = { ...prev, ...prefs }
        if (session && cryptoKey) {
          persistSession(responses, updated, session, cryptoKey)
        }
        return updated
      })
    },
    [session, cryptoKey, responses, persistSession]
  )

  const clearSession = useCallback(() => {
    if (codeHash) void deleteSessionKey(codeHash)
    setSession(null)
    setCryptoKey(null)
    setCodeHash(null)
    setQuestionnaireType(null)
    setPackageVariant(null)
    setImportedQuestionnaire(null)
    setResponsesState({})
    setPreferencesState(DEFAULT_PREFERENCES)
    setSaveStatus('idle')
    setIsLoading(false)
  }, [codeHash])

  return (
    <LearnerContext.Provider
      value={{
        questionnaireType,
        packageVariant,
        importedQuestionnaire,
        responses,
        preferences,
        cryptoKey,
        codeHash,
        session,
        isLoading,
        saveStatus,
        setResponses,
        updateResponse,
        updatePreferences,
        initSession,
        clearSession,
      }}
    >
      {children}
    </LearnerContext.Provider>
  )
}

export function useLearner() {
  const ctx = useContext(LearnerContext)
  if (!ctx) throw new Error('useLearner must be used within LearnerProvider')
  return ctx
}

export { DEFAULT_PREFERENCES }
