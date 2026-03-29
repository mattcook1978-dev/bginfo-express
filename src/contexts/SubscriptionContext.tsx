import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type SubscriptionStatus = 'loading' | 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

interface SubscriptionState {
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
}

interface SubscriptionContextValue extends SubscriptionState {
  isActive: boolean
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    status: 'loading',
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
  })

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setState({ status: 'none', currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false })
      return
    }

    try {
      const res = await fetch('/api/subscription-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json() as SubscriptionState
      setState({ ...data, status: data.status as SubscriptionStatus })
    } catch {
      // If we can't reach the server, default to 'none' so the app doesn't hang
      setState({ status: 'none', currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false })
    }
  }, [])

  // Load on mount and when auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void refresh()
      } else {
        setState({ status: 'none', currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false })
      }
    })
    void refresh()
    return () => subscription.unsubscribe()
  }, [refresh])

  const isActive = state.status === 'active' || state.status === 'trialing'

  return (
    <SubscriptionContext.Provider value={{ ...state, isActive, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
