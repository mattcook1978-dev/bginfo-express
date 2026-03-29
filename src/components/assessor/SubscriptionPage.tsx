import { useState } from 'react'
import { ChevronLeft, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSubscription } from '../../contexts/SubscriptionContext'

const MONTHLY_PRICE_ID = 'price_1TGEwoIpGMCEUrHjKmoMvvjV'
const YEARLY_PRICE_ID = 'price_1TGEwoIpGMCEUrHj58Ys8X7i'

interface SubscriptionPageProps {
  onBack: () => void
}

export default function SubscriptionPage({ onBack }: SubscriptionPageProps) {
  const { status, currentPeriodEnd, trialEnd, cancelAtPeriodEnd, refresh } = useSubscription()
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isActive = status === 'active' || status === 'trialing'

  const handleSubscribe = async () => {
    setError('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Please log in first.'); setLoading(false); return }

      const priceId = interval === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      })

      if (!res.ok) throw new Error('Failed to create checkout session')
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-t-4 border-yellow-400 border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg flex-1">Subscription</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Current status banner */}
        {isActive && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
            {status === 'trialing' && trialEnd
              ? `Free trial active — ends ${formatDate(trialEnd)}`
              : cancelAtPeriodEnd
              ? `Subscription ends ${formatDate(currentPeriodEnd)}`
              : `Active — renews ${formatDate(currentPeriodEnd)}`}
          </div>
        )}

        {(status === 'past_due' || status === 'unpaid') && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            Your last payment failed. Please update your payment method to keep access.
          </div>
        )}

        {status === 'canceled' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            Your subscription has ended. Resubscribe below to add new learners.
          </div>
        )}

        {/* Pricing card */}
        {!isActive && (
          <>
            {/* Interval toggle */}
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
              <button
                onClick={() => setInterval('monthly')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  interval === 'monthly' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  interval === 'yearly' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly <span className="text-xs text-green-700 font-semibold">Save 17%</span>
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
              <div>
                <div className="text-4xl font-bold text-gray-900">
                  {interval === 'monthly' ? '£4.99' : '£49.99'}
                  <span className="text-base font-normal text-gray-500 ml-1">
                    / {interval === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {interval === 'yearly' && (
                  <p className="text-sm text-gray-500 mt-1">That's £4.17/month</p>
                )}
                <p className="text-sm text-green-700 font-medium mt-2">30-day free trial — no card charged until then</p>
              </div>

              <ul className="space-y-2.5">
                {[
                  'Up to 15 active learners per month',
                  'Unlimited questionnaire imports',
                  'AI-powered key notes',
                  'Cloud sync across devices',
                  'Word & PDF export',
                  'Cancel anytime',
                ].map(feature => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                onClick={() => void handleSubscribe()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 rounded-xl font-semibold transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Redirecting to Stripe...' : 'Start free trial'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Secure payment via Stripe. Cancel anytime.
              </p>
            </div>
          </>
        )}

        {/* Already subscribed — manage via Stripe portal (future) */}
        {isActive && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Manage your subscription</p>
            <p className="text-sm text-gray-600">
              To cancel or update your payment method, contact support or visit the Stripe customer portal.
            </p>
            <button
              onClick={() => void refresh()}
              className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
            >
              Refresh subscription status
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
