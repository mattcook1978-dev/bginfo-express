import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // Verify Supabase JWT
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  let body: { description?: string }
  try {
    body = await req.json() as typeof body
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  if (!body.description?.trim()) {
    return new Response(JSON.stringify({ error: 'Description is required' }), { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'QUsable <noreply@qusable.com>',
      to: ['mattcook1978@gmail.com'],
      subject: `Custom questionnaire request from ${user.email}`,
      text: `A custom questionnaire request has been submitted.\n\nFrom: ${user.email}\n\n---\n\n${body.description.trim()}`,
    }),
  })

  if (!emailRes.ok) {
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
