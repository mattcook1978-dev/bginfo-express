import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { getStore } from '@netlify/blobs'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return new Response('Unauthorised', { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return new Response('Unauthorised', { status: 401 })

  const store = getStore('assessor-data')
  const data = await store.get(`subscription-${user.id}`, { type: 'json' }) as {
    status?: string
    currentPeriodEnd?: string
    trialEnd?: string
    cancelAtPeriodEnd?: boolean
  } | null

  if (!data?.status) {
    return new Response(JSON.stringify({ status: 'none' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({
    status: data.status,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
    trialEnd: data.trialEnd ?? null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/subscription-status' }
