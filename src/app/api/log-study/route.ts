// GET /api/log-study  — recent study logs (with topic name)
// POST /api/log-study — log a study session (+ optional self-rating, note, source link)
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cascadeUnlock } from '@/lib/unlock'
import { getNextReviewDate, getReviewIntervalDays } from '@/lib/spacedRepetition'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limit = Math.min(300, Math.max(1, parseInt(new URL(req.url).searchParams.get('limit') ?? '8')))
  const sessions = await prisma.studySession.findMany({
    orderBy: { startTime: 'desc' }, take: limit,
    include: { skillNode: { select: { name: true, subject: true } } },
  })
  return NextResponse.json({
    logs: sessions.map(s => ({
      id: s.id, durationMins: s.durationMins, note: s.note, sourceUrl: s.sourceUrl,
      startTime: s.startTime.toISOString(),
      topicName: s.skillNode?.name ?? null, subject: s.skillNode?.subject ?? null,
    })),
  })
}

export async function POST(req: NextRequest) {
  const { skillNodeId, durationMins, selfRating, note, sourceUrl, phase } = await req.json()
  if (!skillNodeId || !durationMins) return NextResponse.json({ error: 'skillNodeId and durationMins required' }, { status: 400 })

  // 1) Always record the study session (feeds time-vs-gain efficiency + velocity time)
  const session = await prisma.studySession.create({
    data: {
      skillNodeId,
      durationMins: Math.max(1, Math.round(durationMins)),
      source: 'manual',
      note: note?.slice(0, 1000) || null,
      sourceUrl: sourceUrl?.slice(0, 500) || null,
      endTime: new Date(),
    },
  })

  // 1b) Workflow-aware logging — tag which phase this session was
  const ph = parseInt(phase)
  if (ph >= 1 && ph <= 4) {
    await prisma.phaseLog.create({
      data: { skillNodeId, phase: ph, durationMins: Math.max(1, Math.round(durationMins)), source: 'session', note: note?.slice(0, 500) || null },
    }).catch(() => {})
  }

  // 2) Optional manual self-rating — set mastery directly, log a MasteryEvent
  let newMasteryLevel: number | null = null
  let unlockedNames: string[] = []
  if (selfRating != null && selfRating >= 0 && selfRating <= 5) {
    const node = await prisma.skillNode.findUnique({ where: { id: skillNodeId }, select: { masteryLevel: true } })
    if (node) {
      const ml = Math.round(selfRating * 2) / 2
      const status = ml >= 5 ? 'mastered' : ml >= 1 ? 'in_progress' : 'unlocked'
      const reviewFields = ml > 0 ? { nextReviewAt: getNextReviewDate(ml), reviewIntervalDays: getReviewIntervalDays(ml) } : {}
      await prisma.skillNode.update({
        where: { id: skillNodeId },
        data: { masteryLevel: ml, status, masteryUpdatedAt: new Date(), ...reviewFields },
      })
      await prisma.masteryEvent.create({
        data: { skillNodeId, eventType: 'manual', score: Math.round((ml / 5) * 100), masteryGain: Math.max(0, Math.round((ml - node.masteryLevel) * 4) / 4) },
      })
      newMasteryLevel = ml
      unlockedNames = (await cascadeUnlock()).map(u => u.name)
    }
  }

  return NextResponse.json({ session, newMasteryLevel, unlockedNames })
}
