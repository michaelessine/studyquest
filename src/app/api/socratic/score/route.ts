// POST /api/socratic/score — score the Socratic session, bump mastery
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, teachDebateDelta } from '@/lib/mastery'

type Turn = { role: 'user' | 'claude'; text: string }
type SocraticScore = { score: number; insights: string; gaps: string; nextStepRecommendation: string }

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, turns } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const transcript = (turns as Turn[] ?? []).map(t => `${t.role === 'user' ? 'User' : 'Tutor'}: ${t.text}`).join('\n')

  const system = `Score this Socratic session (0-100) based on the user's engagement, understanding shown, and ability to self-correct.
Topic: ${topicName}
Transcript:
${transcript}
Return ONLY JSON: { "score": number, "insights": string, "gaps": string, "nextStepRecommendation": string }`

  let result: SocraticScore
  try {
    result = await claudeJSON<SocraticScore>({ system, user: 'Score this session.', model: HAIKU, route: 'socratic/score', maxTokens: 1024 })
  } catch (err) {
    console.error('Socratic score error:', err)
    return NextResponse.json({ error: 'Failed to score' }, { status: 500 })
  }

  await prisma.socraticSession.create({
    data: { skillNodeId, turns: (turns ?? []) as Prisma.InputJsonValue, sessionScore: result.score },
  })

  // PART 3: socratic uses the teach/debate delta table, 4.0 cap (logged as 'teach')
  let newMasteryLevel: number | null = null
  let capped = false
  const delta = teachDebateDelta(result.score)
  if (delta > 0) {
    const res = await applyMasteryGain({ skillNodeId, eventType: 'teach', score: result.score, delta })
    newMasteryLevel = res.newMasteryLevel
    capped = res.capped
  }

  return NextResponse.json({ ...result, newMasteryLevel, capped })
}
