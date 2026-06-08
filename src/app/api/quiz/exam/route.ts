// POST /api/quiz/exam — generate a 20-question subject exam covering 5 most-studied topics
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { subject } = await req.json()
  if (!subject) return NextResponse.json({ error: 'subject required' }, { status: 400 })

  // Pick the 5 most recently studied topics in this subject
  const recentNodes = await prisma.skillNode.findMany({
    where: { subject, masteryLevel: { gt: 0 } },
    orderBy: { masteryUpdatedAt: 'desc' },
    take: 5,
    select: { id: true, name: true },
  })

  if (recentNodes.length === 0) {
    return NextResponse.json({ error: 'No studied topics in this subject yet' }, { status: 400 })
  }

  // Use the first topic's node for the quiz entity; store all topic names in topicName
  const primaryNode   = recentNodes[0]
  const allTopicNames = recentNodes.map(n => n.name).join(', ')

  // Delegate to the generate route logic — call it directly
  const generateRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/quiz/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skillNodeId: primaryNode.id,
      topicName: allTopicNames,
      subject,
      quizType: 'exam',
    }),
  })
  const data = await generateRes.json()
  return NextResponse.json(data)
}
