// PATCH /api/topics/[id]
// type:"skillNode" + masteryLevel → star rating update + full cascade unlock
// type:"skillNode" + status       → legacy status-only
// (default)                       → Topic record update
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getNextReviewDate, getReviewIntervalDays } from '@/lib/spacedRepetition'
import { cascadeUnlock } from '@/lib/unlock'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()

  // ── Star rating ────────────────────────────────────────────────────────────
  if (body.type === 'skillNode' && body.masteryLevel !== undefined) {
    const ml: number = body.masteryLevel
    const status = ml >= 5 ? 'mastered' : ml >= 1 ? 'in_progress' : await deriveStatus(params.id)
    const reviewFields = ml > 0
      ? { nextReviewAt: getNextReviewDate(ml), reviewIntervalDays: getReviewIntervalDays(ml) }
      : {}
    const node = await prisma.skillNode.update({
      where: { id: params.id },
      data: { masteryLevel: ml, status, masteryUpdatedAt: new Date(), ...reviewFields },
    })
    if (ml >= 1) await cascadeUnlock()
    return NextResponse.json({ node })
  }

  // ── Legacy status-only ────────────────────────────────────────────────────
  if (body.type === 'skillNode') {
    const node = await prisma.skillNode.update({ where: { id: params.id }, data: { status: body.status } })
    if (body.status === 'mastered' || body.status === 'in_progress') await cascadeUnlock()
    return NextResponse.json({ node })
  }

  // ── Topic record ──────────────────────────────────────────────────────────
  const topic = await prisma.topic.update({ where: { id: params.id }, data: { status: body.status } })
  return NextResponse.json({ topic })
}

async function deriveStatus(nodeId: string): Promise<string> {
  const prereqs = await prisma.skillDependency.findMany({ where: { dependentId: nodeId }, select: { prerequisiteId: true } })
  if (prereqs.length === 0) return 'unlocked'
  const prereqNodes = await prisma.skillNode.findMany({ where: { id: { in: prereqs.map(p => p.prerequisiteId) } }, select: { masteryLevel: true } })
  return prereqNodes.every(n => n.masteryLevel >= 1) ? 'unlocked' : 'locked'
}
