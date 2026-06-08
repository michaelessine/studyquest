// GET /api/sessions  — recent session logs
// POST /api/sessions — log a new study session
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const sessions = await prisma.sessionLog.findMany({
    include: { course: { select: { name: true } } },
    orderBy: { loggedAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { courseId, rawNote, durationMins } = body

  const xpEarned = Math.round((durationMins / 30) * 10)

  const session = await prisma.sessionLog.create({
    data: {
      courseId:     courseId || null,
      rawNote:      rawNote || '',
      durationMins: durationMins || 30,
      xpEarned,
    },
  })
  return NextResponse.json({ session, xpEarned }, { status: 201 })
}
