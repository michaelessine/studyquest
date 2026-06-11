// GET /api/analytics/summary — aggregate study time + mastery stats
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [sessionLogs, studySessions, skillNodes] = await Promise.all([
    prisma.sessionLog.findMany({ select: { loggedAt: true, durationMins: true, courseId: true } }),
    prisma.studySession.findMany({ select: { startTime: true, durationMins: true, skillNodeId: true } }),
    prisma.skillNode.findMany({ select: { subject: true, masteryLevel: true } }),
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

  return NextResponse.json({
    totalHours, totalSessions: entries.length,
    overTime, heatmap, masteryDistribution, perSubject,
    semesterGoalHours, projection,
  })
}
