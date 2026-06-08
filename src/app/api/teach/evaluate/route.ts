// POST /api/teach/evaluate — evaluate a user's teaching explanation
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON } from '@/lib/claude'
import { cascadeUnlock } from '@/lib/unlock'
import { incrementMastery, getNextReviewDate, getReviewIntervalDays } from '@/lib/spacedRepetition'

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
    evaluation = await claudeJSON<TeachEval>({ system, user: userMsg, cacheSystem: true, route: 'teach/evaluate', maxTokens: 1500 })
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

  // Teach mode: +1.0 mastery if score >= 80
  let newMasteryLevel: number | null = null
  if (evaluation.overallScore >= 80) {
    const node = await prisma.skillNode.findUnique({ where: { id: skillNodeId }, select: { masteryLevel: true } })
    if (node && node.masteryLevel < 5) {
      const newLevel = incrementMastery(node.masteryLevel, 1.0)
      await prisma.skillNode.update({
        where: { id: skillNodeId },
        data: {
          masteryLevel: newLevel, status: newLevel >= 5 ? 'mastered' : 'in_progress',
          masteryUpdatedAt: new Date(),
          nextReviewAt: getNextReviewDate(newLevel), reviewIntervalDays: getReviewIntervalDays(newLevel),
        },
      })
      newMasteryLevel = newLevel
      await cascadeUnlock()
    }
  }

  return NextResponse.json({ session, evaluation, newMasteryLevel })
}
