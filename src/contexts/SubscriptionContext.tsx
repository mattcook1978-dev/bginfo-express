import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type SubscriptionStatus = 'loading' | 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'

const MONTHLY_LIMIT = 15

function getMonthlyResetDate(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
}

interface SubscriptionState {
  status: SubscriptionStatus
  currentPeriodEnd: string | null
  trialEnd: string | null
  cancelAtPeriodEnd: boolean
  monthlyCount: number
}

interface SubscriptionContextValue extends SubscriptionState {
  isActive: boolean
  atMonthlyLimit: boolean
  monthlyLimit: number
  monthlyResetDate: string
  refresh: () => Promise<void>
  incrementMonthlyCount: () => void
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    status: 'loading',
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    monthlyCount: 0,
  })

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setState({ status: 'none', currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false, monthlyCount: 0 })
      return
    }

    try {
      const res = await fetch('/api/subscription-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json() as SubscriptionState
      setState({ ...data, status: data.status as SubscriptionStatus, monthlyCount: data.monthlyCount ?? 0 })
    } catch {
      setState({ status: 'none', currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false, monthlyCount: 0 })
    }
  }, [])

  // Optimistically increment the local count after a learner is successfully added
  const incrementMonthlyCount = useCallback(() => {
    setState(prev => ({ ...prev, monthlyCount: prev.monthlyCount + 1 }))
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void refresh()
      } else {
        setState({ status: 'none', currentPeriodEnd: null, trialEnd: null, cancelAtPeriodEnd: false, monthlyCount: 0 })
      }
    })
    void refresh()
    return () => subscription.unsubscribe()
  }, [refresh])

  const isActive = state.status === 'active' || state.status === 'trialing'
  const atMonthlyLimit = state.monthlyCount >= MONTHLY_LIMIT

  return (
    <SubscriptionContext.Provider value={{
      ...state,
      isActive,
      atMonthlyLimit,
      monthlyLimit: MONTHLY_LIMIT,
      monthlyResetDate: getMonthlyResetDate(),
      refresh,
      incrementMonthlyCount,
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}
