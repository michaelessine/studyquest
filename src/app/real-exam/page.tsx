import prisma from '@/lib/prisma'
import RealExamClient from '@/components/RealExamClient'

export const dynamic = 'force-dynamic'

export default async function RealExamPage() {
  const [nodes, exams] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true }, orderBy: [{ subject: 'asc' }, { name: 'asc' }] }),
    prisma.realExam.findMany({ orderBy: { date: 'desc' }, take: 10 }),
  ])

  const plainExams = exams.map(e => ({
    id: e.id, examName: e.examName, subject: e.subject, grade: e.grade,
    date: e.date.toISOString(),
    impactCount: Object.keys((e.masteryImpact as Record<string, number>) ?? {}).length,
  }))

  return <RealExamClient nodes={nodes} recentExams={plainExams} />
}
