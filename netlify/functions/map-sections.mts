import type { Context } from '@netlify/functions'

const SYSTEM_PROMPT = `You are analysing a dyslexia assessment questionnaire.

Map every question to one of these 6 report sections using the following priority order:

1. SOURCE SECTION HEADING — Many questionnaires are already structured in an order that mirrors the 6 report sections. If the input contains section headings (e.g. "Medical History", "Family Background", "Current Difficulties"), treat all questions under that heading as belonging to the matching report section. Only move a question away from its source section if its topic clearly belongs elsewhere.
2. QUESTION TOPIC — If there is no clear source heading, assign based on the topic descriptions below.
3. SURROUNDING CONTEXT — If the topic is still ambiguous, place the question in the same section as the questions around it.

1. bg-health: "Health and Developmental History"
Covers early, historical or persistent difficulties relevant to the investigation of a SpLD. Topics include:
- Speech, language and communication, including social interaction
- Fine and gross motor coordination
- Vision, including confirmation and outcome of a recent sight test and any relevant prior history; any indicators of visual discomfort and disturbance (e.g. words moving, blurring, or causing discomfort when reading); administration of a Visual History or Visual Difficulties Questionnaire
- Hearing, including outcomes of any hearing tests
- Attentional difficulties
- Other relevant diagnoses or referrals
- Prematurity, birth, pre- and neo-natal complications
- Medical issues and medication
- Mental health issues and medication
- Adverse Childhood Experiences (ACE)

2. bg-family: "Family History of SpLD or Other Developmental Condition(s)"
Questions about close family history of persistent literacy, mathematics or other learning difficulties, including named SpLDs and/or developmental conditions (e.g. dyslexia, ADHD, autism, neurodiversity). SpLDs are known to run in families.

3. bg-linguistic: "Linguistic History"
English as an additional language, bilingualism, or complex linguistic history. Topics include:
- Languages spoken in early childhood and currently at home
- Length of time in the UK or an English-speaking country
- Language in which the individual was educated
- Difficulties with language, literacy or mathematics learning in a first language
- Which language the individual currently considers dominant

4. bg-educational: "Educational and, if Relevant, Work History"
Experiences within the educational and/or workplace environment that constitute risk or protective factors for SpLD. Topics include:
- Consistent access to the school curriculum, including historical attendance levels
- Number of schools attended
- The impact of the Covid-19 pandemic on education
- Results of phonics checks or similar end-of-year/phase assessments
- Learning support and other interventions (statutory and non-statutory)
- SEND status and any additional statutory provision
- Any previous assessments and/or access arrangements
- Educational attainments, qualifications and work experience
- Subject or activity-specific anxiety

5. bg-current: "Current Situation and Individual's Voice"
What is going well and what difficulties currently exist, drawing on the individual's own voice alongside parent/carer/teacher perspectives. Topics include:
- Current literacy: reading fluency, accuracy and comprehension, writing and spelling
- Arithmetic and general mathematics attainment; targeted interventions in place and the individual's response
- Current planning, memory, attention, impulsivity, or other strengths and difficulties in learning and the management of daily activity
- Current issues in articulation, understanding questions and instructions, understanding and using vocabulary, understanding non-literal language, oral expression and word-finding
- The individual's own perception of their strengths and achievements
- Views of parents, carers, teachers or other adults who know them well

6. bg-further: "Further Information, as Relevant to the Assessment"
Anything that does not clearly fit any of the above 5 sections.

Return ONLY a valid JSON array (no markdown fences, no explanation):
[
  {
    "headingId": "bg-health",
    "heading": "Health and Developmental History",
    "questions": [
      "Have you suffered from any illnesses or accidents?",
      "If yes: Please provide details",
      "Are you currently taking medication?"
    ]
  }
]

Rules:
- Include ALL questions — do not skip any
- Each question is a plain string in the questions array
- For conditional follow-up questions, prefix the text with the condition: "If yes: ..." or "If no: ..." or "If [answer]: ..."
- Strip formatting noise: checkboxes, boilerplate instructions (Please answer the following, Please note, Please circle one, Please tick)
- Do not include answer options — EXCEPT keep any trailing [X/Y/Z] annotation (see below)
- Use the 6 headingId values exactly as listed above
- Only include a section in the output if it has at least one question
- Assignment priority: source section heading → question topic → surrounding context (last resort only)

RATING TABLE FORMAT — the input may contain tables already converted to this format:
[RATING TABLE: Often | Sometimes | Never]
Are you easily distracted? [Often/Sometimes/Never]
Do you find you can only work for short periods? [Often/Sometimes/Never]
[END TABLE]

Rules for RATING TABLE blocks:
- Each line inside the block is a SEPARATE question — output each one individually
- KEEP the trailing [X/Y/Z] annotation exactly as-is on each question string — do not strip it
- Map each question to whichever of the 6 sections fits its content

Return ONLY the JSON array, nothing else`

export default async function handler(req: Request, _ctx: Context) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured — API key missing' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let text: string
  try {
    const body = await req.json() as { text?: string }
    text = body.text ?? ''
    if (!text) throw new Error('Missing text')
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
      max_tokens: 8192,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Map the questions from this questionnaire:\n\n${text}` }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error (map-sections):', err)
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
