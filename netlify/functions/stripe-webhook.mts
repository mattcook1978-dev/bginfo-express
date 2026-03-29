import type { Context } from '@netlify/functions'
import Stripe from 'stripe'
import { getStore } from '@netlify/blobs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const store = getStore('assessor-data')
  const mapping = await store.get(`stripe-customer-${customerId}`, { type: 'json' }) as { userId: string } | null
  if (mapping?.userId) return mapping.userId
  // Fallback: retrieve metadata direct from Stripe
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) return null
  return (customer as Stripe.Customer).metadata?.userId ?? null
}

async function saveSubscription(userId: string, data: object) {
  const store = getStore('assessor-data')
  const key = `subscription-${userId}`
  const existing = await store.get(key, { type: 'json' }) as object | null
  await store.set(key, JSON.stringify({ ...(existing ?? {}), ...data }))
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const store = getStore('assessor-data')

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.userId
    if (!userId) return new Response('OK', { status: 200 })

    // Save reverse mapping so future subscription events can find the user
    if (session.customer) {
      await store.set(`stripe-customer-${session.customer}`, JSON.stringify({ userId }))
    }

    await saveSubscription(userId, {
      stripeCustomerId: session.customer,
      subscriptionId: session.subscription,
      status: 'trialing',
    })
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as Stripe.Subscription
    const userId = await getUserIdFromCustomer(sub.customer as string)
    if (!userId) return new Response('OK', { status: 200 })

    await saveSubscription(userId, {
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    })
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = await getUserIdFromCustomer(sub.customer as string)
    if (!userId) return new Response('OK', { status: 200 })

    await saveSubscription(userId, {
      status: 'canceled',
      cancelAtPeriodEnd: false,
    })
  }

  return new Response('OK', { status: 200 })
}

export const config = { path: '/api/stripe-webhook' }
