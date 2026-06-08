// POST /api/socratic/respond — next Socratic question
import { NextRequest, NextResponse } from 'next/server'
import { claudeJSON } from '@/lib/claude'

type Turn = { role: 'user' | 'claude'; text: string }
type SocraticReply = { question: string; hints: string[] }

export async function POST(req: NextRequest) {
  const { topicName, turns } = await req.json()
  if (!topicName) return NextResponse.json({ error: 'Missing topic' }, { status: 400 })

  const history = (turns as Turn[] ?? []).map(t => `${t.role === 'user' ? 'User' : 'Tutor'}: ${t.text}`).join('\n')
  const exchangeCount = (turns as Turn[] ?? []).filter(t => t.role === 'user').length

  const system = `You are a Socratic tutor for "${topicName}". Your goal is to guide the user to understanding through questions, NOT by explaining.
${exchangeCount === 0 ? "Start by asking: 'What do you already know about " + topicName + "?'" : 'Ask progressively harder questions. When they give wrong answers, ask follow-up questions to help them see the error themselves. Never just tell them the answer.'}
${exchangeCount >= 10 ? 'You have had many exchanges — ask them to summarize what they learned.' : ''}
Conversation so far:
${history || '(none yet)'}
Return ONLY JSON: { "question": string, "hints": [string, string] }`

  try {
    const reply = await claudeJSON<SocraticReply>({ system, user: 'Provide your next Socratic question.', maxTokens: 800 })
    return NextResponse.json(reply)
  } catch (err) {
    console.error('Socratic respond error:', err)
    return NextResponse.json({ error: 'Failed to respond' }, { status: 500 })
  }
}
