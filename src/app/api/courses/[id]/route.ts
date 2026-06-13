// PATCH /api/courses/[id] — update course fields (progress counters, status, grade…)
// DELETE /api/courses/[id] — remove a course (and its deadlines)
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const NUM_FIELDS = ['exerciseSetsTotal', 'exerciseSetsDone', 'quizzesTotal', 'quizzesDone'] as const

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data: Record<string, unknown> = {}

  for (const f of NUM_FIELDS) {
    if (body[f] != null) data[f] = Math.max(0, Math.round(Number(body[f])))
  }
  if (typeof body.status === 'string') data.status = body.status
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.grade !== undefined) data.grade = body.grade === null || body.grade === '' ? null : parseFloat(body.grade)

  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  // Clamp "done" to never exceed "total" (when total is known).
  const course = await prisma.course.update({ where: { id: params.id }, data })
  const fixes: Record<string, number> = {}
  if (course.exerciseSetsTotal > 0 && course.exerciseSetsDone > course.exerciseSetsTotal) fixes.exerciseSetsDone = course.exerciseSetsTotal
  if (course.quizzesTotal > 0 && course.quizzesDone > course.quizzesTotal) fixes.quizzesDone = course.quizzesTotal
  const finalCourse = Object.keys(fixes).length > 0
    ? await prisma.course.update({ where: { id: params.id }, data: fixes })
    : course

  return NextResponse.json({ course: finalCourse })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  // Clear everything that references the course (FK constraints would block delete).
  await prisma.deadline.deleteMany({ where: { courseId: id } })
  await prisma.topic.deleteMany({ where: { courseId: id } })           // required FK → must delete
  await prisma.skillNode.updateMany({ where: { courseId: id }, data: { courseId: null } })
  await prisma.sessionLog.updateMany({ where: { courseId: id }, data: { courseId: null } })
  await prisma.exerciseSet.updateMany({ where: { courseId: id }, data: { courseId: null } })
  await prisma.failedProblem.updateMany({ where: { courseId: id }, data: { courseId: null } })
  try {
    await prisma.course.delete({ where: { id } })
  } catch (err) {
    console.error('Course delete failed:', err)
    return NextResponse.json({ error: 'Could not delete course' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
