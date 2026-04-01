import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStore } from '@netlify/blobs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return new Response('Unauthorised', { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return new Response('Unauthorised', { status: 401 })

  const { priceId } = await req.json() as { priceId: string }
  if (!priceId) return new Response('Missing priceId', { status: 400 })

  // Get or create Stripe customer
  const store = getStore('assessor-data')
  const subKey = `subscription-${user.id}`
  const existing = await store.get(subKey, { type: 'json' }) as { stripeCustomerId?: string } | null

  let customerId = existing?.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    // Save customer ID immediately so webhook can map back to user
    await store.set(subKey, JSON.stringify({ ...existing, stripeCustomerId: customerId }))
    await store.set(`stripe-customer-${customerId}`, JSON.stringify({ userId: user.id }))
  }

  const origin = req.headers.get('origin') ?? 'https://localhost:5200'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    allow_promotion_codes: true,
    payment_method_collection: 'if_required',
    subscription_data: {
      trial_period_days: 30,
      metadata: { userId: user.id },
    },
    success_url: `${origin}/?subscription=success`,
    cancel_url: `${origin}/?subscription=cancelled`,
    metadata: { userId: user.id },
  })

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/create-checkout-session' }
