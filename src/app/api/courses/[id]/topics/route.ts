// PUT /api/courses/[id]/topics — set which skill nodes belong to this course.
// Body: { skillNodeIds: string[] }. Only nodes within the course's subject are
// affected; nodes previously linked but now omitted are unlinked.
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { skillNodeIds } = await req.json()
  if (!Array.isArray(skillNodeIds)) return NextResponse.json({ error: 'skillNodeIds array required' }, { status: 400 })

  const course = await prisma.course.findUnique({ where: { id: params.id }, select: { subject: true } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const keep = new Set(skillNodeIds as string[])

  // Unlink nodes in this subject currently tied to the course but no longer selected.
  await prisma.skillNode.updateMany({
    where: { courseId: params.id, id: { notIn: skillNodeIds.length ? (skillNodeIds as string[]) : ['__none__'] } },
    data: { courseId: null },
  })
  // Link selected nodes (restricted to the course's subject for safety).
  await prisma.skillNode.updateMany({
    where: { id: { in: Array.from(keep) }, subject: course.subject },
    data: { courseId: params.id },
  })

  return NextResponse.json({ ok: true, linked: keep.size })
}
