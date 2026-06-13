import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST() {
  // Delete in FK-safe order (dependents first)
  await prisma.masteryEvent.deleteMany({})
  await prisma.quizResult.deleteMany({})
  await prisma.quiz.deleteMany({})
  await prisma.quizTemplate.deleteMany({})
  await prisma.phaseLog.deleteMany({})
  await prisma.failedProblem.deleteMany({})
  await prisma.studySession.deleteMany({})
  await prisma.exerciseSet.deleteMany({})
  await prisma.deadline.deleteMany({})
  await prisma.realExam.deleteMany({})
  await prisma.upcomingExam.deleteMany({})
  await prisma.learningPath.deleteMany({})
  await prisma.conceptMapValidation.deleteMany({})
  await prisma.conceptMap.deleteMany({})
  await prisma.debateSession.deleteMany({})
  await prisma.teachSession.deleteMany({})
  await prisma.socraticSession.deleteMany({})
  await prisma.researchPaper.deleteMany({})
  await prisma.textbookChapter.deleteMany({})
  // Skill nodes: reset progress only, keep nodes and dependencies
  await prisma.skillNode.updateMany({
    data: { masteryLevel: 0, status: 'locked', nextReviewAt: null, reviewIntervalDays: 1, masteryUpdatedAt: null },
  })
  // Unlock tier-0 nodes (no prerequisites)
  const allDeps = await prisma.skillDependency.findMany({ select: { dependentId: true } })
  const hasDep = new Set(allDeps.map(d => d.dependentId))
  const allNodes = await prisma.skillNode.findMany({ select: { id: true } })
  const tier0Ids = allNodes.filter(n => !hasDep.has(n.id)).map(n => n.id)
  if (tier0Ids.length > 0) {
    await prisma.skillNode.updateMany({ where: { id: { in: tier0Ids } }, data: { status: 'unlocked' } })
  }
  await prisma.achievement.deleteMany({})

  await prisma.learningAbility.deleteMany({})
  await prisma.selfImprovementGoals.deleteMany({})
  await prisma.careerPathProgress.deleteMany({})
  await prisma.aPICall.deleteMany({})
  await prisma.responseCache.deleteMany({})
  await prisma.rateLimitLog.deleteMany({})
  await prisma.aPIUsage.deleteMany({})
  // Keep AppSetting (monthly cap preference)

  return NextResponse.json({ ok: true })
}
