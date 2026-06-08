// POST /api/debate/start — Claude challenges the user's claim (also used for each turn)
import { NextRequest, NextResponse } from 'next/server'
import { claudeJSON } from '@/lib/claude'

type DebateTurn = { role: 'user' | 'claude'; text: string }
type DebateReply = { claudeResponse: string; questionToUser: string }

export async function POST(req: NextRequest) {
  const { topicName, claim, turns } = await req.json()
  if (!topicName || !claim) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const history = Array.isArray(turns) && turns.length
    ? '\n\nConversation so far:\n' + (turns as DebateTurn[]).map(t => `${t.role === 'user' ? 'User' : 'You'}: ${t.text}`).join('\n')
    : ''

  const system = `The user claims: "${claim}" regarding "${topicName}".
You are an expert and will respectfully challenge them. Ask probing questions, present counterarguments, cite relevant concepts. Keep responses to 2-3 paragraphs. Do NOT tell them the answer — make them think.${history}
Return ONLY JSON: { "claudeResponse": string, "questionToUser": string }`

  try {
    const reply = await claudeJSON<DebateReply>({
      system,
      user: turns?.length ? 'Continue the debate with your next challenge.' : 'Begin challenging the user\'s claim.',
      maxTokens: 1024,
    })
    return NextResponse.json(reply)
  } catch (err) {
    console.error('Debate start error:', err)
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 })
  }
}
