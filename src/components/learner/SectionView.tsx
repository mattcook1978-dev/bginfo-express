import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import type { Section, Subsection } from '../../types'
import { useLearner } from '../../contexts/LearnerContext'
import { getSubsectionProgress, getSectionProgress } from '../../lib/progress'

interface SectionViewProps {
  section: Section
  onBack: () => void
  onSubsectionSelect: (subsectionId: string) => void
  onDirectQuestions: () => void
}

export default function SectionView({
  section,
  onBack,
  onSubsectionSelect,
  onDirectQuestions,
}: SectionViewProps) {
  const { responses } = useLearner()
  const sectionProgress = getSectionProgress(section, responses)

  // If no subsections, go straight to questions
  useEffect(() => {
    if (!section.subsections || section.subsections.length === 0) {
      onDirectQuestions()
    }
  }, [section, onDirectQuestions])

  if (!section.subsections || section.subsections.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{section.title}</h1>
          </div>
          <div className="text-sm font-medium text-gray-500">{sectionProgress}%</div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Direct questions for this section (before subsections) */}
        {section.questions && section.questions.length > 0 && (
          <div className="mb-4">
            <button
              onClick={onDirectQuestions}
              className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                  General Questions
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </div>
            </button>
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-700 mb-4">Subsections</h2>

        <div className="space-y-3">
          {section.subsections.map((subsection: Subsection) => {
            const progress = getSubsectionProgress(subsection, responses)
            const isComplete = progress === 100

            return (
              <button
                key={subsection.id}
                onClick={() => onSubsectionSelect(subsection.id)}
                className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                      {subsection.title}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>

                <div className="ml-8">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{progress}% complete</span>
                    {isComplete && <span className="text-green-600 font-medium">Complete</span>}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isComplete ? 'bg-green-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
