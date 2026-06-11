// POST /api/exercise/analyze — analyze an uploaded exercise set (PDF/image)
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { anthropic, HAIKU, stripFences, computeCost } from '@/lib/claude'

type ExerciseAnalysis = {
  topics: { skillNodeId: string; name: string; difficulty: string }[]
  problemCount: number
  types: string[]
  masteryGainAt80Percent: number
  masteryGainAt90Percent: number
  masteryGainAt100Percent: number
  summary: string
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try { formData = await req.formData() } catch { return NextResponse.json({ error: 'Invalid form' }, { status: 400 }) }

  const file = formData.get('file') as File | null
  const subject = (formData.get('subject') as string) || ''
  if (!file || !subject) return NextResponse.json({ error: 'file and subject required' }, { status: 400 })

  const isPdf = file.type === 'application/pdf'
  const isImg = file.type.startsWith('image/')
  if (!isPdf && !isImg) return NextResponse.json({ error: 'Upload a PDF or image' }, { status: 400 })

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')

  // Candidate topics so Claude can map to real skillNodeIds
  const nodes = await prisma.skillNode.findMany({ where: { subject }, select: { id: true, name: true } })
  const candidateList = nodes.map(n => `id:${n.id} | ${n.name}`).join('\n')

  const system = `You analyze an uploaded exercise/problem set. Identify the topics it covers by matching to the candidate list (use exact skillNodeId), the difficulty, and problem counts/types.
Return ONLY JSON: { "topics": [{ "skillNodeId": string, "name": string, "difficulty": string }], "problemCount": number, "types": string[], "masteryGainAt80Percent": number, "masteryGainAt90Percent": number, "masteryGainAt100Percent": number, "summary": string }
Use gains in line with: 80%→~0.5, 90%→~0.75, 100%→~1.0 (scale slightly by difficulty).

Candidate topics (${subject}):
${candidateList}`

  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }

  let analysis: ExerciseAnalysis
  try {
    const start = Date.now()
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system,
      messages: [{
        role: 'user',
        content: [fileBlock as never, { type: 'text', text: 'Analyze this exercise set.' }],
      }],
    })
    // Log cost (vision/document call)
    await prisma.aPICall.create({
      data: {
        route: 'exercise/analyze', model: HAIKU,
        inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
        cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
        cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
        responseMs: Date.now() - start, costUsd: computeCost(HAIKU, response.usage),
      },
    }).catch(() => {})
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    analysis = JSON.parse(stripFences(raw))
  } catch (err) {
    console.error('Exercise analyze error:', err)
    return NextResponse.json({ error: 'Failed to analyze exercise set' }, { status: 500 })
  }

  // Validate skillNodeIds against the subject
  const validIds = new Set(nodes.map(n => n.id))
  analysis.topics = (analysis.topics ?? []).filter(t => validIds.has(t.skillNodeId))

  const set = await prisma.exerciseSet.create({
    data: {
      filename: file.name,
      skillNodeIds: analysis.topics.map(t => t.skillNodeId) as Prisma.InputJsonValue,
      masteryImpact: {} as Prisma.InputJsonValue,
      analyzedAt: new Date(),
    },
  })

  return NextResponse.json({ exerciseSetId: set.id, analysis })
}
