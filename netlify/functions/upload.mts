import { getStore } from '@netlify/blobs'
import type { Context } from '@netlify/functions'

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let body: Record<string, unknown>
  try {
    body = await req.json() as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.codeHash || !body.encryptedResponses || !body.salt) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

  const store = getStore({ name: 'responses', consistency: 'strong' })
  await store.setJSON(id, { data: body, expiresAt })

  return new Response(JSON.stringify({ id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
