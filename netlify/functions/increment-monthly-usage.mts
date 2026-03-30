import { getStore } from '@netlify/blobs'
import { createClient } from '@supabase/supabase-js'
import type { Context } from '@netlify/functions'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const MONTHLY_LIMIT = 15

function getMonthKey(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return new Response('Unauthorised', { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return new Response('Unauthorised', { status: 401 })

  const store = getStore('assessor-data')
  const monthKey = getMonthKey()
  const blobKey = `monthly-learners-${user.id}-${monthKey}`

  const current = await store.get(blobKey, { type: 'json' }) as { count: number } | null
  const count = current?.count ?? 0

  if (count >= MONTHLY_LIMIT) {
    return new Response(JSON.stringify({ error: 'Monthly limit reached', count, limit: MONTHLY_LIMIT }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const newCount = count + 1
  await store.setJSON(blobKey, { count: newCount })

  return new Response(JSON.stringify({ count: newCount, limit: MONTHLY_LIMIT }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/increment-monthly-usage' }
