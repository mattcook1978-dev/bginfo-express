import type { Context } from '@netlify/functions'

const SYSTEM_PROMPT = `You are generating a keyPointsBank for a dyslexia assessment report-writing app.

Given a list of questionnaire sections and questions, return ONLY a valid JSON object with this exact shape (no markdown fences, no explanation):
{
  "keyPointsBank": {
    "1.1": {
      "topic": "brief topic description (4-7 words)",
      "yes": "Clinical note when answered yes.",
      "no": "Clinical note when answered no."
    }
  }
}

PHRASING RULES — follow these exactly:

Topic:
- Lowercase noun phrase, 4–7 words, no full stop
- e.g. "fine motor skills", "hearing test history", "family history of reading difficulties"

Yes note:
- State the positive finding as a plain fact. End with a full stop.
- For self-reported concerns: end with "reported" — e.g. "Concerns about fine motor skills reported."
- For factual events: use past tense — e.g. "Speech and language therapy was received.", "Hearing test carried out previously."
- For professional contact: "Seen by a professional regarding [topic]."
- Use parenthetical examples where helpful — e.g. "(e.g. walking, balance, general coordination)"

No note:
- Mirror the yes note but negate it. End with a full stop.
- e.g. "No concerns about fine motor skills.", "No history of a hearing test.", "Not seen by any professional regarding [topic]."

not_sure note (include as "not_sure" key when question type is yes_no_notsure or yes_no_notsure_prefernot):
- Short topic phrase + space dash space + "uncertain." — e.g. "Family history of mathematics difficulties — uncertain."

prefer_not_to_say note (include as "prefer_not_to_say" key when question type is yes_no_notsure_prefernot):
- Short topic phrase + space dash space + "preferred not to say." — e.g. "Mental health history — preferred not to say."

Never use a subject pronoun — no "He/She/They reported..." or "The learner said..." — just the fact.

QUESTION TYPE RULES:

yes_no: include "yes" and "no" keys
yes_no_notsure: include "yes", "no", and "not_sure" keys
yes_no_notsure_prefernot: include "yes", "no", "not_sure", and "prefer_not_to_say" keys

single_choice: use "single_prefix" only — a short label, the selected answer appends automatically
  e.g. { "topic": "hearing test outcome", "single_prefix": "Hearing test outcome" }
  e.g. { "topic": "date of last sight test", "single_prefix": "Last sight test or eye test" }

multi_choice: use "multi_prefix" and "multi_none"
  multi_prefix: short phrase preceding the list of selected items — e.g. "Reported difficulties with"
  multi_none: what appears when nothing is selected — e.g. "No difficulties with planning or organisation reported."

free_text: use "free_text_prefix" only — a short label that precedes the quoted answer
  e.g. { "topic": "strengths and interests", "free_text_prefix": "Strengths and interests" }
  e.g. { "topic": "own account of main difficulties", "free_text_prefix": "Own account of main difficulties" }

IMPORTANT:
- The questions array is a flat list — every item is a question that needs an entry
- Use the question's "id" field exactly as given as the key for that entry — do not renumber
- Include an entry for EVERY question in the list — yes/no, choice, and free_text alike
- An unanswered question still appears as "No information provided regarding [topic]." — so every question needs a topic
- Return ONLY the JSON object`

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — API key missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sections: unknown
  try {
    const body = await req.json() as { sections?: unknown }
    sections = body.sections
    if (!sections) throw new Error('Missing sections')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
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
      max_tokens: 8192,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Generate the keyPointsBank for these questions:\n\n${JSON.stringify(sections)}` }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error:', err)
    return new Response(JSON.stringify({ error: 'AI key points service unavailable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
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

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
