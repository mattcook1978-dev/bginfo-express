import { useState, useCallback, useMemo } from 'react'
import type { AppView, Section } from './types'
import { LearnerProvider, useLearner } from './contexts/LearnerContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { questionnaireUnder16 } from './data/questionnaire-under16'
import { questionnaire16plus } from './data/questionnaire-16plus'
import { questionnaireVisual } from './lib/questionnaire'
import CodeEntry from './components/learner/CodeEntry'
import HomeScreen from './components/learner/HomeScreen'
import QuestionFlow from './components/learner/QuestionFlow'
import AssessorHome from './components/assessor/AssessorHome'
import AuthScreen from './components/auth/AuthScreen'
import RecoveryKeyModal from './components/auth/RecoveryKeyModal'
import UnlockScreen from './components/auth/UnlockScreen'

function AppInner() {
  const { user, encryptionKey, loading: authLoading, pendingRecoveryKey, onRecoveryKeyConfirmed } = useAuth()
  const [autoImportId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get('import')
    if (id) window.history.replaceState({}, '', window.location.pathname)
    return id
  })
  const [view, setView] = useState<AppView>(autoImportId ? 'assessor-home' : 'learner-code-entry')
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
  if (view === 'assessor-home' && user && !encryptionKey) {
    return <UnlockScreen onUnlocked={() => setView('assessor-home')} />
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
          onBack={() => setView('learner-code-entry')}
          autoImportId={autoImportId ?? undefined}
        />
      )

    default:
      return null
  }
}

export default function App() {
  return (
    <AuthProvider>
      <LearnerProvider>
        <AppInner />
      </LearnerProvider>
    </AuthProvider>
  )
}
