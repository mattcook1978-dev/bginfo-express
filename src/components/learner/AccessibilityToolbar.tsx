import { useState } from 'react'
import { Volume2, VolumeX, Monitor, FileText } from 'lucide-react'
import { speak, stopSpeaking } from '../../lib/speech'
import { useLearner } from '../../contexts/LearnerContext'
import type { Questionnaire, Responses } from '../../types'
import { exportLearnerDraft } from '../../lib/wordExport'
import DisplayModal from './DisplayModal'

interface AccessibilityToolbarProps {
  currentQuestionText: string
  questionnaire: Questionnaire
  responses: Responses
  onHighlight?: (range: { start: number; length: number } | null) => void
}

export default function AccessibilityToolbar({
  currentQuestionText,
  questionnaire,
  responses,
  onHighlight,
}: AccessibilityToolbarProps) {
  const [speaking, setSpeaking] = useState(false)
  const [showDisplayModal, setShowDisplayModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { questionnaireType, preferences } = useLearner()

  const handleTts = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      onHighlight?.(null)
    } else {
      speak(
        currentQuestionText,
        preferences.ttsVoiceName,
        (charIndex, charLength) => onHighlight?.({ start: charIndex, length: charLength }),
        () => { setSpeaking(false); onHighlight?.(null) }
      )
      setSpeaking(true)
    }
  }

  const handleExport = async () => {
    if (!questionnaireType) return
    setExporting(true)
    try {
      await exportLearnerDraft(questionnaire, responses)
    } finally {
      setExporting(false)
    }
  }

  const toolbarButtons = [
    {
      icon: speaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />,
      shortLabel: speaking ? 'Stop' : 'Listen',
      ariaLabel: speaking ? 'Stop reading' : 'Read question aloud',
      onClick: handleTts,
      active: speaking,
    },
    {
      icon: <Monitor className="w-5 h-5" />,
      shortLabel: 'Display',
      ariaLabel: 'Display settings',
      onClick: () => setShowDisplayModal(true),
      active: false,
    },
    {
      icon: <FileText className="w-5 h-5" />,
      shortLabel: exporting ? 'Saving…' : 'Save Draft',
      ariaLabel: 'Save draft to Word',
      onClick: handleExport,
      active: false,
      disabled: exporting,
    },
  ]

  const [listenBtn, displayBtn, saveBtn] = toolbarButtons

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-t-4 border-yellow-400 border-b border-gray-200 z-30 px-3 py-2">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          {/* Listen + Display share the available space equally */}
          {[listenBtn, displayBtn].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              aria-label={btn.ariaLabel}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                btn.active
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {btn.icon}
              <span>{btn.shortLabel}</span>
            </button>
          ))}

          {/* Save - icon only, aligned right */}
          <button
            onClick={saveBtn.onClick}
            disabled={saveBtn.disabled}
            aria-label={saveBtn.ariaLabel}
            className="flex items-center justify-center p-2.5 rounded-xl min-h-[44px] min-w-[44px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            {saveBtn.icon}
          </button>
        </div>
      </div>

      {showDisplayModal && (
        <DisplayModal onClose={() => setShowDisplayModal(false)} questionText={currentQuestionText} />
      )}
    </>
  )
}
