// POST /api/debate/start — Claude challenges the user's claim (also used for each turn)
import { NextRequest, NextResponse } from 'next/server'
import { claudeJSON, HAIKU, getCachedResponse, setCachedResponse } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

type DebateTurn = { role: 'user' | 'claude'; text: string }
type DebateReply = { claudeResponse: string; questionToUser: string }

// Fix 2: static instructions (cacheable). Claim/topic/history go in the user message.
const DEBATE_SYSTEM = `You are an expert debater who respectfully challenges a student's claim about a topic.
Ask probing questions, present counterarguments, cite relevant concepts. Keep responses to 2-3 paragraphs. Do NOT tell them the answer — make them think.
Return ONLY JSON: { "claudeResponse": string, "questionToUser": string }`

export async function POST(req: NextRequest) {
  const { topicName, claim, turns, mastery } = await req.json()
  if (!topicName || !claim) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const isOpening = !Array.isArray(turns) || turns.length === 0

  // Fix 2/7: cache the OPENING challenge by (topic + claim). 180-day TTL.
  if (isOpening) {
    const cacheKey = { route: 'debate/start', topic: topicName.toLowerCase().trim(), claim: claim.toLowerCase().trim() }
    const cached = await getCachedResponse<DebateReply>('debate/start', cacheKey)
    if (cached) return NextResponse.json(cached)

    // Rate limit + cap only on a real (uncached) opening
    const cap = await checkMonthlyCap()
    if (cap.overCap) return NextResponse.json({ error: 'Monthly budget reached. Debate paused until next month.', overCap: true }, { status: 429 })
    const rl = await checkRateLimit('debate/start')
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached (10/day).', resetAt: rl.resetAt }, { status: 429 })
  }

  // Fix 2: trimmed context — topic, position, mastery, and only the recent turns
  const history = !isOpening
    ? '\nConversation so far:\n' + (turns as DebateTurn[]).slice(-6).map(t => `${t.role === 'user' ? 'User' : 'You'}: ${t.text}`).join('\n')
    : ''
  const userMsg = `Topic: "${topicName}". User's position: "${claim}". User mastery: ${mastery ?? 'unknown'}/5.${history}
${isOpening ? "Begin challenging the user's claim." : 'Continue the debate with your next challenge.'}`

  try {
    const reply = await claudeJSON<DebateReply>({
      system: DEBATE_SYSTEM,
      user: userMsg,
      model: HAIKU,          // Fix 9: conversational Q&A → Haiku
      cacheSystem: true,     // Fix 2: prompt caching
      route: 'debate/start',
      maxTokens: 1024,
    })
    // Persist opening challenge to cache for reuse across sessions
    if (isOpening) {
      const cacheKey = { route: 'debate/start', topic: topicName.toLowerCase().trim(), claim: claim.toLowerCase().trim() }
      await setCachedResponse('debate/start', cacheKey, reply, 180 * 24 * 60 * 60 * 1000)
    }
    return NextResponse.json(reply)
  } catch (err) {
    console.error('Debate start error:', err)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
