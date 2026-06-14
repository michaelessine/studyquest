import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import { SUBJECTS, SUBJECT_LABEL } from '@/lib/xp'
import { differenceInDays, format } from 'date-fns'
import { Clock, BookOpen, ChevronRight, CheckCircle2, Calendar, List, AlertCircle, GraduationCap, Route, Workflow } from 'lucide-react'
import Link from 'next/link'
import DashboardClient from '@/components/DashboardClient'
import QuickLog from '@/components/QuickLog'
import TodayCenter from '@/components/TodayCenter'

function urgencyClass(d: number) {
  return d <= 2 ? 'text-red-400' : d <= 5 ? 'text-yellow-400' : 'text-gray-400'
}
function typeBadge(t: string) {
  const m: Record<string,string> = { exam:'bg-red-900/50 text-red-300', assignment:'bg-blue-900/50 text-blue-300', quiz:'bg-yellow-900/50 text-yellow-300', reading:'bg-green-900/50 text-green-300' }
  return m[t] ?? 'bg-gray-800 text-gray-300'
}

export default async function DashboardPage() {
  const [skillNodes, upcomingDeadlines, activeTopics, recentExams, openDeadlines, openMistakes, upcomingExamsRaw] = await Promise.all([
    prisma.skillNode.findMany({ select: { id: true, name: true, subject: true, status: true, masteryLevel: true, nextReviewAt: true, reviewIntervalDays: true, masteryUpdatedAt: true } }),
    prisma.deadline.findMany({
      where: { completed: false }, orderBy: { dueDate: 'asc' }, take: 6,
      include: { course: { select: { name: true, subject: true } } },
    }),
    prisma.topic.findMany({
      where: { status: 'pending', course: { status: 'active' } },
      include: { course: { select: { name: true, code: true } } },
      orderBy: [{ week: 'asc' }], take: 6,
    }),
    prisma.quizResult.findMany({
      where: { quiz: { quizType: 'exam' } },
      orderBy: { takenAt: 'desc' }, take: 5,
      include: { quiz: { select: { subject: true, topicName: true } } },
    }),
    prisma.deadline.findMany({ where: { completed: false }, orderBy: { dueDate: 'asc' }, include: { course: { select: { name: true } } } }),
    prisma.failedProblem.count({ where: { resolved: false } }),
    prisma.upcomingExam.findMany({ orderBy: { examDate: 'asc' } }),
  ])

  // Pinned learning path (Feature 1 integration)
  const pinnedPath = await prisma.learningPath.findFirst({ where: { pinned: true } })
  let pinnedPathView: { id: string; name: string; subject: string; pct: number; nextTopic: string | null } | null = null
  if (pinnedPath) {
    const topicIds = (pinnedPath.topics as string[]) ?? []
    const masteryById = new Map(skillNodes.map(n => [n.id, n.masteryLevel]))
    const nameById = new Map(skillNodes.map(n => [n.id, n.name]))
    const completed = topicIds.filter(id => (masteryById.get(id) ?? 0) >= 5).length
    const nextId = topicIds.find(id => (masteryById.get(id) ?? 0) < 5)
    pinnedPathView = {
      id: pinnedPath.id, name: pinnedPath.name, subject: pinnedPath.subject,
      pct: topicIds.length ? Math.round((completed / topicIds.length) * 100) : 0,
      nextTopic: nextId ? (nameById.get(nextId) ?? null) : null,
    }
  }

  const subjectProgress = SUBJECTS.map(subject => {
    const ns = skillNodes.filter(n => n.subject === subject)
    const mastered = ns.filter(n => n.masteryLevel >= 5).length
    const active   = ns.filter(n => n.masteryLevel >= 1 && n.masteryLevel < 5).length
    const pct = ns.length > 0 ? Math.round((mastered / ns.length) * 100) : 0
    return { subject, mastered, active, pct }
  })

  function examGrade(score: number): string {
    if (score >= 90) return '5'
    if (score >= 80) return '4'
    if (score >= 70) return '3'
    if (score >= 60) return '2'
    if (score >= 50) return '1'
    return 'Failed'
  }

  // Due for review — nextReviewAt in the past
  const now = new Date()
  const dueNodes = skillNodes
    .filter(n => n.nextReviewAt && n.nextReviewAt <= now && n.masteryLevel > 0)
    .sort((a, b) => (a.nextReviewAt! < b.nextReviewAt! ? -1 : 1))
    .slice(0, 8)

  const plainSkillNodes = skillNodes.map(n => ({
    id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel,
    nextReviewAt: n.nextReviewAt?.toISOString() ?? null, reviewIntervalDays: n.reviewIntervalDays,
  }))

  // ── Today command center data ───────────────────────────────────────────────
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const DAY = 86_400_000
  const daysFrom = (d: Date) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startOfToday.getTime()) / DAY)
  const masteryById = new Map(skillNodes.map(n => [n.id, n.masteryLevel]))

  const overdue = openDeadlines.filter(d => daysFrom(d.dueDate) < 0)
    .map(d => ({ id: d.id, title: d.title, course: d.course?.name ?? '', daysOverdue: Math.abs(daysFrom(d.dueDate)) }))
  const dueSoon = openDeadlines.filter(d => { const dl = daysFrom(d.dueDate); return dl >= 0 && dl <= 3 })
    .map(d => ({ id: d.id, title: d.title, course: d.course?.name ?? '', daysLeft: daysFrom(d.dueDate) }))

  const examsSoon = upcomingExamsRaw
    .map(e => {
      const ids = Array.isArray(e.skillNodeIds) ? (e.skillNodeIds as string[]) : []
      const daysLeft = daysFrom(e.examDate)
      const weakCount = ids.filter(id => (masteryById.get(id) ?? 0) < 3).length
      return { id: e.id, name: e.name, daysLeft, weakCount }
    })
    .filter(e => e.daysLeft >= 0 && e.daysLeft <= 14)
    .slice(0, 3)

  const dueReviewIds = new Set(dueNodes.map(n => n.id))
  const stale = skillNodes
    .filter(n => n.masteryLevel >= 3 && n.masteryUpdatedAt && (now.getTime() - n.masteryUpdatedAt.getTime()) > 45 * DAY && !dueReviewIds.has(n.id))
    .map(n => ({ id: n.id, name: n.name, subject: n.subject, days: Math.floor((now.getTime() - n.masteryUpdatedAt!.getTime()) / DAY) }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)

  // ── Unified urgency-scored item list ───────────────────────────────────────
  type TodayItem = { score: number; href: string; tone: 'red' | 'orange' | 'yellow' | 'gray'; kind: string; title: string; detail: string }
  const todayItems: TodayItem[] = []

  for (const d of overdue) {
    todayItems.push({ score: 10000 + d.daysOverdue * 500, href: '/schedule', tone: 'red', kind: 'overdue', title: `${d.title} — overdue ${d.daysOverdue}d`, detail: d.course })
  }
  for (const e of examsSoon) {
    const base = e.daysLeft <= 7 ? 5000 + (7 - e.daysLeft) * 300 : 2000 + (14 - e.daysLeft) * 100
    const boost = e.weakCount * 400
    todayItems.push({ score: base + boost, href: '/planner', tone: e.daysLeft <= 7 ? 'red' : 'orange', kind: 'exam', title: `${e.name} — ${e.daysLeft === 0 ? 'today' : e.daysLeft === 1 ? 'tomorrow' : `${e.daysLeft}d`}`, detail: e.weakCount > 0 ? `${e.weakCount} covered topic${e.weakCount === 1 ? '' : 's'} below 3★` : 'All covered topics ready' })
  }
  for (const d of dueSoon) {
    todayItems.push({ score: 4000 - d.daysLeft * 800, href: '/schedule', tone: d.daysLeft === 0 ? 'red' : 'orange', kind: 'due', title: `${d.title} — ${d.daysLeft === 0 ? 'due today' : d.daysLeft === 1 ? 'due tomorrow' : `due in ${d.daysLeft}d`}`, detail: d.course })
  }
  if (dueNodes.length > 0) {
    todayItems.push({ score: 1500, href: '/review', tone: 'orange', kind: 'review', title: `${dueNodes.length} topic${dueNodes.length === 1 ? '' : 's'} due for review`, detail: 'Spaced-repetition — confirm what you still know' })
  }
  if (openMistakes > 0) {
    todayItems.push({ score: 800, href: '/mistakes', tone: 'gray', kind: 'mistakes', title: `${openMistakes} problem${openMistakes === 1 ? '' : 's'} to redo`, detail: 'Work through your logged mistakes' })
  }
  for (const s of stale) {
    todayItems.push({ score: 400 + s.days * 2, href: '/topics', tone: 'yellow', kind: 'stale', title: `${s.name} going stale`, detail: `${s.days} days since last update — refresh your mastery` })
  }

  todayItems.sort((a, b) => b.score - a.score)

  const todayData = { items: todayItems.slice(0, 8) }

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Link href="/workflow" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-300 transition-colors mt-1">
          <Workflow size={13} className="text-orange-400/80" /> Studying Workflow
        </Link>
      </div>

      {/* Today — prioritized command center */}
      <TodayCenter data={todayData} />

      {/* Client-only features: weekly review banner + connections feed */}
      <DashboardClient skillNodes={plainSkillNodes} />

      {/* Frictionless study logging */}
      <QuickLog />

      {/* Upcoming deadlines — front and center */}
      <div className={`card p-5 ${upcomingDeadlines.some(d => differenceInDays(new Date(d.dueDate), new Date()) < 0) ? 'border-red-800/50' : upcomingDeadlines.length > 0 ? 'border-orange-700/40' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><Clock size={15} className="text-orange-400" />Upcoming Deadlines</h2>
          <Link href="/schedule" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">View all <ChevronRight size={12} /></Link>
        </div>
        {upcomingDeadlines.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Calendar size={32} className="text-gray-700" />
            <p className="text-sm text-gray-500">No upcoming deadlines</p>
            <Link href="/schedule" className="px-4 py-1.5 text-xs border border-orange-700/60 text-orange-400 hover:bg-orange-900/30 rounded-lg transition-colors">+ Add Deadline</Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {upcomingDeadlines.map(dl => {
              const daysLeft = differenceInDays(new Date(dl.dueDate), new Date())
              const overdue = daysLeft < 0
              return (
                <div key={dl.id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${overdue ? 'bg-red-950/20' : 'bg-gray-800/40'}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-200 truncate">{dl.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 truncate">{dl.course.name}</span>
                      <span className={`badge ${typeBadge(dl.type)}`}>{dl.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold shrink-0 text-right ${overdue ? 'text-red-400' : urgencyClass(daysLeft)}`}>
                    {overdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                    <div className="text-[10px] text-gray-600 font-normal">{format(new Date(dl.dueDate), 'MMM d')}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* In progress — pinned learning path */}
      {pinnedPathView && (
        <div className="card p-5 border-orange-700/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2">
              <Route size={15} className="text-orange-400" /> In Progress
            </h2>
            <Link href="/learning-paths" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">All paths <ChevronRight size={12} /></Link>
          </div>
          <div className="text-sm font-medium text-gray-200">{pinnedPathView.name}</div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden my-2">
            <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full" style={{ width: `${pinnedPathView.pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{pinnedPathView.pct}% complete</span>
            {pinnedPathView.nextTopic && (
              <Link href={`/topics?subject=${pinnedPathView.subject}`} className="text-orange-400 hover:text-orange-300">
                Next: {pinnedPathView.nextTopic} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Subject progress */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200">Subject Progress</h2>
          <Link href="/topics" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">Browse topics <ChevronRight size={12} /></Link>
        </div>
        <div className="space-y-4">
          {subjectProgress.map(({ subject, mastered, active, pct }) => (
            <div key={subject}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm text-gray-300">{SUBJECT_LABEL[subject]}</span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {mastered} mastered · {active} in progress · <span className="text-orange-500 font-semibold">{pct}%</span>
                </span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Due for review */}
      {dueNodes.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2">
              <AlertCircle size={15} className="text-yellow-400" />
              Due for Review
            </h2>
            <Link href="/topics" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">All topics <ChevronRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {dueNodes.map(n => (
              <ReviewCard key={n.id} name={n.name} subject={n.subject}
                masteryLevel={n.masteryLevel} nextReviewAt={n.nextReviewAt?.toISOString() ?? null} />
            ))}
          </div>
        </div>
      )}

      {/* Recent exams */}
      {recentExams.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2">
              <GraduationCap size={15} className="text-orange-400" />
              Recent Exams
            </h2>
            <Link href="/quiz" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">Take an exam <ChevronRight size={12} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {recentExams.map(e => (
              <div key={e.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${e.passed ? 'bg-green-950/20 border-green-900/30' : 'bg-gray-800/60 border-gray-700'}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">{SUBJECT_LABEL[e.quiz.subject as keyof typeof SUBJECT_LABEL] ?? e.quiz.subject}</div>
                  <div className="text-[10px] text-gray-500">{format(new Date(e.takenAt), 'MMM d')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-base font-bold ${e.passed ? 'text-green-400' : 'text-red-400'}`}>{e.score}%</div>
                  <div className="text-[10px] text-gray-500">Grade {examGrade(e.score)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active course topics */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><BookOpen size={15} className="text-orange-400" />Active Topics</h2>
          <Link href="/courses" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">All courses <ChevronRight size={12} /></Link>
        </div>
        {activeTopics.length === 0 ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <List size={32} className="text-gray-700" />
            <p className="text-sm text-gray-500">No pending course topics</p>
            <Link href="/topics" className="px-4 py-1.5 text-xs border border-orange-700/60 text-orange-400 hover:bg-orange-900/30 rounded-lg transition-colors">Browse Topics</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTopics.map(topic => (
              <div key={topic.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-gray-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">{topic.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{topic.course.code ?? topic.course.name} · Wk {topic.week}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Small review card — rendered server-side; Review Done button handled by DashboardClient
function ReviewCard({ name, subject, masteryLevel, nextReviewAt }: {
  name: string; subject: string; masteryLevel: number; nextReviewAt: string | null
}) {
  const overdue = nextReviewAt ? Math.max(0, differenceInDays(new Date(), new Date(nextReviewAt))) : 0
  const full    = Math.floor(masteryLevel)
  const hasHalf = masteryLevel - full >= 0.5
  const stars   = '★'.repeat(full) + (hasHalf ? '⯨' : '') + '☆'.repeat(5 - full - (hasHalf ? 1 : 0))
  return (
    <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3">
      <div className="text-sm font-medium text-gray-200 truncate">{name}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{SUBJECT_LABEL[subject as keyof typeof SUBJECT_LABEL] ?? subject}</div>
      <div className="text-[10px] text-yellow-400 mt-1">{stars}</div>
      {overdue > 0 && <div className="text-[10px] text-yellow-600 mt-0.5">{overdue}d overdue</div>}
    </div>
  )
}

// We need a client component for the "Review Done" button — so DashboardClient will render it
// Interactive review-done buttons are rendered by DashboardClient (client component)
