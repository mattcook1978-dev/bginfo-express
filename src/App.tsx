import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { AppView, Section } from './types'
import { LearnerProvider, useLearner } from './contexts/LearnerContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SyncProvider, useSync } from './contexts/SyncContext'
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext'
import { questionnaireUnder16 } from './data/questionnaire-under16'
import { questionnaire16plus } from './data/questionnaire-16plus'
import { questionnaireVisual } from './lib/questionnaire'
import { fetchImportedQuestionnaire } from './lib/fetchQuestionnaire'
import { saveImportedQuestionnaire } from './lib/storage'
import CodeEntry from './components/learner/CodeEntry'
import HomeScreen from './components/learner/HomeScreen'
import QuestionFlow from './components/learner/QuestionFlow'
import AssessorHome from './components/assessor/AssessorHome'
import SubscriptionPage from './components/assessor/SubscriptionPage'
import AuthScreen from './components/auth/AuthScreen'
import RecoveryKeyModal from './components/auth/RecoveryKeyModal'
import UnlockScreen from './components/auth/UnlockScreen'

const isAssessorDomain = window.location.hostname === 'app.qusable.com'

function AppInner() {
  const { user, encryptionKey, unlocking, loading: authLoading, pendingRecoveryKey, onRecoveryKeyConfirmed } = useAuth()
  const { restoreFromCloud, triggerUpload } = useSync()
  const { refresh: refreshSubscription, isActive, status: subStatus, currentPeriodEnd } = useSubscription()
  const [restoring, setRestoring] = useState(false)
  const [autoImportId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get('import')
    if (id) window.history.replaceState({}, '', window.location.pathname)
    return id
  })
  const [pendingQuestionnaireId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get('questionnaire')
    if (id) window.history.replaceState({}, '', window.location.pathname)
    return id
  })
  const [questionnaireImportState, setQuestionnaireImportState] = useState<'idle' | 'importing' | 'success' | 'error'>('idle')
  const [subscriptionSuccess] = useState(() => {
    const result = new URLSearchParams(window.location.search).get('subscription')
    if (result) window.history.replaceState({}, '', window.location.pathname)
    return result === 'success'
  })
  const [view, setView] = useState<AppView>(() => {
    if (autoImportId) return 'assessor-home'
    if (new URLSearchParams(window.location.search).get('questionnaire')) return 'assessor-home'
    const sub = new URLSearchParams(window.location.search).get('subscription')
    if (sub) return 'assessor-home'
    if (isAssessorDomain) return 'assessor-home'
    return 'learner-code-entry'
  })
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>()
  const { questionnaireType, packageVariant, importedQuestionnaire } = useLearner()

  const baseQuestionnaire = questionnaireType === '16plus' ? questionnaire16plus : questionnaireUnder16
  const questionnaire = useMemo(() => {
    if (packageVariant === 'visual') return questionnaireVisual
    if (importedQuestionnaire) return { type: questionnaireType ?? ('under16' as const), sections: importedQuestionnaire.sections }
    return baseQuestionnaire
  }, [baseQuestionnaire, packageVariant, importedQuestionnaire, questionnaireType])
  const sections = questionnaire.sections

  const currentSection: Section | undefined = currentSectionId
    ? sections.find(s => s.id === currentSectionId)
    : undefined

  const handleLoginSuccess = useCallback(() => {
    setView('learner-home')
  }, [])

  const handleBackToHome = useCallback(() => {
    setView('learner-home')
    setCurrentSectionId(undefined)
  }, [])

  const getFlowQuestions = (section: Section) => {
    const questions = [...(section.questions ?? [])]
    for (const sub of section.subsections ?? []) {
      questions.push(...sub.questions)
    }
    return questions
  }

  const handleSectionSelect = useCallback((sectionId: string) => {
    setCurrentSectionId(sectionId)
    setView('learner-questions')
  }, [])

  // Whenever encryption key is set (any login path), sync with cloud
  useEffect(() => {
    if (!encryptionKey) return
    setRestoring(true)
    void restoreFromCloud().then(restored => {
      if (!restored) triggerUpload()
      setRestoring(false)
    })
  }, [encryptionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // After returning from Stripe checkout, refresh subscription status
  useEffect(() => {
    if (subscriptionSuccess) void refreshSubscription()
  }, [subscriptionSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-import a questionnaire shared via ?questionnaire= link
  useEffect(() => {
    if (!pendingQuestionnaireId || !encryptionKey || restoring) return
    setQuestionnaireImportState('importing')
    fetchImportedQuestionnaire(pendingQuestionnaireId).then(async q => {
      if (!q) { setQuestionnaireImportState('error'); return }
      await saveImportedQuestionnaire(q)
      triggerUpload()
      setQuestionnaireImportState('success')
    }).catch(() => setQuestionnaireImportState('error'))
  }, [pendingQuestionnaireId, encryptionKey, restoring]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlocked = useCallback(() => {
    setView('assessor-home')
  }, [])

  // Intercept browser back button when assessor is logged in
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const leavingRef = useRef(false)

  useEffect(() => {
    if (!user || !encryptionKey) return
    history.pushState({ qusable: true }, '')
    function handlePopState() {
      if (leavingRef.current) return
      history.pushState({ qusable: true }, '')
      setShowLeaveModal(true)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [user, encryptionKey])

  function handleStay() {
    setShowLeaveModal(false)
  }

  function handleLeave() {
    leavingRef.current = true
    setShowLeaveModal(false)
    history.go(-2)
  }

  // Show nothing while we check if the user is already logged in
  if (authLoading) return null

  // Show recovery key modal over the top of everything after first login
  if (pendingRecoveryKey) {
    return <RecoveryKeyModal recoveryKey={pendingRecoveryKey} onConfirmed={onRecoveryKeyConfirmed} />
  }

  // If trying to access assessor area and not logged in, show auth screen
  if (view === 'assessor-home' && !user) {
    return (
      <AuthScreen
        onBack={isAssessorDomain ? undefined : () => setView('learner-code-entry')}
        onSuccess={() => setView('assessor-home')}
      />
    )
  }

  // Logged in but encryption key not yet unlocked — prompt for password
  // (don't show if signIn is already unlocking to avoid race condition)
  if (view === 'assessor-home' && user && !encryptionKey && !unlocking) {
    return <UnlockScreen onUnlocked={handleUnlocked} />
  }

  // Encryption key is set but cloud restore is in progress — wait before mounting AssessorHome
  // so it reads IndexedDB after records have been written
  if (view === 'assessor-home' && restoring) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Subscription gate — only applies once user is fully logged in and restored
  if ((view === 'assessor-home' || view === 'subscription') && user && encryptionKey && !restoring) {
    // Wait for subscription status to load before gating
    if (subStatus === 'loading') {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }

    // Grace period: past_due within 3 days of period end → warn but allow through
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const inGracePeriod = subStatus === 'past_due' && currentPeriodEnd
      && (Date.now() - new Date(currentPeriodEnd).getTime()) < THREE_DAYS_MS

    // Hard gate: no active subscription and not in grace period
    if (!isActive && !inGracePeriod && view !== 'subscription') {
      return <SubscriptionPage onBack={() => setView('learner-code-entry')} gated />
    }
  }

  let content: React.ReactNode = null
  switch (view) {
    case 'learner-code-entry':
      content = (
        <CodeEntry
          onSuccess={handleLoginSuccess}
          onAssessorClick={isAssessorDomain ? undefined : () => setView('assessor-home')}
        />
      )
      break

    case 'learner-home':
      content = (
        <HomeScreen
          sections={sections}
          onSectionSelect={handleSectionSelect}
        />
      )
      break

    case 'learner-questions':
      if (!currentSection) {
        setView('learner-home')
        content = null
      } else {
        content = (
          <QuestionFlow
            questions={getFlowQuestions(currentSection)}
            onBack={handleBackToHome}
            title={currentSection.title}
            questionnaire={questionnaire}
          />
        )
      }
      break

    case 'assessor-home':
      content = (
        <AssessorHome
          onSubscription={() => setView('subscription')}
          autoImportId={autoImportId ?? undefined}
        />
      )
      break

    case 'subscription':
      content = <SubscriptionPage onBack={() => setView('assessor-home')} />
      break
  }

  return (
    <>
      {content}
      {questionnaireImportState === 'success' && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-lg z-50 flex items-center justify-between gap-3">
          <p className="text-sm text-green-800 font-medium">Questionnaire added to your account.</p>
          <button onClick={() => setQuestionnaireImportState('idle')} className="text-green-600 hover:text-green-800 shrink-0 text-xs">Dismiss</button>
        </div>
      )}
      {questionnaireImportState === 'error' && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-lg z-50 flex items-center justify-between gap-3">
          <p className="text-sm text-red-800 font-medium">Could not import questionnaire. The link may have expired.</p>
          <button onClick={() => setQuestionnaireImportState('idle')} className="text-red-600 hover:text-red-800 shrink-0 text-xs">Dismiss</button>
        </div>
      )}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Leaving this page will log you out</h2>
            <p className="text-sm text-gray-600">Use the back button in the app to navigate - leaving the page will end your session and you'll need to log in again.</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleStay}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Log out and leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SyncProvider>
        <SubscriptionProvider>
          <LearnerProvider>
            <AppInner />
          </LearnerProvider>
        </SubscriptionProvider>
      </SyncProvider>
    </AuthProvider>
  )
}
