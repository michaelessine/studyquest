// POST /api/weak-spots/diagnose — diagnose weak prereqs after a failed quiz/exercise/exam,
// build a micro-learning path, and optionally save it as a (pinnable) LearningPath.
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { diagnoseWeakSpots, MicroStep } from '@/lib/diagnose'

async function savePath(topicName: string, subject: string, source: string, microPath: MicroStep[]): Promise<string | null> {
  if (microPath.length === 0) return null
  const ids = microPath.map(s => s.skillNodeId)
  const estimatedHours: Record<string, number> = {}
  for (const id of ids) estimatedHours[id] = 3
  const path = await prisma.learningPath.create({
    data: {
      name: `Plug gaps: ${topicName}`,
      subject: subject ?? '',
      goalDescription: `Micro-path to strengthen the prerequisites behind a failed ${source} on ${topicName}.`,
      topics: ids as Prisma.InputJsonValue,
      estimatedHours: estimatedHours as Prisma.InputJsonValue,
    },
  })
  return path.id
}

export async function POST(req: NextRequest) {
  const { skillNodeId, topicName, subject, score, source = 'quiz', wrongAnswers, createPath, microPath } = await req.json()
  if (!skillNodeId || !topicName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Cost saver: if the client already has the diagnosis and just wants to save it,
  // persist the provided micro-path WITHOUT a second Claude call.
  if (createPath && Array.isArray(microPath) && microPath.length > 0) {
    const pathId = await savePath(topicName, subject, source, microPath as MicroStep[])
    return NextResponse.json({ pathId })
  }

  const diagnosis = await diagnoseWeakSpots({ skillNodeId, topicName, score: score ?? 0, source, wrongAnswers })
  const pathId = createPath ? await savePath(topicName, subject ?? '', source, diagnosis.microPath) : null
  return NextResponse.json({ ...diagnosis, pathId })
}
