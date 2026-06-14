// Courses page — lists all courses grouped by subject, with add/upload actions
import prisma from '@/lib/prisma'
import { SUBJECTS, SUBJECT_LABEL } from '@/lib/xp'
import AddCourseModal from '@/components/AddCourseModal'
import DeleteCourseButton from '@/components/DeleteCourseButton'
import MoveCourseButton from '@/components/MoveCourseButton'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'


export const dynamic = 'force-dynamic'

function MiniBar({ label, done, total, pct }: { label: string; done: number; total: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-gray-600 mb-0.5">
        <span>{label}</span>
        <span>{done}/{total}</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-orange-600 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CourseCard({ course }: { course: Awaited<ReturnType<typeof prisma.course.findMany>>[number] & { topics: { status: string }[]; _count: { topics: number; deadlines: number } } }) {
  const doneTopic = course.topics.filter(t => t.status === 'done').length
  const totalTopic = course.topics.length
  const topicPct = totalTopic > 0 ? Math.round((doneTopic / totalTopic) * 100) : 0
  const exPct = course.exerciseSetsTotal > 0 ? Math.round((course.exerciseSetsDone / course.exerciseSetsTotal) * 100) : null
  const qzPct = course.quizzesTotal > 0 ? Math.round((course.quizzesDone / course.quizzesTotal) * 100) : null

  return (
    <div className="relative">
      <DeleteCourseButton id={course.id} name={course.name} />
      <MoveCourseButton id={course.id} currentSubject={course.subject} />
      <Link href={`/courses/${course.id}`} className="card p-4 hover:border-gray-700 transition-colors block">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            {course.code && <span className="text-xs text-gray-500 font-mono">{course.code}</span>}
            <h3 className="text-sm font-semibold text-gray-200 leading-snug pr-6">{course.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {course.status === 'completed' && course.grade != null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-800">
                {course.grade}/5
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {course.semester && course.year && <span>{course.semester} {course.year}</span>}
        </div>
        <div className="space-y-2">
          {exPct !== null && <MiniBar label="Exercise sets" done={course.exerciseSetsDone} total={course.exerciseSetsTotal} pct={exPct} />}
          {qzPct !== null && <MiniBar label="Quizzes" done={course.quizzesDone} total={course.quizzesTotal} pct={qzPct} />}
          {totalTopic > 0 && <MiniBar label="Topics" done={doneTopic} total={totalTopic} pct={topicPct} />}
        </div>
        {course._count.deadlines > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            {course._count.deadlines} deadline{course._count.deadlines !== 1 ? 's' : ''}
          </div>
        )}
        <span className="mt-3 flex items-center gap-1 text-xs text-orange-400">
          Open course <ChevronRight size={11} />
        </span>
      </Link>
    </div>
  )
}

function SubjectGroup({ subject, courses }: { subject: string; courses: Parameters<typeof CourseCard>[0]['course'][] }) {
  if (courses.length === 0) return null
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 pl-0.5">
        {SUBJECT_LABEL[subject as keyof typeof SUBJECT_LABEL]}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {courses.map(c => <CourseCard key={c.id} course={c} />)}
      </div>
    </div>
  )
}

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    include: {
      _count: { select: { topics: true, deadlines: true } },
      topics: { select: { status: true } },
    },
    orderBy: [{ year: 'desc' }, { semester: 'asc' }, { name: 'asc' }],
  })

  const active    = courses.filter(c => c.status === 'active')
  const completed = courses.filter(c => c.status === 'completed')
  const planned   = courses.filter(c => c.status === 'planned')

  const bySubject = (list: typeof courses) =>
    SUBJECTS.map(s => ({ subject: s, courses: list.filter(c => c.subject === s) }))

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {active.length} active · {completed.length} completed{planned.length > 0 ? ` · ${planned.length} planned` : ''}
          </p>
        </div>
        <AddCourseModal />
      </div>

      {courses.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No courses yet.</p>
          <p className="text-sm text-gray-600 mt-1">Add your first course or upload a transcript PDF.</p>
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-green-400 uppercase tracking-wider">Active</span>
            <div className="flex-1 h-px bg-green-900/40" />
            <span className="text-xs text-gray-600">{active.length} course{active.length !== 1 ? 's' : ''}</span>
          </div>
          {bySubject(active).map(({ subject, courses: sc }) => (
            <SubjectGroup key={subject} subject={subject} courses={sc} />
          ))}
        </section>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Planned</span>
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">{planned.length} course{planned.length !== 1 ? 's' : ''}</span>
          </div>
          {bySubject(planned).map(({ subject, courses: sc }) => (
            <SubjectGroup key={subject} subject={subject} courses={sc} />
          ))}
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-orange-400 uppercase tracking-wider">Completed</span>
            <div className="flex-1 h-px bg-orange-900/30" />
            <span className="text-xs text-gray-600">{completed.length} course{completed.length !== 1 ? 's' : ''}</span>
          </div>
          {bySubject(completed).map(({ subject, courses: sc }) => (
            <SubjectGroup key={subject} subject={subject} courses={sc} />
          ))}
        </section>
      )}
    </div>
  )
}
