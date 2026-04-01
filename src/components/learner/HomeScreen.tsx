import { useState } from 'react'
import { Send, Lock, CheckCircle, ChevronRight, BookOpen } from 'lucide-react'
import { useLearner } from '../../contexts/LearnerContext'
import type { Section } from '../../types'
import { getSectionProgress, getIncompleteSections } from '../../lib/progress'
import { encrypt } from '../../lib/crypto'
import { saveSession } from '../../lib/storage'

interface HomeScreenProps {
  sections: Section[]
  onSectionSelect: (sectionId: string) => void
}

export default function HomeScreen({ sections, onSectionSelect }: HomeScreenProps) {
  const { responses, session, cryptoKey, saveStatus } = useLearner()
  const [showIncompleteToast, setShowIncompleteToast] = useState(false)
  const [incompleteList, setIncompleteList] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const allComplete = sections.every(s => getSectionProgress(s, responses) === 100)

  const handleSendClick = () => {
    if (!allComplete) {
      const incomplete = getIncompleteSections(sections, responses)
      setIncompleteList(incomplete)
      setShowIncompleteToast(true)
      setTimeout(() => setShowIncompleteToast(false), 5000)
      return
    }
    void handleConfirmSend()
  }

  const handleConfirmSend = async () => {
    if (!session || !cryptoKey) return
    setSending(true)
    try {
      const encryptedResponses = await encrypt(cryptoKey, responses)
      const exportData = {
        codeHash: session.codeHash,
        salt: session.salt,
        questionnaireType: session.questionnaireType,
        packageVariant: session.packageVariant ?? 'remainder',
        encryptedResponses,
        exportedAt: new Date().toISOString(),
      }

      // Upload to Netlify and share URL
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      if (!res.ok) throw new Error('Upload failed')
      const { id } = await res.json() as { id: string }
      const shareUrl = `${window.location.origin}/?import=${id}`

      if ('share' in navigator) {
        await (navigator as Navigator).share({ url: shareUrl, title: 'QUsable Responses' })
      } else {
        await (navigator as Navigator).clipboard.writeText(shareUrl)
        setLinkCopied(true)
      }

      await saveSession({ ...session, submitted: true, lastUpdated: new Date().toISOString() })
      setSent(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      // ignore other errors silently
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-lg p-1.5">
            <BookOpen className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-lg">QUsable</h1>
            <p className="text-xs text-gray-500">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'idle' && 'Background Information'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Welcome</h2>
          <p className="text-gray-600 mt-1">
            Please complete each section below. Your progress is saved automatically.
          </p>
        </div>

        {/* Section list */}
        <div className="space-y-3 mb-8">
          {sections.map((section) => {
            const progress = getSectionProgress(section, responses)
            const isComplete = progress === 100

            return (
              <button
                key={section.id}
                onClick={() => onSectionSelect(section.id)}
                className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isComplete ? (
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                        {section.title}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>

                {/* Progress bar */}
                <div className="ml-9">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span>{progress}% complete</span>
                    {isComplete && <span className="text-green-600 font-medium">Complete</span>}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
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

        {/* Send button */}
        <button
          onClick={handleSendClick}
          disabled={sending}
          className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all ${
            allComplete
              ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {sending ? (
            <>
              <Send className="w-5 h-5 animate-pulse" />
              Preparing...
            </>
          ) : allComplete ? (
            <>
              <Send className="w-5 h-5" />
              Send Responses
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Send Responses (complete all sections first)
            </>
          )}
        </button>
      </div>

      {/* Incomplete toast */}
      {showIncompleteToast && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto bg-amber-600 text-white rounded-xl p-4 shadow-2xl z-50">
          <p className="font-semibold mb-1">Please complete all sections first.</p>
          <p className="text-sm opacity-90">Still to complete:</p>
          <ul className="text-sm mt-1 space-y-0.5">
            {incompleteList.map(s => (
              <li key={s} className="flex items-center gap-1.5">
                <span className="text-amber-300">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success modal */}
      {sent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {linkCopied ? 'Link copied!' : 'Responses sent!'}
            </h3>
            <p className="text-gray-600 text-sm mb-5">
              {linkCopied
                ? 'A link has been copied to your clipboard. Paste it into an email or message to send to your assessor.'
                : 'Your responses have been shared. Your assessor will be in touch once they have reviewed them.'}
            </p>
            <button
              onClick={() => { setSent(false) }}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
