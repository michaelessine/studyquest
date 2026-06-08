// POST /api/learning-path/generate — Claude-generated learning path
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON } from '@/lib/claude'

type GenTopic = { skillNodeId: string; topicName: string; estimatedHours: number; why: string }
type GenResult = {
  pathName: string
  topics: GenTopic[]
  totalHours: number
  suggestedWeeklyHours: number
  prerequisiteWarnings?: string[]
}

export async function POST(req: NextRequest) {
  const { goal, subject, weeks } = await req.json()
  if (!goal || !subject) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Provide the skill tree so Claude can reference real node IDs
  const nodes = await prisma.skillNode.findMany({
    where: { subject },
    select: { id: true, name: true, tier: true, category: true, masteryLevel: true },
    orderBy: [{ tier: 'asc' }, { name: 'asc' }],
  })

  const treeText = nodes.map(n => `- ${n.name} (id:${n.id}, tier:${n.tier}, category:${n.category}, mastery:${n.masteryLevel})`).join('\n')

  const system = `You are an expert curriculum designer. The user wants to: "${goal}" in ${subject}. They have approximately ${weeks ?? 12} weeks available.
Based on the skill tree below, create a learning path.
Return ONLY JSON: { "pathName": string, "topics": [{ "skillNodeId": string (MUST be a real id from the tree), "topicName": string, "estimatedHours": number, "why": string }], "totalHours": number, "suggestedWeeklyHours": number, "prerequisiteWarnings": string[] }.
Order topics by logical dependency (prerequisites first). Be realistic about hours. Only use skillNodeIds that exist in the tree.

SKILL TREE:
${treeText}`

  let result: GenResult
  try {
    result = await claudeJSON<GenResult>({
      system,
      user: `Create a learning path to: ${goal}`,
      maxTokens: 3000,
    })
  } catch (err) {
    console.error('Learning path generation error:', err)
    return NextResponse.json({ error: 'Failed to generate learning path' }, { status: 500 })
  }

  // Validate node IDs against the tree
  const validIds = new Set(nodes.map(n => n.id))
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
