import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import TopicsClient from '@/components/TopicsClient'
import { Loader2 } from 'lucide-react'

function computeTiers(
  nodeIds: string[],
  deps: { prerequisiteId: string; dependentId: string }[]
): Map<string, number> {
  const inDeg = new Map<string, number>(nodeIds.map(id => [id, 0]))
  const children = new Map<string, string[]>(nodeIds.map(id => [id, []]))

  for (const { prerequisiteId: src, dependentId: tgt } of deps) {
    if (inDeg.has(tgt) && children.has(src)) {
      inDeg.set(tgt, (inDeg.get(tgt) ?? 0) + 1)
      children.get(src)!.push(tgt)
    }
  }

  const tier = new Map<string, number>()
  const queue = nodeIds.filter(id => inDeg.get(id) === 0)
  queue.forEach(id => tier.set(id, 0))

  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]
    const l = tier.get(cur) ?? 0
    for (const child of children.get(cur) ?? []) {
      const prev = tier.get(child) ?? -1
      if (prev < l + 1) {
        tier.set(child, l + 1)
        queue.push(child)
      }
    }
  }

  return tier
}

export default async function TopicsPage() {
  const [nodes, deps] = await Promise.all([
    prisma.skillNode.findMany({ orderBy: [{ subject: 'asc' }, { name: 'asc' }] }),
    prisma.skillDependency.findMany(),
  ])

  const nodeIds = nodes.map(n => n.id)
  const tierMap = computeTiers(nodeIds, deps)

  const idToName = new Map(nodes.map(n => [n.id, n.name]))
  const prereqsOf = new Map<string, string[]>()
  for (const { prerequisiteId, dependentId } of deps) {
    if (!prereqsOf.has(dependentId)) prereqsOf.set(dependentId, [])
    prereqsOf.get(dependentId)!.push(prerequisiteId)
  }

  const topicNodes = nodes.map(n => ({
    id:          n.id,
    name:        n.name,
    subject:     n.subject,
    status:      n.status,
    tier:        tierMap.get(n.id) ?? 0,
    prereqNames: (prereqsOf.get(n.id) ?? []).map(pid => idToName.get(pid) ?? '').filter(Boolean),
  }))

  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <div className="p-5 md:px-8 md:py-5 border-b border-gray-800 shrink-0">
        <h1 className="text-2xl font-bold text-gray-100">Topics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Browse all topics by subject and tier. Complete prerequisites to unlock the next tier.
        </p>
      </div>
      {/* Suspense required by useSearchParams inside TopicsClient */}
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
