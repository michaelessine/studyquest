// POST /api/quiz/analyze-gaps — suggest weak prerequisites after a failed quiz
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { claudeJSON } from '@/lib/claude'

type GapResult = {
  weakPrerequisites: { skillNodeId: string; topicName: string; masteryLevel: number; why: string }[]
  reviewSuggestion: string
}

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, score, wrongAnswers } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Gather the prerequisites of this topic
  const deps = await prisma.skillDependency.findMany({
    where: { dependentId: skillNodeId },
    select: { prerequisiteId: true },
  })
  const prereqNodes = await prisma.skillNode.findMany({
    where: { id: { in: deps.map(d => d.prerequisiteId) } },
    select: { id: true, name: true, masteryLevel: true },
  })

  if (prereqNodes.length === 0) {
    return NextResponse.json({
      weakPrerequisites: [],
      reviewSuggestion: 'This is a foundational topic with no prerequisites. Try reviewing the topic resources and retaking the quiz.',
    })
  }

  const prereqText = prereqNodes.map(n => `- ${n.name} (id:${n.id}, mastery:${n.masteryLevel})`).join('\n')
  const wrongText = Array.isArray(wrongAnswers) && wrongAnswers.length
    ? wrongAnswers.map((w: { question: string; userAnswer: string }) => `Q: ${w.question} | answered: ${w.userAnswer}`).join('\n')
    : 'Not provided'

  const system = `The user failed a quiz on "${topicName}" with score ${score}%.
Wrong answers:
${wrongText}

Based on the prerequisites of "${topicName}", which foundational topics might need review?
Prerequisites (only use these ids):
${prereqText}

Return ONLY JSON: { "weakPrerequisites": [{ "skillNodeId": string, "topicName": string, "masteryLevel": number, "why": string }], "reviewSuggestion": string (2 sentences) }`

  try {
    const result = await claudeJSON<GapResult>({
      system,
      user: `Analyze the knowledge gaps for ${topicName}.`,
      maxTokens: 1024,
    })
    // Validate prereq ids
    const validIds = new Set(prereqNodes.map(n => n.id))
    result.weakPrerequisites = (result.weakPrerequisites ?? []).filter(w => validIds.has(w.skillNodeId))
    return NextResponse.json(result)
  } catch (err) {
    console.error('Gap analysis error:', err)
    // Fallback: suggest the lowest-mastery prerequisites
    const weak = prereqNodes.filter(n => n.masteryLevel < 3)
      .map(n => ({ skillNodeId: n.id, topicName: n.name, masteryLevel: n.masteryLevel, why: 'Low mastery prerequisite' }))
    return NextResponse.json({
      weakPrerequisites: weak,
      reviewSuggestion: 'Consider reviewing the foundational prerequisites before retaking this quiz.',
    })
  }
}
