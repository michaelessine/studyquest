import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import CourseDetailClient from '@/components/CourseDetailClient'
import { predictGrade } from '@/lib/courseGrade'

export const dynamic = 'force-dynamic'

export default async function CourseDetailPage({ params }: { params: { id: string } }) {
  const course = await prisma.course.findUnique({ where: { id: params.id } })
  if (!course) notFound()

  const [deadlines, subjectNodes, exerciseSets] = await Promise.all([
    prisma.deadline.findMany({ where: { courseId: course.id }, orderBy: { dueDate: 'asc' } }),
    prisma.skillNode.findMany({ where: { subject: course.subject }, select: { id: true, name: true, masteryLevel: true, courseId: true }, orderBy: { name: 'asc' } }),
    prisma.exerciseSet.findMany({ where: { courseId: course.id }, select: { pctSolved: true } }),
  ])

  const linkedNodes = subjectNodes.filter(n => n.courseId === course.id)
  const solved = exerciseSets.map(e => e.pctSolved).filter((p): p is number => p != null)
  const avgPctSolved = solved.length > 0 ? Math.round(solved.reduce((a, b) => a + b, 0) / solved.length) : null
  const avgMastery = linkedNodes.length > 0
    ? Math.round((linkedNodes.reduce((a, n) => a + n.masteryLevel, 0) / linkedNodes.length) * 100) / 100
    : null

  const prediction = predictGrade({ avgMastery, linkedCount: linkedNodes.length, avgPctSolved })

  return (
    <CourseDetailClient
      course={{
        id: course.id, code: course.code, name: course.name, subject: course.subject,
        semester: course.semester, year: course.year, status: course.status, grade: course.grade,
        exerciseSetsTotal: course.exerciseSetsTotal, exerciseSetsDone: course.exerciseSetsDone,
        quizzesTotal: course.quizzesTotal, quizzesDone: course.quizzesDone,
      }}
      deadlines={deadlines.map(d => ({ id: d.id, title: d.title, type: d.type, dueDate: d.dueDate.toISOString(), completed: d.completed }))}
      linkedNodes={linkedNodes.map(n => ({ id: n.id, name: n.name, masteryLevel: n.masteryLevel }))}
      subjectTopics={subjectNodes.map(n => ({ id: n.id, name: n.name, masteryLevel: n.masteryLevel, linked: n.courseId === course.id }))}
      avgPctSolved={avgPctSolved}
      avgMastery={avgMastery}
      prediction={prediction}
    />
  )
}
