import { getStore } from '@netlify/blobs'
import type { Context } from '@netlify/functions'

export default async function handler(req: Request, _ctx: Context) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const store = getStore({ name: 'responses', consistency: 'strong' })

  // DELETE — called by assessor app after successful import
  if (req.method === 'DELETE') {
    await store.delete(id)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 })

  const entry = await store.get(id, { type: 'json' }) as { data: unknown; expiresAt: string } | null

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (new Date(entry.expiresAt) < new Date()) {
    await store.delete(id)
    return new Response(JSON.stringify({ error: 'Expired' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(entry.data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
