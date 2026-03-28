import { ChevronLeft, UserPlus, ChevronRight } from 'lucide-react'
import type { ExpressLearnerRecord } from '../../types'

interface LearnersScreenProps {
  records: ExpressLearnerRecord[]
  loading: boolean
  onBack: () => void
  onAddLearner: () => void
  onSelectRecord: (record: ExpressLearnerRecord) => void
}

export default function LearnersScreen({ records, loading, onBack, onAddLearner, onSelectRecord }: LearnersScreenProps) {
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
          <h1 className="font-bold text-gray-900 text-lg flex-1">Learners</h1>
          <button
            onClick={onAddLearner}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-gray-600 text-sm">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-700 font-medium mb-1">No learners yet</p>
            <p className="text-gray-400 text-sm">Add a learner to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => (
              <button
                key={record.id}
                onClick={() => onSelectRecord(record)}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all rounded-xl px-5 py-4 text-left flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{record.name}</div>
                  <div className="text-gray-600 text-sm mt-0.5">
                    {record.questionnaireType === 'under16' ? 'Under 16' : '16 or over'}
                    {record.submitted && <span className="ml-2 text-green-700">· Submitted</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
