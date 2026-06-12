import prisma from '@/lib/prisma'
import { computeEvaluation } from '@/lib/evaluate'
import EvaluateClient from '@/components/EvaluateClient'

export const dynamic = 'force-dynamic'

export default async function EvaluatePage() {
  const since = new Date(Date.now() - 120 * 86_400_000)
  const [nodes, events, sessions] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true, nextReviewAt: true } }),
    prisma.masteryEvent.findMany({ where: { timestamp: { gte: since } }, select: { skillNodeId: true, eventType: true, score: true, masteryGain: true, timestamp: true } }),
    prisma.studySession.findMany({ select: { skillNodeId: true, durationMins: true } }),
  ])

  const evaluation = computeEvaluation(
    nodes.map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel, nextReviewAt: n.nextReviewAt?.toISOString() ?? null })),
    events.map(e => ({ skillNodeId: e.skillNodeId, eventType: e.eventType, score: e.score, masteryGain: e.masteryGain, timestamp: e.timestamp.toISOString() })),
    sessions.map(s => ({ skillNodeId: s.skillNodeId, durationMins: s.durationMins })),
  )

  return <EvaluateClient evaluation={evaluation} />
}
