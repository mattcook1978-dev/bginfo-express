import type { Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function getUser(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user ?? null
}

export default async function handler(req: Request, context: Context) {
  const user = await getUser(req)
  if (!user) return new Response('Unauthorised', { status: 401 })

  const store = getStore('assessor-data')
  const key = `user-${user.id}`

  // GET — download encrypted blob
  if (req.method === 'GET') {
    const blob = await store.get(key, { type: 'json' }) as { encryptedData: string; updatedAt: string } | null
    if (!blob) return new Response(JSON.stringify({ exists: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
    return new Response(JSON.stringify({ exists: true, ...blob }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // PUT — upload encrypted blob
  if (req.method === 'PUT') {
    const body = await req.json() as { encryptedData: string; updatedAt: string }
    await store.set(key, JSON.stringify(body))
    return new Response('OK', { status: 200 })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config = { path: '/api/sync' }
