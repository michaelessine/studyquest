// GET /api/reviews/due — count (and list) of rated topics whose spaced-repetition
// review date has passed. Powers the "due for review" badge.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const due = await prisma.skillNode.findMany({
    where: { masteryLevel: { gte: 1 }, nextReviewAt: { lte: now } },
    orderBy: { nextReviewAt: 'asc' },
    select: { id: true, name: true, subject: true, masteryLevel: true, nextReviewAt: true },
  })
  return NextResponse.json({
    count: due.length,
    topics: due.map(n => ({
      id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel,
      dueSince: n.nextReviewAt?.toISOString() ?? null,
    })),
  })
}
