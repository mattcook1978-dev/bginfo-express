import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { LogOut, Loader2, KeyRound } from 'lucide-react'

interface UnlockScreenProps {
  onUnlocked: () => void
}

export default function UnlockScreen({ onUnlocked }: UnlockScreenProps) {
  const { unlockKey, signOut, user } = useAuth()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await unlockKey(password)
    if (err) {
      setError('Incorrect password.')
    } else {
      onUnlocked()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-20 px-4">
      <div className="w-full max-w-md space-y-4">

        <div className="text-center mb-2">
          <img src="/Logo.png" alt="QUsable" className="h-10 mx-auto" />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base">Enter your password</h1>
            <p className="text-gray-600 text-xs">{user?.email}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-gray-700 text-sm">
            Enter your password to unlock your assessor data.
          </p>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
              placeholder="Your password"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Unlock
            </button>
          </form>
        </div>

        <button
          onClick={() => void signOut()}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-700 text-sm transition-colors mx-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign in as a different user
        </button>
      </div>
    </div>
  )
}
