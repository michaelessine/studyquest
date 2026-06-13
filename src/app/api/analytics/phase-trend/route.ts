// GET /api/analytics/phase-trend
// Returns weekly phase activity counts for the last 10 weeks.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function weekStart(date: Date): string {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()) // Sunday
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const since = new Date(Date.now() - 10 * 7 * 86_400_000)
  const logs = await prisma.phaseLog.findMany({
    where: { timestamp: { gte: since } },
    select: { phase: true, timestamp: true },
  })

  // Build week buckets
  const buckets = new Map<string, Record<number, number>>()
  for (const l of logs) {
    const wk = weekStart(l.timestamp)
    if (!buckets.has(wk)) buckets.set(wk, { 1: 0, 2: 0, 3: 0, 4: 0 })
    buckets.get(wk)![l.phase] = (buckets.get(wk)![l.phase] ?? 0) + 1
  }

  // Fill all 10 weeks even if empty
  const weeks: { week: string; p1: number; p2: number; p3: number; p4: number }[] = []
  for (let i = 9; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86_400_000)
    const wk = weekStart(d)
    const b = buckets.get(wk) ?? { 1: 0, 2: 0, 3: 0, 4: 0 }
    const label = new Date(wk).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    weeks.push({ week: label, p1: b[1], p2: b[2], p3: b[3], p4: b[4] })
  }

  return NextResponse.json({ weeks })
}
