import React, { useState, useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, Play, Pause } from 'lucide-react'
import type { Question, Responses } from '../../types'
import { useLearner } from '../../contexts/LearnerContext'
import AccessibilityToolbar from './AccessibilityToolbar'

import type { Questionnaire } from '../../types'

// ---- Bionic reading helper ----
function BionicWord({ word }: { word: string }) {
  const splitAt = Math.ceil(word.length / 2)
  const bold = word.slice(0, splitAt)
  const normal = word.slice(splitAt)
  return (
    <span>
      <strong>{bold}</strong>
      {normal}
    </span>
  )
}

function BionicText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/)
  return (
    <>
      {parts.map((part, i) =>
        /\s+/.test(part) ? (
          <span key={i}>{part}</span>
        ) : (
          <BionicWord key={i} word={part} />
        )
      )}
    </>
  )
}

// ---- Answer renderers ----
interface AnswerProps {
  question: Question
  value: string | string[] | boolean | undefined
  onChange: (val: string | string[] | boolean) => void
  onSttInsert?: (text: string) => void
  isFollowUp?: boolean
}

function YesNoAnswer({ value, onChange, buttons }: AnswerProps & { buttons: string[] }) {
  return (
    <div className={`flex gap-3 ${buttons.length > 2 ? 'flex-col sm:flex-row' : ''}`}>
      {buttons.map((btn) => (
        <button
          key={btn}
          onClick={() => onChange(btn.toLowerCase().replace(/ /g, '_'))}
          className={`flex-1 py-4 px-4 rounded-xl border-2 font-semibold text-base transition-all min-h-[52px] ${
            value === btn.toLowerCase().replace(/ /g, '_')
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
          }`}
        >
          {btn}
        </button>
      ))}
    </div>
  )
}

function SingleChoiceAnswer({ question, value, onChange }: AnswerProps) {
  return (
    <div className="space-y-2">
      {question.options?.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`w-full text-left py-4 px-5 rounded-xl border-2 font-medium transition-all min-h-[52px] ${
            value === option
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function MultiChoiceAnswer({ question, value, onChange }: AnswerProps) {
  const selected = Array.isArray(value) ? (value as string[]) : []
  const noneOption = 'None of the above'

  const toggle = (option: string) => {
    if (option === noneOption) {
      onChange(selected.includes(noneOption) ? [] : [noneOption])
    } else {
      const withoutNone = selected.filter(s => s !== noneOption)
      if (withoutNone.includes(option)) {
        onChange(withoutNone.filter(s => s !== option))
      } else {
        onChange([...withoutNone, option])
      }
    }
  }

  return (
    <div className="space-y-2">
      {question.options?.map((option) => (
        <button
          key={option}
          onClick={() => toggle(option)}
          className={`w-full text-left py-4 px-5 rounded-xl border-2 font-medium transition-all min-h-[52px] flex items-center gap-3 ${
            selected.includes(option)
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
          }`}
        >
          <span
            className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
              selected.includes(option)
                ? 'bg-white border-white'
                : 'border-current'
            }`}
          >
            {selected.includes(option) && (
              <svg className="w-3 h-3 text-primary-500" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          {option}
        </button>
      ))}
    </div>
  )
}

function FreeTextAnswer({ value, onChange }: AnswerProps) {
  const textValue = typeof value === 'string' ? value : ''

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <textarea
      value={textValue}
      onChange={handleChange}
      rows={4}
      placeholder="Type your answer here..."
      className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 text-base focus:outline-none focus:border-primary-500 transition-colors resize-none min-h-[100px]"
    />
  )
}

// ---- Check if answer triggers follow-up ----
function isFollowUpTriggered(question: Question, responses: Responses, followUpCondition: string | string[]): boolean {
  const answer = responses[question.id]
  if (!answer) return false

  if (typeof answer === 'string') {
    if (Array.isArray(followUpCondition)) {
      return followUpCondition.includes(answer)
    }
    return answer === followUpCondition
  }

  if (Array.isArray(answer)) {
    if (Array.isArray(followUpCondition)) {
      return followUpCondition.some(c => (answer as string[]).includes(c))
    }
    return (answer as string[]).includes(followUpCondition)
  }

  return false
}

// Collect all currently visible questions (recursively)
function getVisibleQuestions(questions: Question[], responses: Responses): Question[] {
  const result: Question[] = []
  for (const q of questions) {
    result.push(q)
    if (q.followUps) {
      for (const followUp of q.followUps) {
        if (isFollowUpTriggered(q, responses, followUp.condition)) {
          result.push(...getVisibleQuestions(followUp.questions, responses))
        }
      }
    }
  }
  return result
}

interface QuestionFlowProps {
  questions: Question[]
  onBack: () => void
  title: string
  subsectionNote?: string
  questionnaire: Questionnaire
}

export default function QuestionFlow({
  questions,
  onBack,
  title,
  subsectionNote,
  questionnaire,
}: QuestionFlowProps) {
  const { responses, updateResponse, preferences, saveStatus } = useLearner()
  const [currentIndex, setCurrentIndex] = useState(0)

  // On mount, jump to the first unanswered question so returning to a
  // partially-completed section continues where the learner left off.
  useEffect(() => {
    const filtered = questions.filter(q => q.note !== 'SECTION_HEADER' && q.note !== 'SECTION_HEADER_VDQ')
    const visible = getVisibleQuestions(filtered, responses)
    const firstUnanswered = visible.findIndex(q => {
      const val = responses[q.id]
      if (val === undefined || val === null) return true
      if (typeof val === 'string') return val.trim() === ''
      if (Array.isArray(val)) return val.length === 0
      return false
    })
    if (firstUnanswered > 0) setCurrentIndex(firstUnanswered)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [showComplete, setShowComplete] = useState(false)
  const [rulerY, setRulerY] = useState(200)
  const [rulerDragging, setRulerDragging] = useState(false)
  const [highlight, setHighlight] = useState<{ start: number; length: number } | null>(null)

  // SWReader state
  const [srIndex, setSrIndex] = useState(0)
  const [srPlaying, setSrPlaying] = useState(false)
  const [srHalf, setSrHalf] = useState(false) // false = full (150wpm), true = half (75wpm)
  const srIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear highlight and reset SWReader when question changes
  useEffect(() => {
    setHighlight(null)
    setSrIndex(0)
    setSrPlaying(false)
  }, [currentIndex])

  useEffect(() => {
    if (!preferences.swReader) { setSrPlaying(false); return }
    if (srPlaying) {
      const wpm = srHalf ? 75 : 150
      srIntervalRef.current = setInterval(() => {
        setSrIndex(prev => prev + 1)
      }, Math.round(60000 / wpm))
    } else {
      if (srIntervalRef.current) clearInterval(srIntervalRef.current)
    }
    return () => { if (srIntervalRef.current) clearInterval(srIntervalRef.current) }
  }, [srPlaying, srHalf, preferences.swReader])

  // Filter out header-type questions from the flow
  const allQuestions = questions.filter(q => q.note !== 'SECTION_HEADER' && q.note !== 'SECTION_HEADER_VDQ')

  // Get all currently visible questions based on responses
  const visibleQuestions = getVisibleQuestions(allQuestions, responses)

  // Clamp current index
  const safeIndex = Math.min(currentIndex, visibleQuestions.length - 1)
  const currentQuestion = visibleQuestions[safeIndex]

  const isAnswered = (q: Question) => {
    const val = responses[q.id]
    if (val === undefined || val === null) return false
    if (typeof val === 'string') return val.trim() !== ''
    if (Array.isArray(val)) return val.length > 0
    return true
  }

  const autoAdvanceTypes = ['yes_no', 'yes_no_notsure', 'yes_no_prefernot', 'yes_no_notsure_prefernot', 'single_choice']

  const handleAnswer = useCallback((val: string | string[] | boolean) => {
    if (!currentQuestion) return
    updateResponse(currentQuestion.id, val)
    if (autoAdvanceTypes.includes(currentQuestion.type)) {
      setTimeout(() => {
        const updatedResponses = { ...responses, [currentQuestion.id]: val }
        const newVisible = getVisibleQuestions(allQuestions, updatedResponses)
        if (safeIndex < newVisible.length - 1) {
          setCurrentIndex(safeIndex + 1)
        } else {
          setShowComplete(true)
        }
      }, 300)
    }
  }, [currentQuestion, updateResponse, responses, allQuestions, safeIndex])

  const handleNext = () => {
    // Recalculate visible after answer
    const newVisible = getVisibleQuestions(allQuestions, responses)
    if (safeIndex < newVisible.length - 1) {
      setCurrentIndex(safeIndex + 1)
    } else {
      setShowComplete(true)
    }
  }

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1)
    }
  }

  const handleRulerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setRulerDragging(true)
    document.body.classList.add('ruler-dragging')
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleRulerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rulerDragging) setRulerY(e.clientY)
  }

  const handleRulerPointerUp = () => {
    setRulerDragging(false)
    document.body.classList.remove('ruler-dragging')
  }

  // Font size mapping
  const fontSizeMap: Record<number, string> = {
    1: '0.9rem',
    2: '1rem',
    3: '1.125rem',
    4: '1.25rem',
    5: '1.5rem',
  }

  const lineSpacingMap: Record<number, string> = {
    1: '1.5',
    2: '1.875',
    3: '2.25',
  }

  const textStyle = {
    fontSize: fontSizeMap[preferences.fontSize] || '1.125rem',
    lineHeight: lineSpacingMap[preferences.lineSpacing] || '1.875',
    fontFamily: undefined,
  }

  if (showComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Section Complete!</h2>
          <p className="text-gray-600 mb-6">You have answered all the questions in this section.</p>
          <button
            onClick={onBack}
            className="w-full py-4 bg-yellow-400 text-gray-900 rounded-xl font-semibold text-lg hover:bg-yellow-500 transition-colors"
          >
            Back to Sections
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">No questions to display.</p>
      </div>
    )
  }

  const currentValue = responses[currentQuestion.id]

  function renderAnswer() {
    const q = currentQuestion
    const val = currentValue

    switch (q.type) {
      case 'yes_no':
        return <YesNoAnswer question={q} value={val} onChange={handleAnswer} buttons={['Yes', 'No']} />
      case 'yes_no_notsure':
        return <YesNoAnswer question={q} value={val} onChange={handleAnswer} buttons={['Yes', 'No', 'Not sure']} />
      case 'yes_no_prefernot':
        return <YesNoAnswer question={q} value={val} onChange={handleAnswer} buttons={['Yes', 'No', 'Prefer not to say']} />
      case 'yes_no_notsure_prefernot':
        return <YesNoAnswer question={q} value={val} onChange={handleAnswer} buttons={['Yes', 'No', 'Not sure', 'Prefer not to say']} />
      case 'single_choice':
        return <SingleChoiceAnswer question={q} value={val} onChange={handleAnswer} />
      case 'multi_choice':
        return <MultiChoiceAnswer question={q} value={val} onChange={handleAnswer} />
      case 'free_text':
        return <FreeTextAnswer question={q} value={val} onChange={handleAnswer} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Accessibility toolbar */}
      <AccessibilityToolbar
        currentQuestionText={currentQuestion.text}
        questionnaire={questionnaire}
        responses={responses}
        onHighlight={setHighlight}
      />

      {/* Reading ruler */}
      {preferences.readingRuler && (
        <div
          className="reading-ruler"
          style={{ top: `${rulerY}px` }}
          onPointerDown={handleRulerPointerDown}
          onPointerMove={handleRulerPointerMove}
          onPointerUp={handleRulerPointerUp}
        />
      )}

      {/* Colour overlay */}
      {preferences.overlayColor && (
        <div
          className="fixed inset-0 pointer-events-none z-20"
          style={{
            backgroundColor: preferences.overlayColor,
            opacity: preferences.overlayOpacity,
          }}
        />
      )}

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-8">
        {/* Section title + back */}
        <div className="flex items-center gap-3 mb-6 mt-2">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Back to section"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm leading-tight">{title}</h2>
            <div className="text-xs text-gray-500">
              Question {safeIndex + 1} of {visibleQuestions.length}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${((safeIndex + 1) / visibleQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Subsection note */}
        {subsectionNote && safeIndex === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
            {subsectionNote}
          </div>
        )}

        {/* VDQ note */}
        {currentQuestion.note === 'SECTION_HEADER_VDQ' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-800">
            Note: "Often" means persistent, occurring several times a week, though not necessarily every day.
          </div>
        )}

        {/* Question note (inline) */}
        {currentQuestion.note && currentQuestion.note !== 'SECTION_HEADER' && currentQuestion.note !== 'SECTION_HEADER_VDQ' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">
            {currentQuestion.note}
          </div>
        )}

        {/* Question panel */}
        {preferences.swReader ? (() => {
          const srWords = currentQuestion.text.split(/\s+/).filter(Boolean)
          const clampedIndex = Math.min(srIndex, srWords.length - 1)
          // Stop playback if we've reached the end
          if (srPlaying && srIndex >= srWords.length) {
            setSrPlaying(false)
            setSrIndex(srWords.length - 1)
          }
          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              {/* Word display */}
              <div className="flex items-center justify-center mb-4" style={{ minHeight: '80px', fontSize: '2.75rem' }}>
                <span className="font-semibold text-gray-900">{srWords[clampedIndex] || '···'}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                <div className="h-1.5 bg-primary-500 rounded-full transition-all"
                  style={{ width: `${srWords.length ? ((clampedIndex + 1) / srWords.length) * 100 : 0}%` }} />
              </div>
              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                  <button onClick={() => setSrHalf(false)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${!srHalf ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    Full
                  </button>
                  <button onClick={() => setSrHalf(true)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${srHalf ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    ½
                  </button>
                </div>
                <button onClick={() => { if (!srPlaying) { setSrIndex(0) } setSrPlaying(p => !p) }}
                  className="flex-1 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition-colors flex items-center justify-center gap-1.5">
                  {srPlaying ? <><Pause className="w-5 h-5" />Pause</> : <><Play className="w-5 h-5" />Play</>}
                </button>
              </div>
            </div>
          )
        })() : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <p className="text-gray-900 font-medium" style={textStyle}>
              {highlight ? (
                <>
                  {currentQuestion.text.slice(0, highlight.start)}
                  <mark className="bg-yellow-200 text-gray-900 rounded px-0.5">
                    {currentQuestion.text.slice(highlight.start, highlight.start + highlight.length)}
                  </mark>
                  {currentQuestion.text.slice(highlight.start + highlight.length)}
                </>
              ) : preferences.bionicReading ? (
                <BionicText text={currentQuestion.text} />
              ) : (
                currentQuestion.text
              )}
            </p>
          </div>
        )}

        {/* Save status */}
        {saveStatus === 'saved' && (
          <div className="text-xs text-green-600 text-right mb-3">Saved</div>
        )}

        {/* Answer panel */}
        <div className="space-y-3" style={textStyle}>
          {renderAnswer()}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={handlePrev}
            disabled={safeIndex === 0}
            className="flex items-center gap-2 py-3 px-5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[52px]"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <button
            onClick={handleNext}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold transition-colors min-h-[52px] ${
              isAnswered(currentQuestion)
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {safeIndex === visibleQuestions.length - 1 ? 'Finish Section' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  )
}
