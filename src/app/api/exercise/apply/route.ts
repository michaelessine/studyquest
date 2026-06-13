// POST /api/exercise/apply — apply mastery gains after the user reports % solved
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { applyMasteryGain, exerciseDelta } from '@/lib/mastery'

export async function POST(req: NextRequest) {
  const { exerciseSetId, skillNodeIds, pctSolved, courseId } = await req.json()
  if (!Array.isArray(skillNodeIds) || skillNodeIds.length === 0 || pctSolved == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const delta = exerciseDelta(pctSolved)
  const applied: { skillNodeId: string; newMasteryLevel: number; capped: boolean }[] = []
  const masteryImpact: Record<string, number> = {}

  if (delta > 0) {
    for (const id of skillNodeIds) {
      const res = await applyMasteryGain({ skillNodeId: id, eventType: 'exercise', score: pctSolved, delta })
      applied.push({ skillNodeId: id, newMasteryLevel: res.newMasteryLevel, capped: res.capped })
      masteryImpact[id] = res.gain
    }
  }

  if (exerciseSetId) {
    await prisma.exerciseSet.update({
      where: { id: exerciseSetId },
      data: { masteryImpact: masteryImpact as Prisma.InputJsonValue, courseId: courseId || null, pctSolved: Math.round(pctSolved) },
    }).catch(() => {})
  }

  // Advance the linked course: count this set as one completed exercise set.
  let courseProgress: { exerciseSetsDone: number; exerciseSetsTotal: number } | null = null
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { exerciseSetsDone: true, exerciseSetsTotal: true } })
    if (course) {
      const next = course.exerciseSetsTotal > 0
        ? Math.min(course.exerciseSetsTotal, course.exerciseSetsDone + 1)
        : course.exerciseSetsDone + 1
      const updated = await prisma.course.update({
        where: { id: courseId }, data: { exerciseSetsDone: next },
        select: { exerciseSetsDone: true, exerciseSetsTotal: true },
      })
      courseProgress = updated
    }
  }

  return NextResponse.json({ applied, gainPerTopic: delta, courseProgress })
}
