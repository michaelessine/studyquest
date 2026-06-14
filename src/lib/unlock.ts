import prisma from './prisma'

// PART 3: a topic unlocks when ALL prerequisites reach this mastery level.
export const UNLOCK_THRESHOLD = 2.0

/**
 * Full fixed-point cascade unlock.
 * Fetches all nodes + dependencies once, then repeatedly marks locked nodes
 * as 'unlocked' if every prerequisite has masteryLevel >= UNLOCK_THRESHOLD — until
 * no more nodes change in a pass. Batch-writes all changes in one query.
 */
export async function cascadeUnlock(): Promise<{ id: string; name: string }[]> {
  const [nodes, deps] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, status: true, masteryLevel: true } }),
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
      if (prereqs.every(pid => (masteryMap.get(pid) ?? 0) >= UNLOCK_THRESHOLD)) {
        statusMap.set(id, 'unlocked')
        changed = true
      }
    }
  }

  // Batch-write all newly unlocked nodes
  const unlocked = nodes.filter(n => n.status === 'locked' && statusMap.get(n.id) === 'unlocked').map(n => ({ id: n.id, name: n.name }))
  if (unlocked.length > 0) {
    await prisma.skillNode.updateMany({ where: { id: { in: unlocked.map(u => u.id) } }, data: { status: 'unlocked' } })
  }
  return unlocked
}
