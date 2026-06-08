// POST /api/review-done — advance spaced-repetition interval for a node
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { advanceInterval } from '@/lib/spacedRepetition'

export async function POST(req: NextRequest) {
  const { nodeId } = await req.json()
  if (!nodeId) return NextResponse.json({ error: 'nodeId required' }, { status: 400 })

  const node = await prisma.skillNode.findUnique({
    where: { id: nodeId },
    select: { reviewIntervalDays: true },
  })
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })

  const { nextReviewAt, reviewIntervalDays } = advanceInterval(node.reviewIntervalDays)

  const updated = await prisma.skillNode.update({
    where: { id: nodeId },
    data: { nextReviewAt, reviewIntervalDays },
  })
  return NextResponse.json({ node: updated })
}
