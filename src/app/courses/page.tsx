// Courses page — lists all courses grouped by subject, with add/upload actions
import prisma from '@/lib/prisma'
import { SUBJECTS, SUBJECT_LABEL } from '@/lib/xp'
import AddCourseModal from '@/components/AddCourseModal'
import Link from 'next/link'
import { BookOpen, GraduationCap, ChevronRight } from 'lucide-react'

// Status badge styling
function statusStyle(status: string) {
  const map: Record<string, string> = {
    active:    'bg-green-900/50 text-green-300 border-green-800',
    completed: 'bg-purple-900/50 text-purple-300 border-purple-800',
    planned:   'bg-gray-800 text-gray-400 border-gray-700',
  }
  return map[status] ?? 'bg-gray-800 text-gray-400'
}

export default async function CoursesPage() {
  // Fetch courses with topic counts
  const courses = await prisma.course.findMany({
    include: {
      _count: { select: { topics: true, deadlines: true } },
      topics: { select: { status: true } },
    },
    orderBy: [{ status: 'asc' }, { year: 'desc' }, { semester: 'asc' }],
  })

  // Group by subject
  const bySubject = SUBJECTS.map(subject => ({
    subject,
    courses: courses.filter(c => c.subject === subject),
  }))

  const totalActive = courses.filter(c => c.status === 'active').length

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {courses.length} total · {totalActive} active
          </p>
        </div>

        {/* Client component handles add & PDF upload interactions */}
        <AddCourseModal />
      </div>

      {/* ── Courses by subject ────────────────────────────────────────────── */}
      {bySubject.map(({ subject, courses: subCourses }) => {
        if (subCourses.length === 0) return null
        return (
          <section key={subject}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {SUBJECT_LABEL[subject]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {subCourses.map(course => {
                const doneTopic = course.topics.filter(t => t.status === 'done').length
                const totalTopic = course.topics.length
                const topicPct = totalTopic > 0 ? Math.round((doneTopic / totalTopic) * 100) : 0

                return (
                  <div key={course.id} className="card p-4 hover:border-gray-700 transition-colors">
                    {/* Course header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        {course.code && (
                          <span className="text-xs text-gray-500 font-mono">{course.code}</span>
                        )}
                        <h3 className="text-sm font-semibold text-gray-200 leading-snug">
                          {course.name}
                        </h3>
                      </div>
                      <span className={`badge border shrink-0 ${statusStyle(course.status)}`}>
                        {course.status}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      {course.semester && course.year && (
                        <span>{course.semester} {course.year}</span>
                      )}
                      {course.grade != null && (
                        <span className="text-purple-400 font-semibold flex items-center gap-1">
                          <GraduationCap size={12} /> {course.grade.toFixed(1)}
                        </span>
                      )}
                    </div>

                    {/* Topic progress */}
                    {totalTopic > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span className="flex items-center gap-1">
                            <BookOpen size={11} /> Topics
                          </span>
                          <span>{doneTopic}/{totalTopic}</span>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full"
                            style={{ width: `${topicPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Deadline count */}
                    {course._count.deadlines > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {course._count.deadlines} deadline{course._count.deadlines !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Deep-link to Topics filtered by subject */}
                    <Link
                      href={`/topics?subject=${course.subject}`}
                      className="mt-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      View topics <ChevronRight size={11} />
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {courses.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No courses yet.</p>
          <p className="text-sm text-gray-600 mt-1">Add your first course or upload a transcript PDF.</p>
        </div>
      )}
    </div>
  )
}
