// POST /api/socratic/score — score the Socratic session, bump mastery
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON } from '@/lib/claude'
import { cascadeUnlock } from '@/lib/unlock'
import { incrementMastery, getNextReviewDate, getReviewIntervalDays } from '@/lib/spacedRepetition'

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
    result = await claudeJSON<SocraticScore>({ system, user: 'Score this session.', maxTokens: 1024 })
  } catch (err) {
    console.error('Socratic score error:', err)
    return NextResponse.json({ error: 'Failed to score' }, { status: 500 })
  }

  await prisma.socraticSession.create({
    data: { skillNodeId, turns: (turns ?? []) as Prisma.InputJsonValue, sessionScore: result.score },
  })

  // Socratic: +0.5 if >=70, +1.0 if >=85
  let newMasteryLevel: number | null = null
  const delta = result.score >= 85 ? 1.0 : result.score >= 70 ? 0.5 : 0
  if (delta > 0) {
    const node = await prisma.skillNode.findUnique({ where: { id: skillNodeId }, select: { masteryLevel: true } })
    if (node && node.masteryLevel < 5) {
      const newLevel = incrementMastery(node.masteryLevel, delta)
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

  return NextResponse.json({ ...result, newMasteryLevel })
}
