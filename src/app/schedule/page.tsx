// Schedule page — weekly calendar view of deadlines and session logs
'use client'
import { useEffect, useState } from 'react'
import { format, startOfWeek, addDays, isSameDay, parseISO, isWithinInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Loader2, CheckCircle2, Circle, Clock, BookOpen, CalendarDays, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import QuickLog from '@/components/QuickLog'

type Deadline = {
  id: string; title: string; type: string
  dueDate: string; completed: boolean; xpValue: number
  course: { name: string; code: string | null }
}
// Unified study log (topic-linked StudySession)
type Session = {
  id: string; durationMins: number; startTime: string
  topicName: string | null; subject: string | null; note: string | null
}

const TYPE_BADGE: Record<string, string> = {
  exam:       'bg-red-900/60 text-red-300',
  assignment: 'bg-blue-900/60 text-blue-300',
  quiz:       'bg-yellow-900/60 text-yellow-300',
  reading:    'bg-green-900/60 text-green-300',
}

export default function SchedulePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [sessions, setSessions]   = useState<Session[]>([])
  const [loading, setLoading]     = useState(true)

  const [showLog, setShowLog]     = useState(false)

  const [showDl, setShowDl]     = useState(false)
  const [dlTitle, setDlTitle]   = useState('')
  const [dlType, setDlType]     = useState('assignment')
  const [dlDate, setDlDate]     = useState('')
  const [dlXP, setDlXP]         = useState('100')
  const [courses, setCourses]   = useState<{ id: string; name: string }[]>([])
  const [dlCourse, setDlCourse] = useState('')
  const [dlSaving, setDlSaving] = useState(false)

  const weekEnd = addDays(weekStart, 6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  async function load() {
    setLoading(true)
    const [dlRes, sessRes, courseRes] = await Promise.all([
      fetch('/api/deadlines').then(r => r.json()),
      fetch('/api/log-study?limit=200').then(r => r.json()),
      fetch('/api/courses').then(r => r.json()),
    ])
    setDeadlines(dlRes.deadlines ?? [])
    setSessions(sessRes.logs ?? [])
    setCourses(courseRes.courses ?? [])
    if (!dlCourse && courseRes.courses?.length > 0) setDlCourse(courseRes.courses[0].id)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  async function toggleDeadline(id: string, completed: boolean, xpValue: number, title: string) {
    const nowCompleting = !completed
    await fetch(`/api/deadlines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: nowCompleting }),
    })
    if (nowCompleting) showToast('info', `"${title}" completed`)
    load()
  }


  async function saveDeadline() {
    setDlSaving(true)
    await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: dlCourse, title: dlTitle, type: dlType,
        dueDate: new Date(dlDate).toISOString(), xpValue: parseInt(dlXP),
      }),
    })
    setDlSaving(false); setShowDl(false); setDlTitle(''); setDlDate('')
    load(); router.refresh()
  }

  // ── Weekly summary stats ─────────────────────────────────────────────────
  const weekInterval = { start: weekStart, end: addDays(weekEnd, 1) }
  const weekSessions  = sessions.filter(s => isWithinInterval(parseISO(s.startTime), weekInterval))
  const weekDeadlines = deadlines.filter(d => isWithinInterval(parseISO(d.dueDate), weekInterval))
  const totalMins     = weekSessions.reduce((sum, s) => sum + s.durationMins, 0)
  const completedDls  = weekDeadlines.filter(d => d.completed).length

  const totalHours = Math.floor(totalMins / 60)
  const remMins    = totalMins % 60
  const studyLabel = totalMins === 0
    ? '—'
    : totalHours > 0
      ? `${totalHours}h ${remMins > 0 ? `${remMins}m` : ''}`
      : `${remMins}m`

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setWeekStart(d => addDays(d, -7))}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-gray-300">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-gray-300 text-sm">
            Today
          </button>
          <button onClick={() => setWeekStart(d => addDays(d, 7))}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 text-gray-300">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setShowDl(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg">
            <Plus size={14} /> Deadline
          </button>
          <button onClick={() => setShowLog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-sm rounded-lg">
            <Plus size={14} /> Log Session
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-orange-500" size={28} />
        </div>
      ) : (
        <>
          {/* ── Calendar grid ──────────────────────────────────────────── */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map(day => {
              const isToday = isSameDay(day, new Date())
              const dayDeadlines = deadlines.filter(d => isSameDay(parseISO(d.dueDate), day))
              const daySessions  = sessions.filter(s => isSameDay(parseISO(s.startTime), day))

              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-xl border p-2 min-h-32 flex flex-col gap-1.5 ${
                    isToday ? 'border-orange-700 bg-orange-950/30' : 'border-gray-800 bg-gray-900/50'
                  }`}
                >
                  {/* Day header */}
                  <div className="text-center mb-1">
                    <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                    <div className={`text-sm font-semibold ${isToday ? 'text-orange-300' : 'text-gray-300'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>

                  {/* Deadlines */}
                  {dayDeadlines.map(dl => (
                    <button
                      key={dl.id}
                      title={dl.title}
                      onClick={() => toggleDeadline(dl.id, dl.completed, dl.xpValue, dl.title)}
                      className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-opacity ${
                        dl.completed ? 'opacity-40' : ''
                      } ${TYPE_BADGE[dl.type] ?? 'bg-gray-800 text-gray-300'}`}
                    >
                      <div className="flex items-start gap-1">
                        {dl.completed
                          ? <CheckCircle2 size={10} className="shrink-0 mt-0.5" />
                          : <Circle       size={10} className="shrink-0 mt-0.5" />}
                        <span className="line-clamp-2 whitespace-normal font-medium leading-tight">{dl.title}</span>
                      </div>
                      <div className="opacity-70 mt-0.5 pl-3 text-[10px]">+{dl.xpValue} XP</div>
                    </button>
                  ))}

                  {/* Sessions */}
                  {daySessions.map(s => (
                    <div key={s.id} title={s.note ?? ''}
                      className="rounded-md px-2 py-1.5 text-xs bg-indigo-900/40 text-indigo-300">
                      <div className="font-medium line-clamp-2 whitespace-normal leading-tight">
                        📚 {s.durationMins}m{s.topicName ? ` · ${s.topicName}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* ── This Week summary ──────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <CalendarDays size={15} className="text-orange-400" />
              This Week
            </h2>

            {weekSessions.length === 0 && weekDeadlines.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-gray-500">No sessions logged yet this week — start one!</p>
                <button
                  onClick={() => setShowLog(true)}
                  className="px-4 py-1.5 text-xs border border-orange-700/60 text-orange-400 hover:bg-orange-900/30 rounded-lg transition-colors"
                >
                  + Log Session
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock size={12} /> Study time
                  </div>
                  <div className="text-2xl font-bold text-orange-300">{studyLabel}</div>
                  <div className="text-xs text-gray-600">{weekSessions.length} session{weekSessions.length !== 1 ? 's' : ''}</div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <BookOpen size={12} /> Deadlines
                  </div>
                  <div className="text-2xl font-bold text-gray-200">{weekDeadlines.length}</div>
                  <div className="text-xs text-gray-600">
                    {completedDls} completed
                    {weekDeadlines.length - completedDls > 0 && (
                      <span className="text-yellow-600"> · {weekDeadlines.length - completedDls} pending</span>
                    )}
                  </div>
                </div>

                {weekSessions.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Clock size={12} /> Daily average
                    </div>
                    <div className="text-2xl font-bold text-gray-200">
                      {Math.round(totalMins / 7)}m
                    </div>
                    <div className="text-xs text-gray-600">per day this week</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Log Study modal (unified QuickLog) ────────────────────────────── */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowLog(false); load() }} />
          <div className="relative w-full max-w-md mt-10">
            <button onClick={() => { setShowLog(false); load() }} className="absolute -top-8 right-0 text-gray-400 hover:text-gray-200 flex items-center gap-1 text-xs">
              <X size={14} /> Close
            </button>
            <QuickLog />
          </div>
        </div>
      )}

      {/* ── Add Deadline modal ────────────────────────────────────────────── */}
      {showDl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDl(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-100">Add Deadline</h2>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Title</label>
              <input value={dlTitle} onChange={e => setDlTitle(e.target.value)} placeholder="Midterm Exam"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Type</label>
                <select value={dlType} onChange={e => setDlType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
                  <option>exam</option><option>assignment</option><option>quiz</option><option>reading</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">XP Value</label>
                <input type="number" value={dlXP} onChange={e => setDlXP(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Course</label>
              <select value={dlCourse} onChange={e => setDlCourse(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input type="date" value={dlDate} onChange={e => setDlDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDl(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
                Cancel
              </button>
              <button onClick={saveDeadline} disabled={!dlTitle || !dlDate || !dlCourse || dlSaving}
                className="flex-1 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm text-white flex items-center justify-center gap-2">
                {dlSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
