import prisma from './prisma'

/**
 * After nodeId gains masteryLevel ≥ 1, recursively unlock every locked
 * dependent whose ALL prerequisites now have masteryLevel ≥ 1.
 */
export async function checkAndUnlockDependents(nodeId: string): Promise<void> {
  const outgoing = await prisma.skillDependency.findMany({
    where: { prerequisiteId: nodeId },
    select: { dependentId: true },
  })

  for (const { dependentId } of outgoing) {
    const dep = await prisma.skillNode.findUnique({
      where: { id: dependentId },
      select: { status: true },
    })
    if (!dep || dep.status !== 'locked') continue

    const allPrereqs = await prisma.skillDependency.findMany({
      where: { dependentId },
      select: { prerequisiteId: true },
    })
    const prereqNodes = await prisma.skillNode.findMany({
      where: { id: { in: allPrereqs.map(p => p.prerequisiteId) } },
      select: { masteryLevel: true },
    })

    if (prereqNodes.every(p => p.masteryLevel >= 1)) {
      await prisma.skillNode.update({
        where: { id: dependentId },
        data: { status: 'unlocked' },
      })
      // Recurse — unlocking this node may enable further dependents
      await checkAndUnlockDependents(dependentId)
    }
  }
}
