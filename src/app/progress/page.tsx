import prisma from '@/lib/prisma'
import { CAREERS, computeCareerProgress } from '@/lib/careers'
import ProgressClient from '@/components/ProgressClient'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000)
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)

  const [nodes, events, saved] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true, status: true, masteryUpdatedAt: true } }),
    prisma.masteryEvent.findMany({
      where: { timestamp: { gte: ninetyAgo }, masteryGain: { gt: 0 } },
      select: { skillNodeId: true, masteryGain: true, timestamp: true, eventType: true },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.careerPathProgress.findUnique({ where: { userId: 'default' } }),
  ])

  // Topics mastered this month
  const masteredThisMonth = nodes
    .filter(n => n.masteryLevel >= 5 && n.masteryUpdatedAt && n.masteryUpdatedAt >= monthStart)
    .map(n => ({ id: n.id, name: n.name, subject: n.subject, date: n.masteryUpdatedAt!.toISOString() }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))

  // In-progress topics grouped by subject, sorted by mastery desc
  const inProgress = nodes
    .filter(n => n.masteryLevel > 0 && n.masteryLevel < 5)
    .map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel }))

  // Mastery growth: cumulative total stars earned per day (last 90 days)
  const byDay = new Map<string, number>()
  for (const e of events) {
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

  // Career progress + radar (top 8 by readiness, preferring saved interests)
  const allProgress = CAREERS.map(c => computeCareerProgress(c, nodes))
  const interests = (saved?.interestAreas as string[]) ?? []
  const ranked = [...allProgress].sort((a, b) => {
    const ai = interests.includes(a.id) ? 1 : 0
    const bi = interests.includes(b.id) ? 1 : 0
    if (ai !== bi) return bi - ai
    return b.readiness - a.readiness
  })
  const radar = ranked.slice(0, 8).map(p => ({ career: p.label, readiness: p.readiness }))

  // This week's advancement: distinct topics with gains in last 7 days, mapped to careers
  const weekEventIds = new Set(events.filter(e => e.timestamp >= weekAgo).map(e => e.skillNodeId))
  const advancement = allProgress
    .map(p => ({ label: p.label, count: p.matched.filter(m => weekEventIds.has(m.id)).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  // Next recommended: from the top career path
  const topCareer = ranked[0]
  const nextRecommended = topCareer?.recommendedNext ?? []

  return (
    <ProgressClient
      masteredThisMonth={masteredThisMonth}
      inProgress={inProgress}
      growth={growth}
      radar={radar}
      advancement={advancement}
      topCareerLabel={topCareer?.label ?? ''}
      nextRecommended={nextRecommended}
    />
  )
}
