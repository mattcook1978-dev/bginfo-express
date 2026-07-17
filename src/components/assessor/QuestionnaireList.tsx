import { useState, useEffect } from 'react'
import { ChevronLeft, Plus, Upload, Globe, Pencil, Copy, Trash2, X, Link, MessageSquare } from 'lucide-react'
import type { ImportedQuestionnaire } from '../../types'
import { loadAllImportedQuestionnaires, saveImportedQuestionnaire, deleteImportedQuestionnaire } from '../../lib/storage'
import QuestionnaireBuilder, { importedQuestionnaireToBuilderSections } from './QuestionnaireBuilder'
import QuestionnaireImport from './QuestionnaireImport'
import RequestQuestionnaireModal from './RequestQuestionnaireModal'
import { questionnaireVisual } from '../../lib/questionnaire'
import { questionnaire16plus } from '../../data/questionnaire-16plus'
import { questionnaireUnder16 } from '../../data/questionnaire-under16'
import { useAuth } from '../../contexts/AuthContext'

const ADMIN_EMAIL = 'mattcook1978@gmail.com'

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

const BUILT_IN = [
  { key: 'under16' as const, label: 'Under 16', sub: 'Parent/Carer questionnaire' },
  { key: '16plus' as const, label: '16 or over', sub: 'Individual questionnaire' },
  { key: 'visual' as const, label: 'Visual', sub: 'Visual history and difficulties' },
]

function getBuiltInSections(key: 'under16' | '16plus' | 'visual') {
  if (key === 'under16') return questionnaireUnder16.sections
  if (key === '16plus') return questionnaire16plus.sections
  return questionnaireVisual.sections
}

export default function QuestionnaireList({ onBack }: QuestionnaireListProps) {
  const { user } = useAuth()
  const isAdmin = user?.email === ADMIN_EMAIL
  const [view, setView] = useState<View>('list')
  const [questionnaires, setQuestionnaires] = useState<ImportedQuestionnaire[]>([])
  const [builderInitialData, setBuilderInitialData] = useState<BuilderInitialData | null>(null)
  const [builderAllowSubsections, setBuilderAllowSubsections] = useState(true)
  const [builderKey, setBuilderKey] = useState(0)
  const [builderStartReadOnly, setBuilderStartReadOnly] = useState(false)
  const [builderIsBuiltIn, setBuilderIsBuiltIn] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadAllImportedQuestionnaires().then(setQuestionnaires)
  }, [])

  function openInBuilder(data: BuilderInitialData, opts: { readOnly: boolean; isBuiltIn: boolean; allowSubsections?: boolean }) {
    setBuilderInitialData(data)
    setBuilderStartReadOnly(opts.readOnly)
    setBuilderIsBuiltIn(opts.isBuiltIn)
    setBuilderAllowSubsections(opts.allowSubsections ?? true)
    setBuilderKey(k => k + 1)
    setView('build')
  }

  function handleCopyLink(id: string) {
    const url = `https://app.qusable.com?questionnaire=${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  async function handleDuplicateQuestionnaire(q: ImportedQuestionnaire) {
    const now = new Date().toISOString()
    const copy: ImportedQuestionnaire = {
      ...q,
      id: `iq_${Date.now()}`,
      name: `Duplicate of ${q.name}`,
      createdAt: now,
      updatedAt: now,
      publishedAt: undefined,
    }
    await saveImportedQuestionnaire(copy)
    setQuestionnaires(prev => [...prev, copy])
  }

  function handleDuplicateAndEdit() {
    if (!builderInitialData) return
    openInBuilder(
      { sections: builderInitialData.sections, name: `${builderInitialData.name} (copy)` },
      { readOnly: false, isBuiltIn: false }
    )
  }

  if (view === 'build') {
    return (
      <QuestionnaireBuilder
        key={builderKey}
        onBack={() => { setBuilderInitialData(null); setBuilderAllowSubsections(true); setView('list') }}
        onSaved={q => {
          setQuestionnaires(prev => {
            const exists = prev.find(x => x.id === q.id)
            return exists ? prev.map(x => x.id === q.id ? q : x) : [...prev, q]
          })
          setBuilderInitialData(null)
          setBuilderAllowSubsections(true)
          setView('list')
        }}
        allowSubsections={builderAllowSubsections}
        initialData={builderInitialData ?? undefined}
        startReadOnly={builderStartReadOnly}
        isBuiltIn={builderIsBuiltIn}
        onDuplicateAndEdit={handleDuplicateAndEdit}
      />
    )
  }

  if (view === 'import') {
    return (
      <QuestionnaireImport
        onBack={() => setView('list')}
        onReadyForBuilder={sections => {
          openInBuilder({ sections, name: '' }, { readOnly: false, isBuiltIn: false, allowSubsections: false })
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
              onClick={() => openInBuilder({ sections: importedQuestionnaireToBuilderSections({ id: '', name: '', sections: [], keyPointsBank: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }), name: '' }, { readOnly: false, isBuiltIn: false })}
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
            <div
              key={q.key}
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-xl px-4 py-3 flex items-center gap-2"
            >
              <button
                onClick={() => {
                  const sections = getBuiltInSections(q.key)
                  const fakeIq: ImportedQuestionnaire = { id: '', name: q.label, sections, keyPointsBank: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                  openInBuilder({ sections: importedQuestionnaireToBuilderSections(fakeIq), name: q.label }, { readOnly: true, isBuiltIn: true })
                }}
                className="flex-1 text-left"
              >
                <div className="font-medium text-gray-900 text-sm">{q.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{q.sub}</div>
              </button>
              <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded px-2 py-0.5 shrink-0">Built-in</span>
              <button
                onClick={() => {
                  const sections = getBuiltInSections(q.key)
                  const now = new Date().toISOString()
                  const copy: ImportedQuestionnaire = { id: `iq_${Date.now()}`, name: `Duplicate of ${q.label}`, sections, keyPointsBank: {}, createdAt: now, updatedAt: now }
                  saveImportedQuestionnaire(copy).then(() => setQuestionnaires(prev => [...prev, copy]))
                }}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                title="Duplicate questionnaire"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
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
              <div
                key={q.id}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-xl p-4 flex items-center gap-3"
              >
                <button
                  onClick={() => openInBuilder(
                    { sections: importedQuestionnaireToBuilderSections(q), name: q.name, id: q.id, createdAt: q.createdAt },
                    { readOnly: true, isBuiltIn: false }
                  )}
                  className="flex-1 min-w-0 text-left"
                >
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
                </button>
                {isAdmin && q.publishedAt && (
                  <button
                    onClick={() => handleCopyLink(q.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-green-600 transition-colors shrink-0"
                    title="Copy share link"
                  >
                    {copiedId === q.id ? <Globe className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => handleDuplicateQuestionnaire(q)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  title="Duplicate questionnaire"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openInBuilder(
                    { sections: importedQuestionnaireToBuilderSections(q), name: q.name, id: q.id, createdAt: q.createdAt },
                    { readOnly: false, isBuiltIn: false }
                  )}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    await deleteImportedQuestionnaire(q.id)
                    setQuestionnaires(prev => prev.filter(x => x.id !== q.id))
                  }}
                  className="p-1.5 rounded hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
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
                onClick={() => {
                  setShowAddModal(false)
                  openInBuilder({ sections: importedQuestionnaireToBuilderSections({ id: '', name: '', sections: [], keyPointsBank: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }), name: '' }, { readOnly: false, isBuiltIn: false })
                }}
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
              {!isAdmin && (
                <button
                  onClick={() => { setShowAddModal(false); setShowRequestModal(true) }}
                  className="w-full flex items-center gap-4 px-4 py-4 bg-white border border-gray-200 hover:border-gray-900 hover:bg-gray-50 rounded-xl transition-all text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Request</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ask us to build one for you</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showRequestModal && (
        <RequestQuestionnaireModal onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  )
}
