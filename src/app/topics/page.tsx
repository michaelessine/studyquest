import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import TopicsClient from '@/components/TopicsClient'
import { Loader2 } from 'lucide-react'

export default async function TopicsPage() {
  const [nodes, deps] = await Promise.all([
    prisma.skillNode.findMany({ orderBy: [{ subject: 'asc' }, { category: 'asc' }, { tier: 'asc' }, { name: 'asc' }] }),
    prisma.skillDependency.findMany(),
  ])

  const idToName  = new Map(nodes.map(n => [n.id, n.name]))
  const prereqsOf = new Map<string, string[]>()
  for (const { prerequisiteId, dependentId } of deps) {
    if (!prereqsOf.has(dependentId)) prereqsOf.set(dependentId, [])
    prereqsOf.get(dependentId)!.push(prerequisiteId)
  }

  const topicNodes = nodes.map(n => ({
    id:           n.id,
    name:         n.name,
    subject:      n.subject,
    status:       n.status,
    tier:         n.tier,
    category:     n.category,
    masteryLevel: n.masteryLevel,
    nextReviewAt: n.nextReviewAt?.toISOString() ?? null,
    prereqNames:  (prereqsOf.get(n.id) ?? []).map(pid => idToName.get(pid) ?? '').filter(Boolean),
  }))

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <div className="p-5 md:px-8 md:py-5 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold text-gray-100">Topics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Rate topics with stars to track mastery. Prerequisites unlock as you progress.
        </p>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Loading topics…</span>
        </div>
      }>
        <TopicsClient nodes={topicNodes} />
      </Suspense>
    </div>
  )
}
