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
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-start pt-20 px-4">
      <div className="w-full max-w-md space-y-4">

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base">Enter your password</h1>
            <p className="text-navy-400 text-xs">{user?.email}</p>
          </div>
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-4">
          <p className="text-navy-300 text-sm">
            Enter your password to unlock your assessor data.
          </p>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
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
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-500 focus:outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Unlock
            </button>
          </form>
        </div>

        <button
          onClick={() => void signOut()}
          className="flex items-center gap-2 text-navy-500 hover:text-navy-300 text-sm transition-colors mx-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign in as a different user
        </button>
      </div>
    </div>
  )
}
