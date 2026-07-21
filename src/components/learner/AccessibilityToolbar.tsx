import { useState, useRef, useEffect, useMemo } from 'react'
import { Volume2, VolumeX, Monitor, FileText, Mic } from 'lucide-react'
import { speak, stopSpeaking } from '../../lib/speech'
import { useLearner } from '../../contexts/LearnerContext'
import type { Questionnaire, Responses, QuestionType } from '../../types'
import { exportLearnerDraft } from '../../lib/wordExport'
import DisplayModal from './DisplayModal'

type OS = 'windows' | 'mac' | 'ios' | 'android' | 'other'

function detectOS(): OS {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Win/.test(ua)) return 'windows'
  if (/Mac/.test(ua)) return 'mac'
  return 'other'
}

const OS_TIPS: Record<OS, string | null> = {
  windows: 'Press Win + H on your keyboard to start dictating.',
  mac: 'Double-tap the Fn key to start dictating.',
  ios: 'Tap the mic icon on your keyboard to start dictating.',
  android: 'Tap the mic icon on your keyboard to start dictating.',
  other: null,
}

const ALL_OPTIONS: { label: string; tip: string }[] = [
  { label: 'Windows', tip: 'Press Win + H' },
  { label: 'Mac', tip: 'Double-tap the Fn key' },
  { label: 'iPhone / iPad', tip: 'Tap the mic icon on your keyboard' },
  { label: 'Android', tip: 'Tap the mic icon on your keyboard' },
]

interface AccessibilityToolbarProps {
  currentQuestionText: string
  currentQuestionType?: QuestionType
  questionnaire: Questionnaire
  responses: Responses
  onHighlight?: (range: { start: number; length: number } | null) => void
}

export default function AccessibilityToolbar({
  currentQuestionText,
  currentQuestionType,
  questionnaire,
  responses,
  onHighlight,
}: AccessibilityToolbarProps) {
  const [speaking, setSpeaking] = useState(false)
  const [showDisplayModal, setShowDisplayModal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showSpeakPopover, setShowSpeakPopover] = useState(false)
  const [showAllOptions, setShowAllOptions] = useState(false)
  const speakPopoverRef = useRef<HTMLDivElement>(null)
  const { questionnaireType, preferences } = useLearner()

  const os = useMemo(() => detectOS(), [])
  const isFreeText = currentQuestionType === 'free_text'
  const osTip = OS_TIPS[os]

  useEffect(() => {
    if (!showSpeakPopover) return
    function handleClickOutside(e: MouseEvent) {
      if (speakPopoverRef.current && !speakPopoverRef.current.contains(e.target as Node)) {
        setShowSpeakPopover(false)
        setShowAllOptions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSpeakPopover])

  // Reset popover state when question changes
  useEffect(() => {
    setShowSpeakPopover(false)
    setShowAllOptions(false)
  }, [currentQuestionText])

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
          {/* Listen + Display + Speak share the available space equally */}
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

          {/* Speak button */}
          <div className="relative flex-1">
            <button
              onClick={() => { if (isFreeText) { setShowSpeakPopover(o => !o); setShowAllOptions(false) } }}
              aria-label="Speak your answer"
              title={isFreeText ? 'Speak your answer' : 'Only available for text questions'}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] bg-gray-100 text-gray-700 ${
                isFreeText ? 'hover:bg-gray-200 cursor-pointer' : 'opacity-35 cursor-not-allowed'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>Speak</span>
            </button>

            {showSpeakPopover && (
              <div
                ref={speakPopoverRef}
                className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-40 p-4 w-64"
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">Speak your answer</p>
                {!showAllOptions && osTip ? (
                  <>
                    <p className="text-sm text-gray-600 leading-relaxed">{osTip}</p>
                    <button
                      onClick={() => setShowAllOptions(true)}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
                    >
                      Not right for your device?
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Choose your device:</p>
                    <ul className="space-y-1.5">
                      {ALL_OPTIONS.map(opt => (
                        <li key={opt.label} className="text-sm text-gray-700">
                          <span className="font-medium">{opt.label}:</span> {opt.tip}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

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
