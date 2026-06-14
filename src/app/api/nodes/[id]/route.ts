// DELETE /api/nodes/[id] — remove a skill node and all its dependency links
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  // Remove dependency links (both directions), then mastery events, then the node
  await prisma.skillDependency.deleteMany({ where: { OR: [{ prerequisiteId: id }, { dependentId: id }] } })
  await prisma.masteryEvent.deleteMany({ where: { skillNodeId: id } })
  await prisma.phaseLog.deleteMany({ where: { skillNodeId: id } })
  await prisma.studySession.updateMany({ where: { skillNodeId: id }, data: { skillNodeId: null } })
  await prisma.skillNode.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
