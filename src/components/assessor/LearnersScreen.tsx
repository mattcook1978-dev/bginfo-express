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
          <h1 className="font-bold text-white text-lg flex-1">Learners</h1>
          <button
            onClick={onAddLearner}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-navy-400 text-sm">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-navy-300 font-medium mb-1">No learners yet</p>
            <p className="text-navy-500 text-sm">Add a learner to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(record => (
              <button
                key={record.id}
                onClick={() => onSelectRecord(record)}
                className="w-full bg-navy-800 border border-navy-700 hover:bg-navy-700 hover:border-primary-500/40 transition-all rounded-xl px-5 py-4 text-left flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{record.name}</div>
                  <div className="text-navy-400 text-sm mt-0.5">
                    {record.questionnaireType === 'under16' ? 'Under 16' : '16 or over'}
                    {record.submitted && <span className="ml-2 text-green-400">· Submitted</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-navy-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
