import { useState, useEffect } from 'react'
import { ChevronLeft, Plus, Upload, Globe, Pencil, Trash2, X } from 'lucide-react'
import type { ImportedQuestionnaire, Section } from '../../types'
import { loadAllImportedQuestionnaires, deleteImportedQuestionnaire } from '../../lib/storage'
import QuestionnaireBuilder, { importedQuestionnaireToBuilderSections } from './QuestionnaireBuilder'
import QuestionnaireImport from './QuestionnaireImport'
import QuestionnaireViewer from './QuestionnaireViewer'
import { questionnaireVisual } from '../../lib/questionnaire'
import { questionnaire16plus } from '../../data/questionnaire-16plus'
import { questionnaireUnder16 } from '../../data/questionnaire-under16'

type View = 'list' | 'build' | 'import' | 'view'

interface QuestionnaireListProps {
  onBack: () => void
}

interface BuilderInitialData {
  sections: ReturnType<typeof importedQuestionnaireToBuilderSections>
  name: string
  id?: string
  createdAt?: string
}

interface ViewerData {
  name: string
  sections: Section[]
  isBuiltIn: boolean
  builtInKey?: 'under16' | '16plus' | 'visual'
  customId?: string
}

const BUILT_IN = [
  { key: 'under16' as const, label: 'Under 16', sub: 'Parent/Carer questionnaire' },
  { key: '16plus' as const, label: '16 or over', sub: 'Individual questionnaire' },
  { key: 'visual' as const, label: 'Visual', sub: 'Visual history and difficulties' },
]

function getBuiltInSections(key: 'under16' | '16plus' | 'visual'): Section[] {
  if (key === 'under16') return questionnaireUnder16.sections
  if (key === '16plus') return questionnaire16plus.sections
  return questionnaireVisual.sections
}

export default function QuestionnaireList({ onBack }: QuestionnaireListProps) {
  const [view, setView] = useState<View>('list')
  const [questionnaires, setQuestionnaires] = useState<ImportedQuestionnaire[]>([])
  const [builderInitialData, setBuilderInitialData] = useState<BuilderInitialData | null>(null)
  const [viewerData, setViewerData] = useState<ViewerData | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadAllImportedQuestionnaires().then(setQuestionnaires)
  }, [])

  const openViewer = (data: ViewerData) => {
    setViewerData(data)
    setView('view')
  }

  const handleDuplicateAndEdit = (key: 'under16' | '16plus' | 'visual', label: string) => {
    const sections = getBuiltInSections(key)
    const fakeIq: ImportedQuestionnaire = {
      id: '',
      name: `${label} (copy)`,
      sections,
      keyPointsBank: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setBuilderInitialData({
      sections: importedQuestionnaireToBuilderSections(fakeIq),
      name: `${label} (copy)`,
    })
    setView('build')
  }

  if (view === 'view' && viewerData) {
    return (
      <QuestionnaireViewer
        name={viewerData.name}
        sections={viewerData.sections}
        isBuiltIn={viewerData.isBuiltIn}
        onBack={() => { setViewerData(null); setView('list') }}
        onDuplicateAndEdit={
          viewerData.isBuiltIn && viewerData.builtInKey
            ? () => handleDuplicateAndEdit(viewerData.builtInKey!, viewerData.name)
            : undefined
        }
      />
    )
  }

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg flex-1">Questionnaires</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBuilderInitialData(null); setView('build') }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Build</span>
            </button>
            <button
              onClick={() => setView('import')}
              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Standard questionnaires */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Standard</p>
          {BUILT_IN.map(q => (
            <button
              key={q.key}
              onClick={() => openViewer({ name: q.label, sections: getBuiltInSections(q.key), isBuiltIn: true, builtInKey: q.key })}
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-xl px-4 py-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="font-medium text-gray-900 text-sm">{q.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{q.sub}</div>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-0.5 shrink-0">Built-in</span>
            </button>
          ))}
        </div>

        {/* Custom questionnaires */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Custom</p>
          {questionnaires.length === 0 ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-white border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all rounded-xl p-6 text-center"
            >
              <p className="text-gray-600 text-sm font-medium">No custom questionnaires yet</p>
              <p className="text-gray-400 text-xs mt-1">Tap to build or import one</p>
            </button>
          ) : (
            questionnaires.map(q => (
              <button
                key={q.id}
                onClick={() => openViewer({ name: q.name, sections: q.sections, isBuiltIn: false, customId: q.id })}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-xl p-4 flex items-center gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{q.name}</span>
                    {q.publishedAt && (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        <Globe className="w-3 h-3" />
                        Published
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(q.createdAt).toLocaleDateString()} · {q.sections.length} section{q.sections.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setBuilderInitialData({
                      sections: importedQuestionnaireToBuilderSections(q),
                      name: q.name,
                      id: q.id,
                      createdAt: q.createdAt,
                    })
                    setView('build')
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={async e => {
                    e.stopPropagation()
                    await deleteImportedQuestionnaire(q.id)
                    setQuestionnaires(prev => prev.filter(x => x.id !== q.id))
                  }}
                  className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>
            ))
          )}
        </div>

      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Questionnaire</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => { setShowAddModal(false); setBuilderInitialData(null); setView('build') }}
                className="w-full flex items-center gap-4 px-4 py-4 bg-white border border-gray-200 hover:border-gray-900 hover:bg-gray-50 rounded-xl transition-all text-left"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Build</p>
                  <p className="text-xs text-gray-500 mt-0.5">Create a questionnaire from scratch</p>
                </div>
              </button>
              <button
                onClick={() => { setShowAddModal(false); setView('import') }}
                className="w-full flex items-center gap-4 px-4 py-4 bg-white border border-gray-200 hover:border-gray-900 hover:bg-gray-50 rounded-xl transition-all text-left"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Import</p>
                  <p className="text-xs text-gray-500 mt-0.5">Import from an existing Word document</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
