// POST   /api/dependencies — add a prerequisite link
// DELETE /api/dependencies — remove a prerequisite link
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { prerequisiteId, dependentId } = await req.json()
  if (!prerequisiteId || !dependentId) return NextResponse.json({ error: 'Both IDs required' }, { status: 400 })
  if (prerequisiteId === dependentId) return NextResponse.json({ error: 'A topic cannot be its own prerequisite' }, { status: 400 })

  // Check for cycles: if dependentId is already a (transitive) prereq of prerequisiteId, adding this would create a cycle
  const dep = await prisma.skillDependency.create({
    data: { prerequisiteId, dependentId },
  }).catch(() => null)

  if (!dep) return NextResponse.json({ error: 'Link already exists or invalid' }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { prerequisiteId, dependentId } = await req.json()
  await prisma.skillDependency.deleteMany({ where: { prerequisiteId, dependentId } })
  return NextResponse.json({ ok: true })
}
