import prisma from '@/lib/prisma'
import LearningPathsClient from '@/components/LearningPathsClient'

export const dynamic = 'force-dynamic'

export default async function LearningPathsPage() {
  const [paths, nodes] = await Promise.all([
    prisma.learningPath.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true, status: true } }),
  ])

  const nodeMap: Record<string, { name: string; subject: string; masteryLevel: number; status: string }> = {}
  for (const n of nodes) nodeMap[n.id] = { name: n.name, subject: n.subject, masteryLevel: n.masteryLevel, status: n.status }

  const plainPaths = paths.map(p => ({
    id: p.id,
    name: p.name,
    subject: p.subject,
    goalDescription: p.goalDescription,
    topics: (p.topics as string[]) ?? [],
    estimatedHours: (p.estimatedHours as Record<string, number>) ?? {},
    pinned: p.pinned,
    completedAt: p.completedAt?.toISOString() ?? null,
  }))

  return <LearningPathsClient initialPaths={plainPaths} nodeMap={nodeMap} />
}
