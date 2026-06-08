import prisma from '@/lib/prisma'
import { SUBJECTS, SUBJECT_LABEL } from '@/lib/xp'
import { differenceInDays, format } from 'date-fns'
import { Clock, BookOpen, ChevronRight, CheckCircle2, Calendar, List } from 'lucide-react'
import Link from 'next/link'

function urgencyClass(daysLeft: number) {
  if (daysLeft <= 2) return 'text-red-400'
  if (daysLeft <= 5) return 'text-yellow-400'
  return 'text-gray-400'
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    exam:       'bg-red-900/50 text-red-300',
    assignment: 'bg-blue-900/50 text-blue-300',
    quiz:       'bg-yellow-900/50 text-yellow-300',
    reading:    'bg-green-900/50 text-green-300',
  }
  return map[type] ?? 'bg-gray-800 text-gray-300'
}

export default async function DashboardPage() {
  const [skillNodes, upcomingDeadlines, activeTopics] = await Promise.all([
    prisma.skillNode.findMany(),
    prisma.deadline.findMany({
      where: { completed: false },
      orderBy: { dueDate: 'asc' },
      take: 3,
      include: { course: { select: { name: true, subject: true } } },
    }),
    prisma.topic.findMany({
      where: { status: 'pending', course: { status: 'active' } },
      include: { course: { select: { name: true, code: true } } },
      orderBy: [{ week: 'asc' }],
      take: 6,
    }),
  ])

  const subjectProgress = SUBJECTS.map(subject => {
    const nodes = skillNodes.filter(n => n.subject === subject)
    const mastered = nodes.filter(n => n.status === 'mastered').length
    const pct = nodes.length > 0 ? Math.round((mastered / nodes.length) * 100) : 0
    return { subject, mastered, total: nodes.length, pct }
  })

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* ── Subject progress ─────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">Subject Progress</h2>
          <Link href="/topics" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            Browse topics <ChevronRight size={12} />
          </Link>
        </div>
        <div className="space-y-4">
          {subjectProgress.map(({ subject, mastered, total, pct }) => (
            <div key={subject}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm text-gray-300">{SUBJECT_LABEL[subject]}</span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {mastered}/{total} done
                  <span className="text-purple-500 font-semibold ml-2">{pct}%</span>
                </span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Upcoming deadlines ───────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2">
            <Clock size={15} className="text-purple-400" />
            Upcoming Deadlines
          </h2>
          <Link href="/schedule" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Calendar size={32} className="text-gray-700" />
            <p className="text-sm text-gray-500">No upcoming deadlines</p>
            <Link
              href="/schedule"
              className="px-4 py-1.5 text-xs border border-purple-700/60 text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
            >
              + Add Deadline
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingDeadlines.map(dl => {
              const daysLeft = differenceInDays(new Date(dl.dueDate), new Date())
              return (
                <div key={dl.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{dl.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{dl.course.name}</span>
                      <span className={`badge ${typeBadge(dl.type)}`}>{dl.type}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 ${urgencyClass(daysLeft)}`}>
                    {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Active course topics ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2">
            <BookOpen size={15} className="text-purple-400" />
            Active Topics
          </h2>
          <Link href="/courses" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
            All courses <ChevronRight size={12} />
          </Link>
        </div>

        {activeTopics.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <List size={32} className="text-gray-700" />
            <p className="text-sm text-gray-500">No pending course topics</p>
            <Link
              href="/topics"
              className="px-4 py-1.5 text-xs border border-purple-700/60 text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
            >
              Browse Topics
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTopics.map(topic => (
              <div key={topic.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-gray-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">{topic.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {topic.course.code ?? topic.course.name} · Wk {topic.week}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
