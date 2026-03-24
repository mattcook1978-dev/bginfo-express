import type { Context } from '@netlify/functions'

const SYSTEM_PROMPT = `You are determining question types for a dyslexia assessment questionnaire.

Available question types:
- yes_no: simple yes/no question
- yes_no_notsure: yes/no/not sure
- yes_no_notsure_prefernot: yes/no/not sure/prefer not to say
- single_choice: one answer chosen from multiple options (e.g. Often/Sometimes/Never)
- multi_choice: multiple answers can be selected
- free_text: open-ended written response

You will receive an array of {"uid": "...", "text": "..."} objects.
Return a JSON array of {"uid": "...", "type": "...", "options": [...]} — one entry per input.

Return ONLY a valid JSON array (no markdown fences, no explanation):
[
  {"uid": "abc-123", "type": "yes_no", "options": []},
  {"uid": "def-456", "type": "single_choice", "options": ["Often", "Sometimes", "Never"]}
]

Rules:
- Return exactly one entry per input uid — use the uid from the input exactly, do not skip any
- ANNOTATION RULE (highest priority): if the text ends with [X/Y/Z] (e.g. "Are you easily distracted? [Often/Sometimes/Never]"), set type to single_choice and options to the values split by "/"
- "Please describe / explain / provide details" → free_text
- Questions where "not sure" is clearly a valid answer → yes_no_notsure
- Questions about sensitive topics where "prefer not to say" is appropriate → yes_no_notsure_prefernot
- Questions listing multiple selectable items → multi_choice
- Open-ended written response → free_text
- If unclear, default to yes_no
- Return ONLY the JSON array`

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — API key missing' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let questions: unknown
  try {
    const body = await req.json() as { questions?: unknown }
    questions = body.questions
    if (!questions) throw new Error('Missing questions')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Classify each question:\n\n${JSON.stringify(questions, null, 2)}`,
      }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error (detect-types):', err)
    return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = claudeRes.body!.getReader()
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') { controller.close(); return }
            try {
              const event = JSON.parse(data) as { type: string; delta?: { type: string; text: string } }
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                controller.enqueue(new TextEncoder().encode(event.delta.text))
              }
            } catch { /* skip malformed SSE lines */ }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
