import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import { SUBJECTS } from '@/lib/xp'
import { Loader2 } from 'lucide-react'
import QuizPageClient from '@/components/QuizPageClient'

export default async function QuizPage() {
  const [recentExams, subjectStats] = await Promise.all([
    prisma.quizResult.findMany({
      where: { quiz: { quizType: 'exam' } },
      orderBy: { takenAt: 'desc' },
      take: 6,
      include: { quiz: { select: { topicName: true, subject: true } } },
    }),
    Promise.all(SUBJECTS.map(async s => {
      const studied = await prisma.skillNode.count({ where: { subject: s, masteryLevel: { gt: 0 } } })
      // 5 unlocked topics without templates yet — candidates for batch pre-gen
      const batchTopics = await prisma.skillNode.findMany({
        where: { subject: s, status: { in: ['unlocked', 'in_progress'] }, quizTemplates: { none: {} } },
        select: { id: true, name: true }, take: 5,
      })
      return { subject: s, studied, batchTopics: batchTopics.map(t => ({ skillNodeId: t.id, topicName: t.name })) }
    })),
  ])

  const recentExamsPlain = recentExams.map(r => ({
    id: r.id, score: r.score, passed: r.passed,
    takenAt: r.takenAt.toISOString(),
    topicName: r.quiz.topicName, subject: r.quiz.subject,
  }))

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Quiz & Exams</h1>
        <p className="text-sm text-gray-500 mt-0.5">Test your knowledge. Passing a quiz improves your mastery rating.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-orange-500" /></div>}>
        <QuizPageClient subjectStats={subjectStats} recentExams={recentExamsPlain} />
      </Suspense>
    </div>
  )
}
