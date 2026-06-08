// POST /api/learning-path/generate — Claude-generated learning path (Sonnet)
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, SONNET, getCachedResponse, setCachedResponse } from '@/lib/claude'
import { checkRateLimit, checkMonthlyCap } from '@/lib/rateLimit'

type GenTopic = { skillNodeId: string; topicName: string; estimatedHours: number; why: string }
type GenResult = {
  pathName: string
  topics: GenTopic[]
  totalHours: number
  suggestedWeeklyHours: number
  prerequisiteWarnings?: string[]
}

// Fix 2: static instructions (cacheable). Tree + goal go in the user message.
const PATH_SYSTEM = `You are an expert curriculum designer. Based on the provided skill tree, create a learning path toward the user's goal.
Return ONLY JSON: { "pathName": string, "topics": [{ "skillNodeId": string (MUST be a real id from the tree), "topicName": string, "estimatedHours": number, "why": string }], "totalHours": number, "suggestedWeeklyHours": number, "prerequisiteWarnings": string[] }.
Order topics by logical dependency (prerequisites first). Be realistic about hours. Only use skillNodeIds that exist in the tree.`

export async function POST(req: NextRequest) {
  const { goal, subject, weeks } = await req.json()
  if (!goal || !subject) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Fix 3: compressed skill tree — id, name, mastery + prerequisite edge list only
  const nodes = await prisma.skillNode.findMany({
    where: { subject },
    select: { id: true, name: true, masteryLevel: true, tier: true },
    orderBy: [{ tier: 'asc' }, { name: 'asc' }],
  })
  const nodeIds = nodes.map(n => n.id)
  const deps = await prisma.skillDependency.findMany({
    where: { prerequisiteId: { in: nodeIds }, dependentId: { in: nodeIds } },
    select: { prerequisiteId: true, dependentId: true },
  })
  const treeText = nodes.map(n => `${n.id}|${n.name}|m${n.masteryLevel}`).join('\n')
  const edgeText = deps.map(d => `${d.prerequisiteId}->${d.dependentId}`).join(' ')

  const validIds = new Set(nodeIds)

  // Fix 7: response cache keyed by goal+subject (+ tree shape). 7-day TTL.
  const cacheKey = { route: 'learning-path/generate', goal: goal.toLowerCase().trim(), subject, treeHash: nodeIds.length }
  let result = await getCachedResponse<GenResult>('learning-path/generate', cacheKey)

  if (!result) {
    // Fix 9: rate limit + monthly cap before calling Claude
    const cap = await checkMonthlyCap()
    if (cap.overCap) return NextResponse.json({ error: 'Monthly budget reached. Learning-path generation paused until next month.', overCap: true }, { status: 429 })
    const rl = await checkRateLimit('learning-path/generate')
    if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached (5/day). Try again tomorrow.', resetAt: rl.resetAt }, { status: 429 })

    const userMsg = `Goal: "${goal}" in ${subject}. Weeks available: ${weeks ?? 12}.
Skill tree (id|name|mastery):
${treeText}
Prerequisite edges (prereq->dependent):
${edgeText}`

    try {
      result = await claudeJSON<GenResult>({
        system: PATH_SYSTEM,
        user: userMsg,
        model: SONNET,                    // keep Sonnet — complex task
        cacheSystem: true,                // Fix 2
        route: 'learning-path/generate',  // Fix 10
        maxTokens: 3000,
      })
      // Fix 1/7: cache generated paths for 90 days (goal+subject are deterministic)
      await setCachedResponse('learning-path/generate', cacheKey, result, 90 * 24 * 60 * 60 * 1000)
    } catch (err) {
      console.error('Learning path generation error:', err)
      return NextResponse.json({ error: 'Failed to generate learning path' }, { status: 500 })
    }
  }

  // Validate node IDs against the tree
  const topics = (result.topics ?? []).filter(t => validIds.has(t.skillNodeId))
  if (topics.length === 0) return NextResponse.json({ error: 'No valid topics generated' }, { status: 500 })

  const estimatedHours: Record<string, number> = {}
  for (const t of topics) estimatedHours[t.skillNodeId] = t.estimatedHours

  const path = await prisma.learningPath.create({
    data: {
      name: result.pathName || goal,
      subject,
      goalDescription: goal,
      topics: topics.map(t => t.skillNodeId) as Prisma.InputJsonValue,
      estimatedHours: estimatedHours as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json({
    path,
    detail: {
      topics,
      totalHours: result.totalHours,
      suggestedWeeklyHours: result.suggestedWeeklyHours,
      prerequisiteWarnings: result.prerequisiteWarnings ?? [],
    },
  })
}
