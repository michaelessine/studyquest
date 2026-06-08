// PATCH /api/learning-path/[id] — update topics order, pin, or mark complete
// DELETE /api/learning-path/[id] — remove a path
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data: Prisma.LearningPathUpdateInput = {}

  if (body.topics !== undefined)   data.topics = body.topics as Prisma.InputJsonValue
  if (body.estimatedHours !== undefined) data.estimatedHours = body.estimatedHours as Prisma.InputJsonValue
  if (body.completedAt !== undefined) data.completedAt = body.completedAt ? new Date(body.completedAt) : null

  // Pin is exclusive — only one path pinned at a time
  if (body.pinned === true) {
    await prisma.learningPath.updateMany({ where: { pinned: true }, data: { pinned: false } })
    data.pinned = true
  } else if (body.pinned === false) {
    data.pinned = false
  }

  const path = await prisma.learningPath.update({ where: { id: params.id }, data })
  return NextResponse.json({ path })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.learningPath.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
