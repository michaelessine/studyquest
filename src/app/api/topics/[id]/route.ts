// PATCH /api/topics/[id]
// type:"skillNode" — update a SkillNode status with cascade-unlock logic
// (default)        — update a Topic record status
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkAndUnlockAchievements } from '@/lib/achievements'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json()

  if (body.type === 'skillNode') {
    const node = await prisma.skillNode.update({
      where: { id: params.id },
      data: { status: body.status },
    })

    // When a node is marked done (mastered), unlock any dependents whose
    // prerequisites are now ALL mastered.
    if (body.status === 'mastered') {
      await cascadeUnlock(params.id)
    }

    const newAchievements = body.status === 'mastered'
      ? await checkAndUnlockAchievements()
      : []

    return NextResponse.json({ node, newAchievements })
  }

  // Default: Topic record
  const topic = await prisma.topic.update({
    where: { id: params.id },
    data: { status: body.status },
  })
  const newAchievements = body.status === 'done'
    ? await checkAndUnlockAchievements()
    : []
  return NextResponse.json({ topic, newAchievements })
}

/**
 * After node `doneId` is mastered, find its dependents and unlock any whose
 * every prerequisite is now mastered.
 */
async function cascadeUnlock(doneId: string) {
  // Get all nodes that list doneId as a prerequisite
  const outgoing = await prisma.skillDependency.findMany({
    where: { prerequisiteId: doneId },
    select: { dependentId: true },
  })

  for (const { dependentId } of outgoing) {
    const dependent = await prisma.skillNode.findUnique({
      where: { id: dependentId },
      select: { status: true },
    })
    if (!dependent || dependent.status !== 'locked') continue

    // Check all prerequisites of this dependent
    const prereqs = await prisma.skillDependency.findMany({
      where: { dependentId },
      select: { prerequisiteId: true },
    })

    const prereqNodes = await prisma.skillNode.findMany({
      where: { id: { in: prereqs.map(p => p.prerequisiteId) } },
      select: { status: true },
    })

    const allDone = prereqNodes.every(n => n.status === 'mastered')
    if (allDone) {
      await prisma.skillNode.update({
        where: { id: dependentId },
        data: { status: 'unlocked' },
      })
    }
  }
}
