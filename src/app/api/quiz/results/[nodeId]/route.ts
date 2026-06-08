// GET /api/quiz/results/[nodeId] — last 3 quiz results for a skill node
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  const results = await prisma.quizResult.findMany({
    where: { skillNodeId: params.nodeId },
    orderBy: { takenAt: 'desc' },
    take: 3,
    include: { quiz: { select: { topicName: true, quizType: true } } },
  })
  return NextResponse.json({ results })
}
