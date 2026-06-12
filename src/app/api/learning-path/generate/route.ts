// POST /api/learning-path/generate — Claude-generated learning path.
// Cost-tuned: Haiku, index-based topic references (no UUID echoing), no edge
// list, small output cap, and 90-day response cache keyed by goal+subject.
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU, getCachedResponse, setCachedResponse } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

type GenTopic = { skillNodeId: string; topicName: string; estimatedHours: number; why: string }
type GenResult = {
  pathName: string
  topics: GenTopic[]
  totalHours: number
  suggestedWeeklyHours: number
  prerequisiteWarnings?: string[]
}
// What Claude returns — references topics by [index], not UUID.
type ClaudeResult = {
  pathName: string
  topics: { i: number; estimatedHours: number; why: string }[]
  totalHours: number
  suggestedWeeklyHours: number
  prerequisiteWarnings?: string[]
}

const PATH_SYSTEM = `You are an expert curriculum designer. From the provided topics (each shown as "[index] name (tier T, mastery M/5)"), build a focused learning path toward the user's goal.
Return ONLY JSON: { "pathName": string, "topics": [{ "i": number (the topic's index), "estimatedHours": number, "why": "<=12 words" }], "totalHours": number, "suggestedWeeklyHours": number, "prerequisiteWarnings": string[] }.
Order by dependency (lower tiers first). Choose 6-12 of the most relevant topics; skip ones already mastered (mastery >= 4). Be realistic about hours.`

export async function POST(req: NextRequest) {
  const { goal, subject, weeks } = await req.json()
  if (!goal || !subject) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Compact, index-based tree — no UUIDs, no edge list (tiers convey ordering).
  const nodes = await prisma.skillNode.findMany({
    where: { subject },
    select: { id: true, name: true, masteryLevel: true, tier: true },
    orderBy: [{ tier: 'asc' }, { name: 'asc' }],
  })
  if (nodes.length === 0) return NextResponse.json({ error: 'No topics for this subject' }, { status: 400 })
  const indexedTree = nodes.map((n, i) => `[${i}] ${n.name} (tier ${n.tier}, mastery ${n.masteryLevel})`).join('\n')

  // Response cache keyed by goal+subject (+ tree size). 90-day TTL → repeat = free.
  const cacheKey = { route: 'learning-path/generate', goal: goal.toLowerCase().trim(), subject, treeHash: nodes.length }
  let result = await getCachedResponse<GenResult>('learning-path/generate', cacheKey)

  if (!result) {
    const cap = await checkMonthlyCap()
    if (cap.overCap) return NextResponse.json({ error: 'Monthly budget reached. Learning-path generation paused until next month.', overCap: true }, { status: 429 })
    const rl = await checkRateLimit('learning-path/generate')
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached (5/day). Try again tomorrow.', resetAt: rl.resetAt }, { status: 429 })

    const userMsg = `Goal: "${goal}" in ${subject}. Weeks available: ${weeks ?? 12}.
Topics:\n${indexedTree}`

    try {
      const c = await claudeJSON<ClaudeResult>({
        system: PATH_SYSTEM,
        user: userMsg,
        model: HAIKU,                     // 3× cheaper than Sonnet
        cacheSystem: true,
        route: 'learning-path/generate',
        maxTokens: 1200,                  // short, index-based output
      })
      const topics: GenTopic[] = (c.topics ?? [])
        .map(t => {
          const n = nodes[t.i]
          return n ? { skillNodeId: n.id, topicName: n.name, estimatedHours: t.estimatedHours ?? 5, why: t.why ?? '' } : null
        })
        .filter((t): t is GenTopic => t !== null)
      if (topics.length === 0) return NextResponse.json({ error: 'No valid topics generated' }, { status: 500 })

      result = {
        pathName: c.pathName || goal,
        topics,
        totalHours: c.totalHours ?? topics.reduce((s, t) => s + t.estimatedHours, 0),
        suggestedWeeklyHours: c.suggestedWeeklyHours ?? 8,
        prerequisiteWarnings: c.prerequisiteWarnings ?? [],
      }
      await setCachedResponse('learning-path/generate', cacheKey, result, 90 * 24 * 60 * 60 * 1000)
    } catch (err) {
      console.error('Learning path generation error:', err)
      return NextResponse.json({ error: 'Failed to generate learning path' }, { status: 500 })
    }
  }

  const estimatedHours: Record<string, number> = {}
  for (const t of result.topics) estimatedHours[t.skillNodeId] = t.estimatedHours

  const path = await prisma.learningPath.create({
    data: {
      name: result.pathName || goal,
      subject,
      goalDescription: goal,
      topics: result.topics.map(t => t.skillNodeId) as Prisma.InputJsonValue,
      estimatedHours: estimatedHours as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({
    path,
    detail: {
      topics: result.topics,
      totalHours: result.totalHours,
      suggestedWeeklyHours: result.suggestedWeeklyHours,
      prerequisiteWarnings: result.prerequisiteWarnings ?? [],
    },
  })
}
