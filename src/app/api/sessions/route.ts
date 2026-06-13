// GET /api/sessions  — recent study sessions
// POST /api/sessions — log a new study session (course-level, no node)
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const sessions = await prisma.studySession.findMany({
    include: { course: { select: { name: true } } },
    orderBy: { startTime: 'desc' },
    take: 100,
  })
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { courseId, rawNote, durationMins } = body

  const xpEarned = Math.round((durationMins / 30) * 10)

  const session = await prisma.studySession.create({
    data: {
      courseId:     courseId || null,
      rawNote:      rawNote || '',
      durationMins: durationMins || 30,
      xpEarned,
      source:       'session_log',
    },
  })
  return NextResponse.json({ session, xpEarned }, { status: 201 })
}
