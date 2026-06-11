// POST /api/debate/score — score the debate, save session, bump mastery
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, teachDebateDelta } from '@/lib/mastery'

type DebateTurn = { role: 'user' | 'claude'; text: string }
type DebateScore = { score: number; verdict: 'strong' | 'good' | 'fair' | 'weak'; strengths: string[]; areasToImprove: string[] }

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, claim, turns } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const transcript = (turns as DebateTurn[] ?? []).map(t => `${t.role === 'user' ? 'User' : 'Claude'}: ${t.text}`).join('\n')

  const system = `Score the user's debate performance on "${topicName}" (0-100): Did they defend their position? Did they incorporate feedback? Did they show understanding of nuance?
Initial claim: "${claim}"
Transcript:
${transcript}
Return ONLY JSON: { "score": number, "verdict": "strong"|"good"|"fair"|"weak", "strengths": string[], "areasToImprove": string[] }`

  let scoreResult: DebateScore
  try {
    scoreResult = await claudeJSON<DebateScore>({ system, user: 'Score this debate.', model: HAIKU, route: 'debate/score', maxTokens: 700 })
  } catch (err) {
    console.error('Debate score error:', err)
    return NextResponse.json({ error: 'Failed to score' }, { status: 500 })
  }

  await prisma.debateSession.create({
    data: {
      skillNodeId, position: claim,
      turns: (turns ?? []) as Prisma.InputJsonValue,
      score: scoreResult.score, verdict: scoreResult.verdict,
    },
  })

  // PART 3: debate deltas (70-79→+0.5, 80-89→+0.75, 90-100→+1.0), 4.0 cap
  let newMasteryLevel: number | null = null
  let capped = false
  const delta = teachDebateDelta(scoreResult.score)
  if (delta > 0) {
    const res = await applyMasteryGain({ skillNodeId, eventType: 'debate', score: scoreResult.score, delta })
    newMasteryLevel = res.newMasteryLevel
    capped = res.capped
  }

  return NextResponse.json({ ...scoreResult, newMasteryLevel, capped })
}
