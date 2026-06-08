// GET /api/deadlines  — all deadlines (can filter by ?completed=false)
// POST /api/deadlines — create a new deadline
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const completed = searchParams.get('completed')

  const deadlines = await prisma.deadline.findMany({
    where: completed !== null ? { completed: completed === 'true' } : undefined,
    include: { course: { select: { name: true, code: true } } },
    orderBy: { dueDate: 'asc' },
  })
  return NextResponse.json({ deadlines })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { courseId, title, type, dueDate, xpValue } = body

  if (!courseId || !title || !type || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const deadline = await prisma.deadline.create({
    data: {
      courseId,
      title,
      type,
      dueDate:  new Date(dueDate),
      xpValue:  xpValue ?? 100,
    },
  })
  return NextResponse.json({ deadline }, { status: 201 })
}
