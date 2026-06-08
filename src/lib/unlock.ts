import prisma from './prisma'

/**
 * Full fixed-point cascade unlock.
 * Fetches all nodes + dependencies once, then repeatedly marks locked nodes
 * as 'unlocked' if every prerequisite has masteryLevel >= 1 — until
 * no more nodes change in a pass. Batch-writes all changes in one query.
 */
export async function cascadeUnlock(): Promise<number> {
  const [nodes, deps] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, status: true, masteryLevel: true } }),
    prisma.skillDependency.findMany({ select: { prerequisiteId: true, dependentId: true } }),
  ])

  // Build maps for O(n) lookups
  const masteryMap = new Map<string, number>(nodes.map(n => [n.id, n.masteryLevel]))
  const statusMap  = new Map<string, string>(nodes.map(n => [n.id, n.status]))

  // prerequisiteId[] per dependent
  const prereqsOf = new Map<string, string[]>()
  for (const d of deps) {
    if (!prereqsOf.has(d.dependentId)) prereqsOf.set(d.dependentId, [])
    prereqsOf.get(d.dependentId)!.push(d.prerequisiteId)
  }

  // Fixed-point: keep unlocking until no more changes
  let changed = true
  while (changed) {
    changed = false
    for (const { id } of nodes) {
      if (statusMap.get(id) !== 'locked') continue
      const prereqs = prereqsOf.get(id) ?? []
      if (prereqs.length === 0) continue  // no prereqs → seeder should have started it unlocked
      if (prereqs.every(pid => (masteryMap.get(pid) ?? 0) >= 1)) {
        statusMap.set(id, 'unlocked')
        changed = true
      }
    }
  }

  // Batch-write all newly unlocked nodes
  const toUnlock = nodes.filter(n => n.status === 'locked' && statusMap.get(n.id) === 'unlocked').map(n => n.id)
  if (toUnlock.length > 0) {
    await prisma.skillNode.updateMany({ where: { id: { in: toUnlock } }, data: { status: 'unlocked' } })
  }
  return toUnlock.length
}
