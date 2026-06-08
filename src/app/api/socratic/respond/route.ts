// POST /api/socratic/respond — next Socratic question
import { NextRequest, NextResponse } from 'next/server'
import { claudeJSON, HAIKU, getCachedResponse, setCachedResponse } from '@/lib/claude'

type Turn = { role: 'user' | 'claude'; text: string }
type SocraticReply = { question: string; hints: string[] }

// Fix 5: static instructions (cacheable). Topic + recent turns go in the user message.
const SOCRATIC_SYSTEM = `You are a Socratic tutor. Guide the user to understanding through questions, NOT by explaining.
Ask progressively harder questions. When they give wrong answers, ask follow-up questions to help them see the error themselves. Never just tell them the answer.
After many exchanges (10+), ask them to summarize what they learned.
Return ONLY JSON: { "question": string, "hints": [string, string] }`

export async function POST(req: NextRequest) {
  const { topicName, turns } = await req.json()
  if (!topicName) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })

  const allTurns = (turns as Turn[]) ?? []
  const exchangeCount = allTurns.filter(t => t.role === 'user').length

  // Fix 5/7: cache the OPENING question per topic (it's near-identical). 180-day TTL.
  if (exchangeCount === 0) {
    const cacheKey = { route: 'socratic/respond', topic: topicName.toLowerCase().trim() }
    const cached = await getCachedResponse<SocraticReply>('socratic/respond', cacheKey)
    if (cached) return NextResponse.json(cached)
  }

  // Fix 5: trim — only the recent turns, not the whole transcript
  const history = allTurns.slice(-8).map(t => `${t.role === 'user' ? 'User' : 'Tutor'}: ${t.text}`).join('\n')
  const userMsg = `Topic: "${topicName}". Exchange #${exchangeCount + 1}.
${exchangeCount === 0 ? `Open by asking what they already know about ${topicName}.` : `Recent conversation:\n${history}`}`

  try {
    const reply = await claudeJSON<SocraticReply>({
      system: SOCRATIC_SYSTEM,
      user: userMsg,
      model: HAIKU,          // Fix 9: interactive tutoring → Haiku
      cacheSystem: true,     // Fix 5: prompt caching
      route: 'socratic/respond',
      maxTokens: 800,
    })
    if (exchangeCount === 0) {
      const cacheKey = { route: 'socratic/respond', topic: topicName.toLowerCase().trim() }
      await setCachedResponse('socratic/respond', cacheKey, reply, 180 * 24 * 60 * 60 * 1000)
    }
    return NextResponse.json(reply)
  } catch (err) {
    console.error('Socratic respond error:', err)
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 })
  }
}
