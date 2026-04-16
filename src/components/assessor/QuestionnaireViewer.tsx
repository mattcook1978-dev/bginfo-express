import { useState } from 'react'
import { ChevronLeft, Download, Copy } from 'lucide-react'
import type { Section, Question } from '../../types'
import { downloadBlankQuestionnaireDoc } from '../../lib/wordExport'

interface QuestionnaireViewerProps {
  name: string
  sections: Section[]
  isBuiltIn: boolean
  onBack: () => void
  onDuplicateAndEdit?: () => void
}

const TYPE_LABEL: Record<string, string> = {
  yes_no: 'Yes / No',
  yes_no_notsure: 'Yes / No / Not sure',
  yes_no_prefernot: 'Yes / No / Prefer not to say',
  yes_no_notsure_prefernot: 'Yes / No / Not sure / Prefer not to say',
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  free_text: 'Free text',
}

const TYPE_PILL: Record<string, string> = {
  yes_no: 'bg-emerald-500/20 text-emerald-400',
  yes_no_notsure: 'bg-emerald-500/20 text-emerald-400',
  yes_no_prefernot: 'bg-emerald-500/20 text-emerald-400',
  yes_no_notsure_prefernot: 'bg-emerald-500/20 text-emerald-400',
  single_choice: 'bg-sky-500/20 text-sky-400',
  multi_choice: 'bg-violet-500/20 text-violet-400',
  free_text: 'bg-amber-500/20 text-amber-400',
}

function ViewQuestion({ q, qId, depth }: { q: Question; qId: string; depth: number }) {
  if (q.note === 'SECTION_HEADER' || q.note === 'SECTION_HEADER_VDQ') return null

  return (
    <div className={depth > 0 ? 'pl-4 border-l-2 border-gray-200' : ''}>
      <div className="py-1.5">
        <div className="flex items-start gap-2">
          <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5 min-w-[2.5rem] text-right pr-1">{qId}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{q.text}</p>
            <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${TYPE_PILL[q.type] ?? 'bg-gray-100 text-gray-500'}`}>
              {TYPE_LABEL[q.type] ?? q.type}
            </span>
            {(q.options?.length ?? 0) > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {q.options!.map((opt, i) => (
                  <span key={i} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded px-1.5 py-0.5">
                    {opt}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {q.followUps?.map((fu, fui) => (
        <div key={fui} className="ml-8 mt-0.5 space-y-0.5">
          <p className="text-xs text-gray-400 italic">
            If <span className="text-gray-500 font-medium">{Array.isArray(fu.condition) ? fu.condition.join(' / ') : fu.condition}</span>:
          </p>
          {fu.questions.map((fq, fqi) => (
            <ViewQuestion key={fq.id} q={fq} qId={`${qId}.${fqi + 1}`} depth={depth + 1} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function QuestionnaireViewer({ name, sections, isBuiltIn, onBack, onDuplicateAndEdit }: QuestionnaireViewerProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadBlankQuestionnaireDoc(name, sections)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg flex-1 truncate">{name}</h1>
          <div className="flex items-center gap-2">
            {isBuiltIn && onDuplicateAndEdit && (
              <button
                onClick={onDuplicateAndEdit}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Duplicate &amp; edit</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{downloading ? 'Downloading...' : 'Word'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {sections.map((section, si) => {
          const directQuestions = (section.questions ?? []).filter(
            q => q.note !== 'SECTION_HEADER' && q.note !== 'SECTION_HEADER_VDQ'
          )
          const subsections = section.subsections ?? []
          if (directQuestions.length === 0 && subsections.length === 0) return null

          return (
            <div key={section.id}>
              <h2 className="text-sm font-semibold text-gray-900 pb-1.5 mb-2 border-b border-gray-200">
                {section.title}
              </h2>

              {directQuestions.length > 0 && (
                <div className="space-y-0.5">
                  {directQuestions.map((q, qi) => (
                    <ViewQuestion key={q.id} q={q} qId={`${si + 1}.${qi + 1}`} depth={0} />
                  ))}
                </div>
              )}

              {subsections.map((sub, subi) => (
                <div key={sub.id} className="mt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {sub.title}
                  </h3>
                  <div className="space-y-0.5">
                    {sub.questions.map((q, qi) => (
                      <ViewQuestion key={q.id} q={q} qId={`${si + 1}.${subi + 1}.${qi + 1}`} depth={0} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
