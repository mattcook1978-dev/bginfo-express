import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronLeft, Loader2 } from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot'

interface AuthScreenProps {
  onBack: () => void
  onSuccess: () => void
}

export default function AuthScreen({ onBack, onSuccess }: AuthScreenProps) {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8 && mode !== 'forgot') {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const err = await signIn(email, password)
      if (err) {
        setError('Incorrect email or password.')
      } else {
        onSuccess()
      }
    } else if (mode === 'register') {
      const err = await signUp(email, password)
      if (err) {
        setError(err)
      } else {
        setSuccess('Account created. Please check your email to confirm your account, then log in.')
        setMode('login')
        setPassword('')
        setConfirm('')
      }
    } else if (mode === 'forgot') {
      const err = await resetPassword(email)
      if (err) {
        setError(err)
      } else {
        setSuccess('If that email is registered, you will receive a password reset link shortly.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <div className="bg-navy-950 border-b border-navy-800 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-navy-800 transition-colors text-navy-300 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-white text-lg">
            {mode === 'login' ? 'Assessor Login' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-12">
        <div className="w-full max-w-md">
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-6 space-y-5">

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-navy-300 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-500 focus:outline-none focus:border-primary-500"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-semibold text-navy-300 mb-1.5 uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-500 focus:outline-none focus:border-primary-500"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-navy-300 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-500 focus:outline-none focus:border-primary-500"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </button>
            </form>

            <div className="border-t border-navy-700 pt-4 space-y-2 text-center text-sm">
              {mode === 'login' && (
                <>
                  <button onClick={() => { setMode('register'); setError(''); setSuccess('') }} className="text-primary-400 hover:text-primary-300 transition-colors block w-full">
                    Don't have an account? Create one
                  </button>
                  <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} className="text-navy-400 hover:text-navy-300 transition-colors block w-full">
                    Forgot your password?
                  </button>
                </>
              )}
              {(mode === 'register' || mode === 'forgot') && (
                <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} className="text-primary-400 hover:text-primary-300 transition-colors">
                  Back to login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
