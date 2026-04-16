import { useState } from 'react'
import { X, Send, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface RequestQuestionnaireModalProps {
  onClose: () => void
}

export default function RequestQuestionnaireModal({ onClose }: RequestQuestionnaireModalProps) {
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (!description.trim()) return
    setSending(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/request-questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ description: description.trim() }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Request sent</h2>
            <p className="text-sm text-gray-500">Your request has been sent. You'll be contacted once your questionnaire is ready.</p>
          </div>
          <div className="p-5 border-t border-gray-100">
            <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Request a custom questionnaire</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Describe the questionnaire you need and we'll build it for you. Once it's ready, it will be added to your account automatically.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">What do you need?</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the questionnaire — e.g. sections you need, types of questions, any existing document you'd like us to base it on..."
              rows={5}
              className="w-full border-2 border-gray-300 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 transition-colors resize-none placeholder-gray-400"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !description.trim()}
            className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  )
}
