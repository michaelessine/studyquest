/**
 * One-shot: rename Probability theory → Basics of Probability, Statistics → Basics of Statistics,
 * then add Advanced Probability Theory and Statistical Inference.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Find existing nodes
  const probNode = await prisma.skillNode.findFirst({ where: { name: 'Probability theory' } })
  const statsNode = await prisma.skillNode.findFirst({ where: { name: 'Statistics' } })

  if (!probNode) { console.log('Probability theory node not found — already renamed?'); }
  if (!statsNode) { console.log('Statistics node not found — already renamed?'); }

  if (probNode) {
    await prisma.skillNode.update({ where: { id: probNode.id }, data: { name: 'Basics of Probability' } })
    console.log('✓ Renamed Probability theory → Basics of Probability')
  }
  if (statsNode) {
    await prisma.skillNode.update({ where: { id: statsNode.id }, data: { name: 'Basics of Statistics' } })
    console.log('✓ Renamed Statistics → Basics of Statistics')
  }

  // Find Real analysis for prereq
  const realAnalysis = await prisma.skillNode.findFirst({ where: { name: 'Real analysis' } })
  const basicsProb = await prisma.skillNode.findFirst({ where: { name: 'Basics of Probability' } })
  const basicsStat = await prisma.skillNode.findFirst({ where: { name: 'Basics of Statistics' } })

  // Create Advanced Probability Theory
  const advProb = await prisma.skillNode.create({
    data: { name: 'Advanced Probability Theory', subject: 'Mathematics', category: 'Probability & Statistics', tier: 1, status: 'locked', masteryLevel: 0, xpValue: 200 },
  })
  console.log('✓ Created Advanced Probability Theory')
  if (basicsProb) await prisma.skillDependency.create({ data: { prerequisiteId: basicsProb.id, dependentId: advProb.id } })
  if (realAnalysis) await prisma.skillDependency.create({ data: { prerequisiteId: realAnalysis.id, dependentId: advProb.id } })

  // Create Statistical Inference
  const statInf = await prisma.skillNode.create({
    data: { name: 'Statistical Inference', subject: 'Mathematics', category: 'Probability & Statistics', tier: 1, status: 'locked', masteryLevel: 0, xpValue: 200 },
  })
  console.log('✓ Created Statistical Inference')
  if (basicsStat) await prisma.skillDependency.create({ data: { prerequisiteId: basicsStat.id, dependentId: statInf.id } })
  if (basicsProb) await prisma.skillDependency.create({ data: { prerequisiteId: basicsProb.id, dependentId: statInf.id } })

  console.log('Done!')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
