// POST /api/exam/map-topics — extract which topics a real exam covers (PDF/image)
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { anthropic, HAIKU, stripFences, computeCost } from '@/lib/claude'

type Mapped = { topics: { skillNodeId: string; name: string }[]; examName?: string }

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

  const nodes = await prisma.skillNode.findMany({ where: { subject }, select: { id: true, name: true } })
  const candidateList = nodes.map(n => `id:${n.id} | ${n.name}`).join('\n')

  const system = `You read a university exam (PDF/image) and identify which topics it covers by matching to the candidate list (use exact skillNodeId).
Return ONLY JSON: { "examName": string (best guess of the exam title), "topics": [{ "skillNodeId": string, "name": string }] }

Candidate topics (${subject}):
${candidateList}`

  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } }

  let mapped: Mapped
  try {
    const start = Date.now()
    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: [fileBlock as never, { type: 'text', text: 'Identify the covered topics.' }] }],
    })
    await prisma.aPICall.create({
      data: {
        route: 'exam/map-topics', model: HAIKU,
        inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
        cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
        cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
        responseMs: Date.now() - start, costUsd: computeCost(HAIKU, response.usage),
      },
    }).catch(() => {})
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    mapped = JSON.parse(stripFences(raw))
  } catch (err) {
    console.error('Exam map-topics error:', err)
    return NextResponse.json({ error: 'Failed to read exam' }, { status: 500 })
  }

  const validIds = new Set(nodes.map(n => n.id))
  mapped.topics = (mapped.topics ?? []).filter(t => validIds.has(t.skillNodeId))
  return NextResponse.json(mapped)
}
