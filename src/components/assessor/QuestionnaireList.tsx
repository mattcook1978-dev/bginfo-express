import { useState, useEffect } from 'react'
import { ChevronLeft, Plus, Upload, Globe, Pencil, Trash2 } from 'lucide-react'
import type { ImportedQuestionnaire } from '../../types'
import { loadAllImportedQuestionnaires, deleteImportedQuestionnaire } from '../../lib/storage'
import QuestionnaireBuilder, { importedQuestionnaireToBuilderSections } from './QuestionnaireBuilder'
import QuestionnaireImport from './QuestionnaireImport'

type View = 'list' | 'build' | 'import'

interface QuestionnaireListProps {
  onBack: () => void
}

interface BuilderInitialData {
  sections: ReturnType<typeof importedQuestionnaireToBuilderSections>
  name: string
  id?: string
  createdAt?: string
}

export default function QuestionnaireList({ onBack }: QuestionnaireListProps) {
  const [view, setView] = useState<View>('list')
  const [questionnaires, setQuestionnaires] = useState<ImportedQuestionnaire[]>([])
  const [builderInitialData, setBuilderInitialData] = useState<BuilderInitialData | null>(null)

  useEffect(() => {
    loadAllImportedQuestionnaires().then(setQuestionnaires)
  }, [])

  if (view === 'build') {
    return (
      <QuestionnaireBuilder
        onBack={() => { setBuilderInitialData(null); setView('list') }}
        onSaved={q => {
          setQuestionnaires(prev => {
            const exists = prev.find(x => x.id === q.id)
            return exists ? prev.map(x => x.id === q.id ? q : x) : [...prev, q]
          })
          setBuilderInitialData(null)
          setView('list')
        }}
        initialData={builderInitialData ?? undefined}
      />
    )
  }

  if (view === 'import') {
    return (
      <QuestionnaireImport
        onBack={() => setView('list')}
        onReadyForBuilder={sections => {
          setBuilderInitialData({ sections, name: '' })
          setView('build')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="bg-navy-950 border-b border-navy-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-navy-800 transition-colors text-navy-300 hover:text-white"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-white text-lg flex-1">Questionnaires</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBuilderInitialData(null); setView('build') }}
              className="flex items-center gap-1.5 px-3 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Build
            </button>
            <button
              onClick={() => setView('import')}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Standard questionnaires */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide px-1">Standard</p>
          {[
            { label: 'Under 16', sub: 'Parent/Carer questionnaire' },
            { label: '16 or over', sub: 'Individual questionnaire' },
            { label: 'Visual', sub: 'Visual history and difficulties' },
          ].map(q => (
            <div key={q.label} className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-white text-sm">{q.label}</div>
                <div className="text-xs text-navy-400 mt-0.5">{q.sub}</div>
              </div>
              <span className="text-xs text-navy-500 bg-navy-700 border border-navy-600 rounded px-2 py-0.5">Built-in</span>
            </div>
          ))}
        </div>

        {/* Custom questionnaires */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide px-1">Custom</p>
          {questionnaires.length === 0 ? (
            <div className="bg-navy-800 border border-dashed border-navy-600 rounded-xl p-6 text-center">
              <p className="text-navy-400 text-sm">No custom questionnaires yet.</p>
              <p className="text-navy-500 text-xs mt-1">Build a new one or import an existing document.</p>
            </div>
          ) : (
          questionnaires.map(q => (
            <div key={q.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm">{q.name}</span>
                  {q.publishedAt && (
                    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded px-1.5 py-0.5">
                      <Globe className="w-3 h-3" />
                      Published
                    </span>
                  )}
                </div>
                <div className="text-xs text-navy-400 mt-0.5">
                  {new Date(q.createdAt).toLocaleDateString()} · {q.sections.length} section{q.sections.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => {
                  setBuilderInitialData({
                    sections: importedQuestionnaireToBuilderSections(q),
                    name: q.name,
                    id: q.id,
                    createdAt: q.createdAt,
                  })
                  setView('build')
                }}
                className="p-1.5 rounded hover:bg-navy-700 hover:text-white text-navy-500 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  await deleteImportedQuestionnaire(q.id)
                  setQuestionnaires(prev => prev.filter(x => x.id !== q.id))
                }}
                className="p-1.5 rounded hover:bg-red-950/30 hover:text-red-400 text-navy-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
          )}
        </div>

      </div>
    </div>
  )
}
