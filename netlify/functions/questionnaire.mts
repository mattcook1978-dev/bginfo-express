import { getStore } from '@netlify/blobs'
import type { Context } from '@netlify/functions'

export default async function handler(req: Request, _ctx: Context) {
  const url = new URL(req.url)

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const id = url.searchParams.get('id')
    const hash = url.searchParams.get('hash')
    const store = getStore({ name: 'questionnaires', consistency: 'strong' })

    // GET /api/questionnaire?id=<id>  — fetch questionnaire by ID (used by learner returning user)
    if (id) {
      const blob = await store.get(id, { type: 'json' })
      if (!blob) {
        return new Response(JSON.stringify({ error: 'Questionnaire not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(blob), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      })
    }

    // GET /api/questionnaire?hash=<codeHash>  — resolve questionnaire from code hash (used by new learner)
    if (hash) {
      const mapping = await store.get(`mapping:${hash}`, { type: 'json' }) as { questionnaireId: string } | null
      if (!mapping) {
        return new Response(JSON.stringify({ error: 'Code not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const questionnaire = await store.get(mapping.questionnaireId, { type: 'json' })
      if (!questionnaire) {
        return new Response(JSON.stringify({ error: 'Questionnaire not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(questionnaire), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    }

    return new Response(JSON.stringify({ error: 'Missing id or hash parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const secret = req.headers.get('x-bginfo-secret')
    if (!secret || secret !== process.env.BGINFO_PUBLISH_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let body: { type?: string; id?: string; sections?: unknown; keyPointsBank?: unknown; hash?: string; questionnaireId?: string }
    try {
      body = await req.json() as typeof body
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const store = getStore({ name: 'questionnaires', consistency: 'strong' })

    // POST with type: 'mapping'  — save code-hash → questionnaire-id mapping
    if (body.type === 'mapping') {
      if (!body.hash || !body.questionnaireId) {
        return new Response(JSON.stringify({ error: 'Missing required fields: hash, questionnaireId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      await store.setJSON(`mapping:${body.hash}`, { questionnaireId: body.questionnaireId })
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // POST questionnaire  — save questionnaire blob
    if (!body.id || !body.sections) {
      return new Response(JSON.stringify({ error: 'Missing required fields: id, sections' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    await store.setJSON(body.id, body)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response('Method Not Allowed', { status: 405 })
}
