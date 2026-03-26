import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { createKeyBundle, unlockKeyWithPassword } from '../lib/userKeys'

interface AuthContextValue {
  user: User | null
  encryptionKey: CryptoKey | null
  loading: boolean
  pendingRecoveryKey: string | null        // set after register — show modal
  onRecoveryKeyConfirmed: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingRecoveryKey, setPendingRecoveryKey] = useState<string | null>(null)
  // Stored temporarily so we can unlock after key setup
  const [_pendingPassword, setPendingPassword] = useState<string | null>(null)

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
        setPendingPassword(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch and unlock encryption key after login ───────────────────────────

  const fetchAndUnlockKey = async (password: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch('/api/user-keys', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json() as {
      exists: boolean
      encrypted_key?: string
      password_salt?: string
    }

    if (!data.exists) {
      // First login — create key bundle
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
      // Returning user — unlock existing key
      const ek = await unlockKeyWithPassword(
        data.encrypted_key!,
        data.password_salt!,
        password,
      )
      setEncryptionKey(ek)
    }
  }

  // ── Auth methods ──────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return 'Incorrect email or password.'
    await fetchAndUnlockKey(password)
    return null
  }

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    // Store password temporarily — key setup happens after email confirmation + first login
    setPendingPassword(password)
    return null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setEncryptionKey(null)
    setPendingRecoveryKey(null)
    setPendingPassword(null)
  }

  const resetPassword = async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return error?.message ?? null
  }

  const onRecoveryKeyConfirmed = () => {
    setPendingRecoveryKey(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      encryptionKey,
      loading,
      pendingRecoveryKey,
      onRecoveryKeyConfirmed,
      signIn,
      signUp,
      signOut,
      resetPassword,
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
