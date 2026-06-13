// GET /api/analytics/method-effectiveness
// For each phase 1-4, compares avg mastery velocity of topics that have that
// phase logged vs topics that don't. Velocity = total masteryGain / weeks active.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [nodes, events, phaseLogs] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true } }),
    prisma.masteryEvent.findMany({
      where: { masteryGain: { gt: 0 } },
      select: { skillNodeId: true, masteryGain: true, timestamp: true },
    }),
    prisma.phaseLog.findMany({ select: { skillNodeId: true, phase: true } }),
  ])

  if (nodes.length === 0) return NextResponse.json({ phases: [], topInsight: null })

  // Phase counts per node
  const phasesPerNode = new Map<string, Record<number, number>>()
  for (const l of phaseLogs) {
    if (!phasesPerNode.has(l.skillNodeId)) phasesPerNode.set(l.skillNodeId, { 1: 0, 2: 0, 3: 0, 4: 0 })
    const m = phasesPerNode.get(l.skillNodeId)!
    m[l.phase] = (m[l.phase] ?? 0) + 1
  }

  // Mastery velocity per node: total gain / weeks between first and last event (min 1)
  const gainPerNode = new Map<string, number>()
  const firstEventPerNode = new Map<string, number>()
  const lastEventPerNode = new Map<string, number>()
  for (const e of events) {
    gainPerNode.set(e.skillNodeId, (gainPerNode.get(e.skillNodeId) ?? 0) + e.masteryGain)
    const t = e.timestamp.getTime()
    if (!firstEventPerNode.has(e.skillNodeId) || t < firstEventPerNode.get(e.skillNodeId)!) firstEventPerNode.set(e.skillNodeId, t)
    if (!lastEventPerNode.has(e.skillNodeId) || t > lastEventPerNode.get(e.skillNodeId)!) lastEventPerNode.set(e.skillNodeId, t)
  }

  // Only include nodes with at least one mastery event
  const activeNodes = nodes.filter(n => gainPerNode.has(n.id))
  if (activeNodes.length === 0) return NextResponse.json({ phases: [], topInsight: null })

  function velocity(nodeId: string): number {
    const gain = gainPerNode.get(nodeId) ?? 0
    const first = firstEventPerNode.get(nodeId)!
    const last = lastEventPerNode.get(nodeId)!
    const weeks = Math.max(1, (last - first) / (7 * 86_400_000))
    return gain / weeks
  }

  // For each phase: split active nodes into "used this phase" vs "didn't"
  type PhaseResult = {
    phase: number
    withCount: number; withAvgVelocity: number
    withoutCount: number; withoutAvgVelocity: number
    ratio: number
  }
  const phases: PhaseResult[] = []

  for (const phase of [1, 2, 3, 4]) {
    const withPhase = activeNodes.filter(n => (phasesPerNode.get(n.id)?.[phase] ?? 0) > 0)
    const withoutPhase = activeNodes.filter(n => (phasesPerNode.get(n.id)?.[phase] ?? 0) === 0)

    if (withPhase.length === 0 || withoutPhase.length === 0) continue

    const avg = (arr: typeof activeNodes) => arr.reduce((s, n) => s + velocity(n.id), 0) / arr.length
    const withAvg = avg(withPhase)
    const withoutAvg = avg(withoutPhase)
    const ratio = withoutAvg > 0 ? withAvg / withoutAvg : withAvg > 0 ? 2 : 1

    phases.push({
      phase, withCount: withPhase.length, withAvgVelocity: Math.round(withAvg * 100) / 100,
      withoutCount: withoutPhase.length, withoutAvgVelocity: Math.round(withoutAvg * 100) / 100,
      ratio: Math.round(ratio * 10) / 10,
    })
  }

  // Top insight: phase with biggest positive ratio
  const topPhase = [...phases].sort((a, b) => b.ratio - a.ratio)[0] ?? null
  const topInsight = topPhase
    ? topPhase.ratio >= 1.1
      ? `Topics where you log Phase ${topPhase.phase} gain mastery ${topPhase.ratio}× faster than those without it.`
      : `No single phase stands out yet — keep logging phases to see patterns emerge.`
    : null

  return NextResponse.json({ phases, topInsight })
}
