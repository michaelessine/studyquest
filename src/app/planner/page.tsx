import prisma from '@/lib/prisma'
import { computeExamPlan } from '@/lib/examPlan'
import PlannerClient from '@/components/PlannerClient'

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const [exams, nodes, deps, courses] = await Promise.all([
    prisma.upcomingExam.findMany({ orderBy: { examDate: 'asc' } }),
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, masteryLevel: true, tier: true, courseId: true } }),
    prisma.skillDependency.findMany({ select: { prerequisiteId: true, dependentId: true } }),
    prisma.course.findMany({ where: { status: 'active' }, select: { id: true, name: true, code: true, subject: true }, orderBy: { name: 'asc' } }),
  ])

  const nodesById = new Map(nodes.map(n => [n.id, n]))
  const prereqsOf = new Map<string, string[]>()
  for (const { prerequisiteId, dependentId } of deps) {
    if (!prereqsOf.has(dependentId)) prereqsOf.set(dependentId, [])
    prereqsOf.get(dependentId)!.push(prerequisiteId)
  }

  const planned = exams.map(e => {
    const ids = Array.isArray(e.skillNodeIds) ? (e.skillNodeIds as string[]) : []
    const plan = computeExamPlan(e.examDate, ids, nodesById, prereqsOf)
    return {
      id: e.id, name: e.name, subject: e.subject,
      examDate: e.examDate.toISOString(),
      plan,
    }
  })

  return (
    <PlannerClient
      exams={planned}
      topics={nodes.map(n => ({ id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel, courseId: n.courseId }))}
      courses={courses}
    />
  )
}
