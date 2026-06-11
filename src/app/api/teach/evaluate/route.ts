// POST /api/teach/evaluate — evaluate a user's teaching explanation
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'
import { applyMasteryGain, teachDebateDelta } from '@/lib/mastery'

type TeachEval = {
  clarity: number
  completeness: number
  misconceptions: { statement: string; correction: string }[]
  overallScore: number
  feedback: string
  suggestedImprovements: string[]
}

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, explanation } = await req.json()
  if (!skillNodeId || !topicName || !explanation) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Fix 2: static system (cacheable); topic + explanation go in the user message
  const system = `You evaluate a student's teaching explanation. Evaluate on: 1) Clarity (is it understandable?), 2) Completeness (did they cover key points?), 3) Misconceptions (did they say anything incorrect?).
Return ONLY JSON: { "clarity": 1-5, "completeness": 1-5, "misconceptions": [{ "statement": string, "correction": string }], "overallScore": 0-100, "feedback": string (2-3 sentences), "suggestedImprovements": string[] }`

  const userMsg = `Topic: "${topicName}". Student's explanation:
"""${explanation}"""`

  let evaluation: TeachEval
  try {
    evaluation = await claudeJSON<TeachEval>({ system, user: userMsg, model: HAIKU, cacheSystem: true, route: 'teach/evaluate', maxTokens: 1000 })
  } catch (err) {
    console.error('Teach eval error:', err)
    return NextResponse.json({ error: 'Failed to evaluate' }, { status: 500 })
  }

  const session = await prisma.teachSession.create({
    data: {
      skillNodeId, userExplanation: explanation,
      claudeEvaluation: evaluation as unknown as Prisma.InputJsonValue,
      feedback: evaluation.feedback,
    },
  })

  // PART 3: teach deltas (70-79→+0.5, 80-89→+0.75, 90-100→+1.0), 4.0 cap
  let newMasteryLevel: number | null = null
  let capped = false
  const delta = teachDebateDelta(evaluation.overallScore)
  if (delta > 0) {
    const res = await applyMasteryGain({ skillNodeId, eventType: 'teach', score: evaluation.overallScore, delta })
    newMasteryLevel = res.newMasteryLevel
    capped = res.capped
  }

  return NextResponse.json({ session, evaluation, newMasteryLevel, capped })
}
