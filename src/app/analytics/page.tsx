import prisma from '@/lib/prisma'
import { CAREERS, computeCareerProgress } from '@/lib/careers'
import { computeEvaluation } from '@/lib/evaluate'
import AnalyticsClient from '@/components/AnalyticsClient'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000)
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const since120 = new Date(now.getTime() - 120 * 86_400_000)

  const [nodes, events90, events120, sessions, saved] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true, status: true, masteryUpdatedAt: true, nextReviewAt: true } }),
    prisma.masteryEvent.findMany({
      where: { timestamp: { gte: ninetyAgo }, masteryGain: { gt: 0 } },
      select: { skillNodeId: true, masteryGain: true, timestamp: true, eventType: true },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.masteryEvent.findMany({
      where: { timestamp: { gte: since120 } },
      select: { skillNodeId: true, eventType: true, score: true, masteryGain: true, timestamp: true },
    }),
    prisma.studySession.findMany({ select: { skillNodeId: true, durationMins: true } }),
    prisma.careerPathProgress.findUnique({ where: { userId: 'default' } }),
  ])

  // ── Progress dataset ────────────────────────────────────────────────────────
  const masteredThisMonth = nodes
    .filter(n => n.masteryLevel >= 5 && n.masteryUpdatedAt && n.masteryUpdatedAt >= monthStart)
    .map(n => ({ id: n.id, name: n.name, subject: n.subject, date: n.masteryUpdatedAt!.toISOString() }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  const inProgress = nodes
    .filter(n => n.masteryLevel > 0 && n.masteryLevel < 5)
    .map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel }))

  const byDay = new Map<string, number>()
  for (const e of events90) {
    const key = e.timestamp.toISOString().split('T')[0]
    byDay.set(key, (byDay.get(key) ?? 0) + e.masteryGain)
  }
  const growth: { date: string; total: number }[] = []
  let cumulative = 0
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = d.toISOString().split('T')[0]
    cumulative += byDay.get(key) ?? 0
    growth.push({ date: key.slice(5), total: Math.round(cumulative * 4) / 4 })
  }

  const allProgress = CAREERS.map(c => computeCareerProgress(c, nodes))
  const interests = (saved?.interestAreas as string[]) ?? []
  const ranked = [...allProgress].sort((a, b) => {
    const ai = interests.includes(a.id) ? 1 : 0
    const bi = interests.includes(b.id) ? 1 : 0
    if (ai !== bi) return bi - ai
    return b.readiness - a.readiness
  })
  const radar = ranked.slice(0, 8).map(p => ({ career: p.label, readiness: p.readiness }))

  const weekEventIds = new Set(events90.filter(e => e.timestamp >= weekAgo).map(e => e.skillNodeId))
  const advancement = allProgress
    .map(p => ({ label: p.label, count: p.matched.filter(m => weekEventIds.has(m.id)).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  const topCareer = ranked[0]
  const nextRecommended = topCareer?.recommendedNext ?? []

  // ── Evaluation dataset ──────────────────────────────────────────────────────
  const evaluation = computeEvaluation(
    nodes.map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel, nextReviewAt: n.nextReviewAt?.toISOString() ?? null })),
    events120.map(e => ({ skillNodeId: e.skillNodeId, eventType: e.eventType, score: e.score, masteryGain: e.masteryGain, timestamp: e.timestamp.toISOString() })),
    sessions.map(s => ({ skillNodeId: s.skillNodeId, durationMins: s.durationMins })),
  )

  return (
    <AnalyticsClient
      progress={{
        masteredThisMonth,
        inProgress,
        growth,
        radar,
        advancement,
        topCareerLabel: topCareer?.label ?? '',
        nextRecommended,
      }}
      evaluation={evaluation}
    />
  )
}
