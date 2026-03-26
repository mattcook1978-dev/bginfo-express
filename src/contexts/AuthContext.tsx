import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { createKeyBundle, unlockKeyWithPassword } from '../lib/userKeys'

interface AuthContextValue {
  user: User | null
  encryptionKey: CryptoKey | null
  loading: boolean
  unlocking: boolean
  pendingRecoveryKey: string | null
  onRecoveryKeyConfirmed: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
  unlockKey: (password: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) {
        setEncryptionKey(null)
        setPendingRecoveryKey(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Unlock encryption key (called after any login method) ─────────────────

  const unlockKey = async (password: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return 'Not logged in.'

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch('/api/user-keys', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        let detail = ''
        try { const j = await res.json() as { detail?: string }; detail = j.detail ?? '' } catch { /* empty */ }
        return `Server error ${res.status}${detail ? ': ' + detail : ''}`
      }

      const data = await res.json() as {
        exists: boolean
        encrypted_key?: string
        password_salt?: string
      }

      if (!data.exists) {
        const { bundle, ek } = await createKeyBundle(password)
        await fetch('/api/user-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            encryptedKey: bundle.encryptedKey,
            passwordSalt: bundle.passwordSalt,
            recoveryEncryptedKey: bundle.recoveryEncryptedKey,
            recoverySalt: bundle.recoverySalt,
            recoveryKey: bundle.recoveryKey,
          }),
        })
        setEncryptionKey(ek)
        setPendingRecoveryKey(bundle.recoveryKey)
      } else {
        const ek = await unlockKeyWithPassword(
          data.encrypted_key!,
          data.password_salt!,
          password,
        )
        setEncryptionKey(ek)
      }
      return null
    } catch (err) {
      return `Unlock failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // ── Auth methods ──────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string): Promise<string | null> => {
    setUnlocking(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setUnlocking(false); return 'Incorrect email or password.' }
    await unlockKey(password)
    setUnlocking(false)
    return null
  }

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    return null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setEncryptionKey(null)
    setPendingRecoveryKey(null)
  }

  const resetPassword = async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return error?.message ?? null
  }

  const onRecoveryKeyConfirmed = () => setPendingRecoveryKey(null)

  return (
    <AuthContext.Provider value={{
      user,
      encryptionKey,
      loading,
      unlocking,
      pendingRecoveryKey,
      onRecoveryKeyConfirmed,
      signIn,
      signUp,
      signOut,
      resetPassword,
      unlockKey,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
