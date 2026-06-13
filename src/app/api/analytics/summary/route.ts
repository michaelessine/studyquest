// GET /api/analytics/summary — aggregate study time + mastery stats
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const thirtyAgo = new Date(now.getTime() - 30 * 86_400_000)
  const [sessionLogs, studySessions, skillNodes, masteryEvents, phaseGroups] = await Promise.all([
    prisma.sessionLog.findMany({ select: { loggedAt: true, durationMins: true, courseId: true } }),
    prisma.studySession.findMany({ select: { startTime: true, durationMins: true, skillNodeId: true } }),
    prisma.skillNode.findMany({ select: { subject: true, masteryLevel: true } }),
    prisma.masteryEvent.findMany({ where: { timestamp: { gte: thirtyAgo }, masteryGain: { gt: 0 } }, select: { masteryGain: true, timestamp: true } }),
    prisma.phaseLog.groupBy({ by: ['phase'], _count: true }),
  ])

  // Unify both session sources into { date, mins }
  type Entry = { date: string; mins: number }
  const entries: Entry[] = [
    ...sessionLogs.map(s => ({ date: s.loggedAt.toISOString().split('T')[0], mins: s.durationMins })),
    ...studySessions.map(s => ({ date: s.startTime.toISOString().split('T')[0], mins: s.durationMins })),
  ]

  const totalMins = entries.reduce((sum, e) => sum + e.mins, 0)
  const totalHours = Math.round((totalMins / 60) * 10) / 10

  // Hours over time (last 30 days)
  const byDate = new Map<string, number>()
  for (const e of entries) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.mins)
  const today = new Date()
  const overTime: { date: string; hours: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const key = d.toISOString().split('T')[0]
    overTime.push({ date: key.slice(5), hours: Math.round(((byDate.get(key) ?? 0) / 60) * 10) / 10 })
  }

  // Weekly heatmap: minutes per day-of-week (0=Sun..6=Sat)
  const dow = [0, 0, 0, 0, 0, 0, 0]
  for (const e of entries) {
    const d = new Date(e.date)
    dow[d.getDay()] += e.mins
  }
  const heatmap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => ({
    day: label, mins: dow[i],
  }))

  // Mastery distribution by star bucket
  const buckets: Record<string, number> = { '0': 0, '1-2': 0, '3-4': 0, '5': 0 }
  for (const n of skillNodes) {
    if (n.masteryLevel >= 5) buckets['5']++
    else if (n.masteryLevel >= 3) buckets['3-4']++
    else if (n.masteryLevel >= 1) buckets['1-2']++
    else buckets['0']++
  }
  const masteryDistribution = [
    { level: 'Not started', count: buckets['0'],   color: '#374151' },
    { level: '★1-2',        count: buckets['1-2'], color: '#3b82f6' },
    { level: '★3-4',        count: buckets['3-4'], color: '#ea580c' },
    { level: '★5 Mastered', count: buckets['5'],   color: '#16a34a' },
  ]

  // Per-subject hours (StudySession links to nodes; SessionLog has no subject)
  const nodeSubject = new Map<string, string>()
  const nodesForSubject = await prisma.skillNode.findMany({ select: { id: true, subject: true } })
  for (const n of nodesForSubject) nodeSubject.set(n.id, n.subject)
  const bySubjectMins = new Map<string, number>()
  for (const s of studySessions) {
    if (!s.skillNodeId) continue
    const subj = nodeSubject.get(s.skillNodeId)
    if (!subj) continue
    bySubjectMins.set(subj, (bySubjectMins.get(subj) ?? 0) + s.durationMins)
  }
  const perSubject = Array.from(bySubjectMins.entries()).map(([subject, mins]) => ({ subject, hours: Math.round((mins / 60) * 10) / 10 }))

  // Semester goal pace (assume 100h goal, ~16 week semester)
  const semesterGoalHours = 100
  const onPace = totalHours
  const projection = Math.round(onPace * 1.5 * 10) / 10 // naive projection

  // ── Streaks (consecutive days with any study) ───────────────────────────────
  const dk = (d: Date) => d.toISOString().split('T')[0]
  const studiedDays = new Set(entries.map(e => e.date))
  let currentStreak = 0
  {
    const cursor = new Date(now)
    if (!studiedDays.has(dk(cursor))) cursor.setDate(cursor.getDate() - 1) // grace for "not yet today"
    while (studiedDays.has(dk(cursor))) { currentStreak++; cursor.setDate(cursor.getDate() - 1) }
  }
  let longestStreak = 0
  {
    let run = 0; let prev: number | null = null
    for (const ds of Array.from(studiedDays).sort()) {
      const t = new Date(ds).getTime()
      run = prev !== null && t - prev === 86_400_000 ? run + 1 : 1
      if (run > longestStreak) longestStreak = run
      prev = t
    }
  }

  // ── Momentum: this week vs last week ────────────────────────────────────────
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000)
  let thisWeekMins = 0, lastWeekMins = 0
  for (const e of entries) {
    const d = new Date(e.date)
    if (d >= weekAgo) thisWeekMins += e.mins
    else if (d >= twoWeeksAgo) lastWeekMins += e.mins
  }
  const thisWeekHours = Math.round((thisWeekMins / 60) * 10) / 10
  const lastWeekHours = Math.round((lastWeekMins / 60) * 10) / 10
  const weekDeltaPct = lastWeekMins > 0 ? Math.round(((thisWeekMins - lastWeekMins) / lastWeekMins) * 100) : null

  // ── Consistency + session shape ─────────────────────────────────────────────
  const activeDays30 = Array.from(studiedDays).filter(ds => new Date(ds) >= thirtyAgo).length
  const avgSessionMins = entries.length > 0 ? Math.round(totalMins / entries.length) : 0
  const busiestIdx = dow.indexOf(Math.max(...dow))
  const busiestDay = dow[busiestIdx] > 0 ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][busiestIdx] : null

  // ── Mastery velocity (stars earned) ─────────────────────────────────────────
  let starsEarned7 = 0, starsEarned30 = 0
  for (const m of masteryEvents) {
    starsEarned30 += m.masteryGain
    if (m.timestamp >= weekAgo) starsEarned7 += m.masteryGain
  }
  starsEarned7 = Math.round(starsEarned7 * 4) / 4
  starsEarned30 = Math.round(starsEarned30 * 4) / 4

  const masteredCount = skillNodes.filter(n => n.masteryLevel >= 5).length
  const inProgressCount = skillNodes.filter(n => n.masteryLevel > 0 && n.masteryLevel < 5).length

  // ── Studying-workflow phase balance (all topics) ────────────────────────────
  const phaseTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const g of phaseGroups) phaseTotals[g.phase] = g._count
  const phaseTotal = Object.values(phaseTotals).reduce((a, b) => a + b, 0)

  return NextResponse.json({
    totalHours, totalSessions: entries.length,
    overTime, heatmap, masteryDistribution, perSubject,
    semesterGoalHours, projection,
    currentStreak, longestStreak,
    thisWeekHours, lastWeekHours, weekDeltaPct,
    activeDays30, avgSessionMins, busiestDay,
    starsEarned7, starsEarned30,
    masteredCount, inProgressCount,
    phaseTotals, phaseTotal,
  })
}
