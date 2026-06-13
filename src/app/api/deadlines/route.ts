// GET /api/deadlines  — all deadlines (can filter by ?completed=false)
// POST /api/deadlines — create a new deadline
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const completed = searchParams.get('completed')
  const courseId = searchParams.get('courseId')

  const deadlines = await prisma.deadline.findMany({
    where: {
      ...(completed !== null ? { completed: completed === 'true' } : {}),
      ...(courseId ? { courseId } : {}),
    },
    include: { course: { select: { name: true, code: true, subject: true } } },
    orderBy: { dueDate: 'asc' },
  })
  return NextResponse.json({ deadlines })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { courseId, title, type, dueDate, xpValue, repeatWeeks } = body

  if (!courseId || !title || !type || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const weeks = Math.max(1, Math.min(40, parseInt(repeatWeeks) || 1))
  const start = new Date(dueDate)

  // One deadline, or a weekly series (auto-numbered) when repeatWeeks > 1.
  if (weeks === 1) {
    const deadline = await prisma.deadline.create({
      data: { courseId, title, type, dueDate: start, xpValue: xpValue ?? 100 },
    })
    return NextResponse.json({ deadline, count: 1 }, { status: 201 })
  }

  const data = Array.from({ length: weeks }, (_, i) => ({
    courseId, type, xpValue: xpValue ?? 100,
    title: `${title} ${i + 1}`,
    dueDate: new Date(start.getTime() + i * 7 * 86_400_000),
  }))
  const result = await prisma.deadline.createMany({ data })
  return NextResponse.json({ count: result.count }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { id, completed } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const deadline = await prisma.deadline.update({ where: { id }, data: { completed: !!completed } })
  return NextResponse.json({ deadline })
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.deadline.delete({ where: { id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
