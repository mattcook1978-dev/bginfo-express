import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ChevronDown, ChevronRight, GripVertical, List, Trash2, Undo2, Eye, Save, Plus, CornerDownRight } from 'lucide-react'

export const TOUR_SEEN_KEY = 'qusable_tour_v1'

interface Step {
  title: string
  body: string
  targetKey: string | null
  expanded: boolean
}

const STEPS: Step[] = [
  {
    title: 'Welcome to the Question Editor',
    body: 'This quick tour walks you through everything you can do. Click Next to begin, or skip to go straight to your questionnaire.',
    targetKey: null,
    expanded: false,
  },
  {
    title: 'Sections',
    body: 'Your questionnaire is organised into sections. Click a section header to expand or collapse it.',
    targetKey: 'section-header',
    expanded: false,
  },
  {
    title: 'Questions',
    body: 'Inside each section are your questions. Each row is one question.',
    targetKey: 'question-list',
    expanded: true,
  },
  {
    title: 'Question text',
    body: 'Click the question text to edit it directly.',
    targetKey: 'question-text',
    expanded: true,
  },
  {
    title: 'Question type',
    body: 'This controls the answer format — Yes/No, Single Choice, Free Text, and more.',
    targetKey: 'type-picker',
    expanded: true,
  },
  {
    title: 'Answer options',
    body: 'For Single or Multi Choice questions, click the list icon to add or remove answer options.',
    targetKey: 'options-popover',
    expanded: true,
  },
  {
    title: 'Follow-up questions',
    body: 'Some questions have conditional follow-ups. Click to expand and edit the follow-up chain.',
    targetKey: 'follow-up',
    expanded: true,
  },
  {
    title: 'Insert a question',
    body: 'Click the +Q badge to insert a new question at that position in the sequence.',
    targetKey: 'insert-q',
    expanded: true,
  },
  {
    title: 'Reorder questions',
    body: 'Drag this handle up or down to reorder questions within a section.',
    targetKey: 'drag-handle',
    expanded: true,
  },
  {
    title: 'Move to another section',
    body: 'Click the section label on a question to move it to a different section.',
    targetKey: 'section-badge',
    expanded: true,
  },
  {
    title: 'Delete a question',
    body: "Click the bin icon to delete a question. You'll be asked to confirm first.",
    targetKey: 'delete-button',
    expanded: true,
  },
  {
    title: 'Undo',
    body: 'Made a mistake? Undo takes you back to your last saved state.',
    targetKey: 'undo-button',
    expanded: true,
  },
  {
    title: 'Preview',
    body: 'Preview lets you experience the questionnaire exactly as your learner will.',
    targetKey: 'preview-button',
    expanded: true,
  },
  {
    title: 'Save',
    body: "When you're happy with your changes, click Save. Everything is stored securely on this device.",
    targetKey: 'save-button',
    expanded: true,
  },
  {
    title: "You're all set!",
    body: "That's everything. You can relaunch this tour any time using the ? button in the toolbar.",
    targetKey: null,
    expanded: true,
  },
]

const PAD = 6

interface Props {
  onClose: () => void
}

export default function SpotlightTour({ onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [spotRect, setSpotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const refs = useRef<Map<string, HTMLElement | null>>(new Map())

  const step = STEPS[stepIdx]

  function refFor(key: string) {
    return (el: HTMLElement | null) => { refs.current.set(key, el) }
  }

  const measureSpot = useCallback(() => {
    if (!step.targetKey) { setSpotRect(null); return }
    const el = refs.current.get(step.targetKey)
    if (!el) { setSpotRect(null); return }
    const r = el.getBoundingClientRect()
    setSpotRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step.targetKey])

  useEffect(() => {
    const tid = setTimeout(measureSpot, 100)
    return () => clearTimeout(tid)
  }, [stepIdx, measureSpot])

  function next() {
    if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1)
    else onClose()
  }
  function prev() {
    if (stepIdx > 0) setStepIdx(i => i - 1)
  }

  const expanded = step.expanded

  return (
    <>
      {/* Layer 1: mock editor */}
      <div className="fixed inset-0 overflow-y-auto bg-gray-50" style={{ zIndex: 50 }}>
        {/* Header */}
        <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-3 sticky top-0" style={{ zIndex: 10 }}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
            <span className="font-bold text-gray-900 flex-1 text-sm">16 or Over Questionnaire</span>
            <button
              ref={refFor('undo-button') as any}
              className="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              ref={refFor('preview-button') as any}
              className="flex items-center gap-1 p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Preview</span>
            </button>
            <button
              ref={refFor('save-button') as any}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium shrink-0"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save &amp; Publish</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3 pb-40">

          {/* Section 1: Health — rose, collapsible */}
          <div className="border shadow-sm rounded-xl border-rose-200">
            <div
              ref={refFor('section-header') as any}
              className={`flex items-center gap-2 px-4 py-3 bg-rose-100 cursor-pointer select-none ${expanded ? 'rounded-t-xl' : 'rounded-xl'}`}
            >
              <span className="font-semibold text-rose-950 text-sm flex-1">Health &amp; Developmental History</span>
              <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-rose-200 text-rose-800 shrink-0">8 questions</span>
              {expanded
                ? <ChevronDown className="w-4 h-4 shrink-0 text-rose-950" />
                : <ChevronRight className="w-4 h-4 shrink-0 text-rose-950" />
              }
            </div>

            {expanded && (
              <div
                ref={refFor('question-list') as any}
                className="bg-rose-50 p-3 space-y-2 rounded-b-xl"
              >
                {/* Q1: Yes/No — hosts most of the refs */}
                <div className="relative pt-2.5">
                  <div
                    ref={refFor('insert-q') as any}
                    className="absolute top-2.5 -translate-y-1/2 right-10 z-10 w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-400 select-none"
                  >
                    +Q
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <div ref={refFor('drag-handle') as any} className="shrink-0 cursor-grab">
                      <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                    <div
                      ref={refFor('section-badge') as any}
                      className="shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 leading-none bg-rose-200 text-rose-800 cursor-pointer"
                    >
                      1a
                    </div>
                    <div
                      ref={refFor('question-text') as any}
                      className="flex-1 text-sm text-gray-700 cursor-text"
                    >
                      Do you have any known health or medical conditions?
                    </div>
                    <div
                      ref={refFor('type-picker') as any}
                      className="shrink-0 text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5 cursor-pointer hover:bg-gray-200"
                    >
                      Yes / No
                    </div>
                    <button
                      ref={refFor('delete-button') as any}
                      className="shrink-0 p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Q2: Multi Choice — shows the options popover icon */}
                <div className="relative pt-2.5">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0 cursor-grab" />
                    <div className="shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 leading-none bg-rose-200 text-rose-800">1b</div>
                    <div className="flex-1 text-sm text-gray-700">Which of the following have you been diagnosed with?</div>
                    <div className="shrink-0 text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">Multi Choice</div>
                    <button
                      ref={refFor('options-popover') as any}
                      className="shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button className="shrink-0 p-1 rounded text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Q3: Yes/No with a follow-up */}
                <div className="relative pt-2.5">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0 cursor-grab" />
                    <div className="shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 leading-none bg-rose-200 text-rose-800">1c</div>
                    <div className="flex-1 text-sm text-gray-700">Do you experience difficulties with reading or writing?</div>
                    <div className="shrink-0 text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">Yes / No</div>
                    <button className="shrink-0 p-1 rounded text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    ref={refFor('follow-up') as any}
                    className="ml-10 mt-1 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CornerDownRight className="w-3 h-3 text-gray-300 shrink-0" />
                    <span className="text-xs text-gray-400">
                      If <span className="font-medium">Yes</span> → <span className="text-gray-500">Please describe the difficulties you experience</span>
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
                  </div>
                </div>

                <button className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-rose-500 border border-dashed border-rose-200 rounded-lg transition-colors hover:bg-white">
                  <Plus className="w-3.5 h-3.5" /> Add question to this section
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Family History — orange, always collapsed */}
          <div className="border shadow-sm rounded-xl border-orange-200">
            <div className="flex items-center gap-2 px-4 py-3 bg-orange-100 rounded-xl cursor-pointer select-none">
              <span className="font-semibold text-orange-950 text-sm flex-1">Family History</span>
              <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-orange-200 text-orange-800 shrink-0">5 questions</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-orange-950" />
            </div>
          </div>

          {/* Section 3: Educational — emerald, always collapsed */}
          <div className="border shadow-sm rounded-xl border-emerald-200">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-100 rounded-xl cursor-pointer select-none">
              <span className="font-semibold text-emerald-950 text-sm flex-1">Educational &amp; Work History</span>
              <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-emerald-200 text-emerald-800 shrink-0">7 questions</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-emerald-950" />
            </div>
          </div>

        </div>
      </div>

      {/* Layer 2: spotlight cutout or full backdrop */}
      {step.targetKey && spotRect ? (
        <div
          className="fixed pointer-events-none rounded-lg"
          style={{
            zIndex: 51,
            top: spotRect.top - PAD,
            left: spotRect.left - PAD,
            width: spotRect.width + PAD * 2,
            height: spotRect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            border: '2px solid rgba(255,255,255,0.6)',
            transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
          }}
        />
      ) : !step.targetKey ? (
        <div className="fixed inset-0 pointer-events-none bg-black/65" style={{ zIndex: 51 }} />
      ) : null}

      {/* Layer 3: bottom panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl" style={{ zIndex: 52 }}>
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
              <p className="text-gray-600 text-sm mt-0.5 leading-relaxed">{step.body}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
              title="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{stepIdx + 1} of {STEPS.length}</span>
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button
                  onClick={prev}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="px-4 py-1.5 text-sm bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition-colors"
              >
                {stepIdx === STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
