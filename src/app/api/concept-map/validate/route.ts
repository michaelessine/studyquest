// POST /api/concept-map/validate — validate a user's concept map
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { claudeJSON, HAIKU } from '@/lib/claude'

type Connection = { fromNodeId: string; toNodeId: string; fromName?: string; toName?: string; explanation: string }
type ValidationResult = {
  validConnections: Record<string, boolean>
  missingConnections: { from: string; to: string; explanation: string }[]
  overallFeedback: string
}

export async function POST(req: NextRequest) {
  const { skillNodeId, subject, connections } = await req.json()
  if (!connections || !Array.isArray(connections)) return NextResponse.json({ error: 'Missing connections' }, { status: 400 })

  const connText = (connections as Connection[]).map((c, i) =>
    `${i}: "${c.fromName ?? c.fromNodeId}" → "${c.toName ?? c.toNodeId}" (${c.explanation})`
  ).join('\n')

  const system = `The user created a concept map for ${subject}. Their connections:
${connText}

Check if each connection is conceptually valid and complete.
Return ONLY JSON: { "validConnections": { "<index>": true|false }, "missingConnections": [{ "from": string, "to": string, "explanation": string }], "overallFeedback": string }`

  let result: ValidationResult
  try {
    result = await claudeJSON<ValidationResult>({ system, user: 'Validate this concept map.', model: HAIKU, route: 'concept-map/validate', maxTokens: 1000 })
  } catch (err) {
    console.error('Concept map validation error:', err)
    return NextResponse.json({ error: 'Failed to validate' }, { status: 500 })
  }

  // Persist a ConceptMap + validation if a skillNodeId was provided
  if (skillNodeId) {
    const map = await prisma.conceptMap.create({
      data: { skillNodeId, subject: subject ?? '', connections: connections as Prisma.InputJsonValue },
    })
    await prisma.conceptMapValidation.create({
      data: {
        conceptMapId: map.id,
        validConnections: result.validConnections as Prisma.InputJsonValue,
        missingConnections: result.missingConnections as unknown as Prisma.InputJsonValue,
        feedback: result.overallFeedback,
      },
    })
  }

  return NextResponse.json(result)
}
