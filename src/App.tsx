import { useState, useCallback, useMemo, useEffect } from 'react'
import type { AppView, Section } from './types'
import { LearnerProvider, useLearner } from './contexts/LearnerContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SyncProvider, useSync } from './contexts/SyncContext'
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext'
import { questionnaireUnder16 } from './data/questionnaire-under16'
import { questionnaire16plus } from './data/questionnaire-16plus'
import { questionnaireVisual } from './lib/questionnaire'
import CodeEntry from './components/learner/CodeEntry'
import HomeScreen from './components/learner/HomeScreen'
import QuestionFlow from './components/learner/QuestionFlow'
import AssessorHome from './components/assessor/AssessorHome'
import SubscriptionPage from './components/assessor/SubscriptionPage'
import AuthScreen from './components/auth/AuthScreen'
import RecoveryKeyModal from './components/auth/RecoveryKeyModal'
import UnlockScreen from './components/auth/UnlockScreen'

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
  const [subscriptionSuccess] = useState(() => {
    const result = new URLSearchParams(window.location.search).get('subscription')
    if (result) window.history.replaceState({}, '', window.location.pathname)
    return result === 'success'
  })
  const [view, setView] = useState<AppView>(() => {
    if (autoImportId) return 'assessor-home'
    const sub = new URLSearchParams(window.location.search).get('subscription')
    if (sub) return 'assessor-home'
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

  const handleUnlocked = useCallback(() => {
    setView('assessor-home')
  }, [])

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
        onBack={() => setView('learner-code-entry')}
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

  switch (view) {
    case 'learner-code-entry':
      return (
        <CodeEntry
          onSuccess={handleLoginSuccess}
          onAssessorClick={() => setView('assessor-home')}
        />
      )

    case 'learner-home':
      return (
        <HomeScreen
          sections={sections}
          onSectionSelect={handleSectionSelect}
        />
      )

    case 'learner-questions':
      if (!currentSection) {
        setView('learner-home')
        return null
      }
      return (
        <QuestionFlow
          questions={getFlowQuestions(currentSection)}
          onBack={handleBackToHome}
          title={currentSection.title}
          questionnaire={questionnaire}
        />
      )

    case 'assessor-home':
      return (
        <AssessorHome
          onSubscription={() => setView('subscription')}
          autoImportId={autoImportId ?? undefined}
        />
      )

    case 'subscription':
      return <SubscriptionPage onBack={() => setView('assessor-home')} />

    default:
      return null
  }
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
