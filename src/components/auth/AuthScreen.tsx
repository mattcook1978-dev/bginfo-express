import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ChevronLeft, Loader2 } from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot'

interface AuthScreenProps {
  onBack?: () => void
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="font-bold text-gray-900 text-lg">
            {mode === 'login' ? 'Assessor Login' : mode === 'register' ? 'Create Account' : 'Reset Password'}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <img src="/Logo.png" alt="QUsable" className="h-8 mx-auto" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {success && (
              <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset link'}
              </button>
            </form>

            <div className="border-t border-gray-200 pt-4 space-y-2 text-center text-sm">
              {mode === 'login' && (
                <>
                  <button onClick={() => { setMode('register'); setError(''); setSuccess('') }} className="text-gray-900 hover:text-gray-700 transition-colors block w-full">
                    Don't have an account? Create one
                  </button>
                  <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} className="text-gray-600 hover:text-gray-700 transition-colors block w-full">
                    Forgot your password?
                  </button>
                </>
              )}
              {(mode === 'register' || mode === 'forgot') && (
                <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} className="text-gray-900 hover:text-gray-700 transition-colors">
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
