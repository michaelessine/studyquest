'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Minus, Trash2, Check, CalendarClock, FileText, GraduationCap,
  ClipboardList, BookOpen, AlertTriangle, Loader2, Target, TrendingUp, Search, X,
} from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import { PHASES } from '@/lib/workflow'
import { useToast } from '@/components/ToastProvider'
import MistakeList from '@/components/MistakeList'
import type { GradePrediction } from '@/lib/courseGrade'

type Course = {
  id: string; code: string | null; name: string; subject: string
  semester: string | null; year: number | null; status: string; grade: number | null
  exerciseSetsTotal: number; exerciseSetsDone: number; quizzesTotal: number; quizzesDone: number
}
type Deadline = { id: string; title: string; type: string; dueDate: string; completed: boolean }
type Node = { id: string; name: string; masteryLevel: number }
type SubjectTopic = { id: string; name: string; masteryLevel: number; linked: boolean }

const DEADLINE_TYPES = [
  { value: 'exercise_set', label: 'Exercise set' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
]
function typeIcon(t: string) {
  if (t === 'exam') return <GraduationCap size={14} className="text-red-400" />
  if (t === 'quiz') return <ClipboardList size={14} className="text-blue-400" />
  if (t === 'exercise_set') return <FileText size={14} className="text-orange-400" />
  return <CalendarClock size={14} className="text-gray-400" />
}
function daysUntil(iso: string): number {
  const d = new Date(iso); const t = new Date()
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86_400_000)
}

export default function CourseDetailClient({ course, deadlines, linkedNodes, subjectTopics, avgPctSolved, avgMastery, prediction, phaseCounts }: {
  course: Course; deadlines: Deadline[]; linkedNodes: Node[]; subjectTopics: SubjectTopic[]
  avgPctSolved: number | null; avgMastery: number | null; prediction: GradePrediction
  phaseCounts: Record<number, number>
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [addingDeadline, setAddingDeadline] = useState(false)
  const [dTitle, setDTitle] = useState('')
  const [dType, setDType] = useState('exercise_set')
  const [dDate, setDDate] = useState('')
  const [dRepeat, setDRepeat] = useState('1')
  const [manageTopics, setManageTopics] = useState(false)
  const [linkedIds, setLinkedIds] = useState<Set<string>>(() => new Set(subjectTopics.filter(t => t.linked).map(t => t.id)))
  const [topicQuery, setTopicQuery] = useState('')

  async function saveTopics() {
    setBusy(true)
    try {
      await fetch(`/api/courses/${course.id}/topics`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeIds: Array.from(linkedIds) }),
      })
      setManageTopics(false)
      showToast('info', `Linked ${linkedIds.size} topic${linkedIds.size === 1 ? '' : 's'}`)
      router.refresh()
    } finally { setBusy(false) }
  }

  async function patchCourse(data: Record<string, number | string>) {
    setBusy(true)
    try {
      await fetch(`/api/courses/${course.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      router.refresh()
    } finally { setBusy(false) }
  }

  async function addDeadline() {
    if (!dTitle.trim() || !dDate) { showToast('info', 'Add a title and date'); return }
    const weeks = Math.max(1, parseInt(dRepeat) || 1)
    setBusy(true)
    try {
      const res = await fetch('/api/deadlines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, title: dTitle, type: dType, dueDate: dDate, repeatWeeks: weeks }),
      })
      const data = await res.json()
      setDTitle(''); setDDate(''); setDRepeat('1'); setAddingDeadline(false)
      showToast('info', weeks > 1 ? `Added ${data.count ?? weeks} weekly deadlines` : 'Deadline added')
      router.refresh()
    } finally { setBusy(false) }
  }

  async function toggleDeadline(id: string, completed: boolean) {
    await fetch('/api/deadlines', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, completed }) })
    router.refresh()
  }
  async function delDeadline(id: string) {
    await fetch(`/api/deadlines?id=${id}`, { method: 'DELETE' })
    router.refresh()
  }
  async function delCourse() {
    if (!confirm(`Delete "${course.name}" and its deadlines?`)) return
    await fetch(`/api/courses/${course.id}`, { method: 'DELETE' })
    showToast('info', 'Course deleted')
    router.push('/courses')
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300">
        <ArrowLeft size={15} /> Courses
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {course.code && <span className="text-xs text-gray-500 font-mono">{course.code}</span>}
          <h1 className="text-2xl font-bold text-gray-100">{course.name}</h1>
          <div className="text-sm text-gray-500 mt-0.5">
            {SUBJECT_LABEL[course.subject as Subject] ?? course.subject}
            {course.semester && course.year && <span> · {course.semester} {course.year}</span>}
            <span> · {course.status}</span>
            {course.grade != null && <span className="text-green-400"> · grade {course.grade}</span>}
          </div>
        </div>
        <button onClick={delCourse} className="shrink-0 text-gray-600 hover:text-red-400 p-1"><Trash2 size={16} /></button>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Stepper label="Exercise sets" icon={<FileText size={14} className="text-orange-400" />}
          done={course.exerciseSetsDone} total={course.exerciseSetsTotal} busy={busy}
          onDone={v => patchCourse({ exerciseSetsDone: v })} onTotal={v => patchCourse({ exerciseSetsTotal: v })} />
        <Stepper label="Quizzes" icon={<ClipboardList size={14} className="text-blue-400" />}
          done={course.quizzesDone} total={course.quizzesTotal} busy={busy}
          onDone={v => patchCourse({ quizzesDone: v })} onTotal={v => patchCourse({ quizzesTotal: v })} />
      </div>

      {/* Mastery + performance */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><BookOpen size={13} /> Topic mastery</div>
          {avgMastery != null ? (
            <>
              <div className="text-2xl font-black text-gray-200">{avgMastery}<span className="text-sm text-gray-500">/5</span></div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${(avgMastery / 5) * 100}%` }} /></div>
              <div className="text-[11px] text-gray-600 mt-1">{linkedNodes.length} linked topic{linkedNodes.length === 1 ? '' : 's'}</div>
            </>
          ) : <div className="text-sm text-gray-600 mt-1">No topics linked to this course yet.</div>}
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1"><Target size={13} /> Exercise performance</div>
          {avgPctSolved != null ? (
            <div className="text-2xl font-black text-green-400">{avgPctSolved}%<span className="text-xs text-gray-500 font-normal"> avg solved</span></div>
          ) : <div className="text-sm text-gray-600 mt-1">Upload an exercise set tagged to this course.</div>}
        </div>
      </div>

      {/* Grade prediction */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><TrendingUp size={15} className="text-orange-400" /> Predicted Grade</h2>
          {prediction.available && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              prediction.confidence === 'high' ? 'border-green-800/50 text-green-400 bg-green-950/30'
              : prediction.confidence === 'medium' ? 'border-orange-800/50 text-orange-400 bg-orange-950/30'
              : 'border-gray-700 text-gray-500 bg-gray-800/40'}`}>
              {prediction.confidence} confidence
            </span>
          )}
        </div>
        {prediction.available ? (
          <div className="flex items-end gap-4">
            <div className={`text-4xl font-black ${prediction.grade === 'Fail' ? 'text-red-400' : 'text-orange-400'}`}>
              {prediction.grade === 'Fail' ? 'Fail' : `${prediction.grade}`}
              {prediction.grade !== 'Fail' && <span className="text-lg text-gray-600 font-normal"> / 5</span>}
            </div>
            <div className="flex-1 pb-1">
              <div className="text-sm text-gray-300">{prediction.label} · ~{prediction.score}%</div>
              <div className="text-[11px] text-gray-600 mt-0.5">{prediction.basis}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{prediction.basis} Use “Manage” below to link this course&apos;s topics.</p>
        )}
      </div>

      {/* Workflow activity across linked topics */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-1 flex items-center gap-2"><TrendingUp size={15} className="text-orange-400" /> Workflow Activity</h2>
        <p className="text-[11px] text-gray-600 mb-3">How many times you&apos;ve done each studying phase across this course&apos;s linked topics.</p>
        {(() => {
          const max = Math.max(1, ...PHASES.map(p => phaseCounts[p.n] ?? 0))
          const totalPhase = PHASES.reduce((a, p) => a + (phaseCounts[p.n] ?? 0), 0)
          if (totalPhase === 0) return <p className="text-sm text-gray-500">No workflow activity yet. Log phases from a topic&apos;s panel or tag a phase when you Quick Log.</p>
          return (
            <div className="space-y-2">
              {PHASES.map(p => {
                const c = phaseCounts[p.n] ?? 0
                return (
                  <div key={p.n} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />{p.short}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(c / max) * 100}%`, background: p.color }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold text-gray-300 tabular-nums">{c}×</span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* Deadlines */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><CalendarClock size={15} className="text-orange-400" /> Deadlines</h2>
          <button onClick={() => setAddingDeadline(a => !a)} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"><Plus size={13} /> Add</button>
        </div>

        {addingDeadline && (
          <div className="bg-gray-800/50 rounded-lg p-3 mb-3 space-y-2">
            <input value={dTitle} onChange={e => setDTitle(e.target.value)} placeholder="e.g. Problem Set 5"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            <div className="flex gap-2">
              <select value={dType} onChange={e => setDType(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
                {DEADLINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="date" value={dDate} onChange={e => setDDate(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600 [color-scheme:dark]" />
              <button onClick={addDeadline} disabled={busy} className="px-3 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-lg">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              Repeat weekly ×
              <input type="number" min={1} max={40} value={dRepeat} onChange={e => setDRepeat(e.target.value)}
                className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-center focus:outline-none focus:border-orange-600" />
              <span className="text-gray-600">{parseInt(dRepeat) > 1 ? `creates "${dTitle || 'Title'} 1…${parseInt(dRepeat)}" weekly` : 'one-off'}</span>
            </label>
          </div>
        )}

        {deadlines.length === 0 ? (
          <p className="text-sm text-gray-600">No deadlines yet.</p>
        ) : (
          <div className="space-y-1.5">
            {deadlines.map(d => {
              const days = daysUntil(d.dueDate)
              const overdue = !d.completed && days < 0
              const soon = !d.completed && days >= 0 && days <= 3
              return (
                <div key={d.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${d.completed ? 'bg-gray-800/30 opacity-60' : 'bg-gray-800/50'}`}>
                  <button onClick={() => toggleDeadline(d.id, !d.completed)}
                    className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center ${d.completed ? 'bg-green-600 border-green-500' : 'border-gray-600 hover:border-orange-500'}`}>
                    {d.completed && <Check size={12} className="text-white" />}
                  </button>
                  {typeIcon(d.type)}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm truncate ${d.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{d.title}</div>
                    <div className="text-[11px] text-gray-600">
                      {new Date(d.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {!d.completed && (
                        <span className={overdue ? 'text-red-400' : soon ? 'text-orange-400' : 'text-gray-600'}>
                          {' · '}{overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${days}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                  {overdue && <AlertTriangle size={14} className="text-red-400 shrink-0" />}
                  <button onClick={() => delDeadline(d.id)} className="shrink-0 text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Failed problems to redo */}
      <div className="card p-5">
        <MistakeList
          heading="Problems to Redo"
          courseId={course.id}
          topics={linkedNodes.map(n => ({ id: n.id, name: n.name }))}
        />
      </div>

      {/* Linked topics */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><BookOpen size={15} className="text-orange-400" /> Linked Topics ({linkedNodes.length})</h2>
          <button onClick={() => { setLinkedIds(new Set(subjectTopics.filter(t => t.linked).map(t => t.id))); setManageTopics(true) }}
            className="text-xs text-orange-400 hover:text-orange-300">Manage</button>
        </div>
        {linkedNodes.length === 0 ? (
          <p className="text-sm text-gray-500">No topics linked yet. Linking topics powers the mastery bar and grade prediction.</p>
        ) : (
          <div className="space-y-1.5">
            {linkedNodes.map(n => (
              <div key={n.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate">{n.name}</span>
                <span className="text-orange-300 font-semibold shrink-0 ml-2">{n.masteryLevel}★</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage topics modal */}
      {manageTopics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setManageTopics(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="font-semibold text-gray-100">Link topics · {SUBJECT_LABEL[course.subject as Subject] ?? course.subject}</h2>
              <button onClick={() => setManageTopics(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="p-3 border-b border-gray-800">
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <Search size={14} className="text-gray-500" />
                <input value={topicQuery} onChange={e => setTopicQuery(e.target.value)} placeholder="Search topics…"
                  className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-gray-600" />
              </div>
              <div className="text-[11px] text-gray-600 mt-1.5">{linkedIds.size} selected</div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {subjectTopics.filter(t => t.name.toLowerCase().includes(topicQuery.toLowerCase())).map(t => {
                const on = linkedIds.has(t.id)
                return (
                  <button key={t.id} onClick={() => setLinkedIds(prev => { const n = new Set(prev); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 text-left">
                    <span className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-orange-600 border-orange-500' : 'border-gray-600'}`}>
                      {on && <Check size={11} className="text-white" />}
                    </span>
                    <span className="flex-1 text-sm text-gray-200 truncate">{t.name}</span>
                    <span className="text-[10px] text-gray-600 shrink-0">{t.masteryLevel}★</span>
                  </button>
                )
              })}
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <button onClick={() => setManageTopics(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">Cancel</button>
              <button onClick={saveTopics} disabled={busy} className="flex-1 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 rounded-lg text-sm text-white flex items-center justify-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stepper({ label, icon, done, total, busy, onDone, onTotal }: {
  label: string; icon: React.ReactNode; done: number; total: number; busy: boolean
  onDone: (v: number) => void; onTotal: (v: number) => void
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">{icon} {label}</span>
        <span className="text-xs text-gray-500">
          {done} / <input type="number" min={0} value={total} disabled={busy}
            onChange={e => onTotal(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-12 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300 text-center focus:outline-none focus:border-orange-600" />
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2"><div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black text-gray-200">{pct}%</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onDone(Math.max(0, done - 1))} disabled={busy || done <= 0}
            className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-30 flex items-center justify-center hover:bg-gray-700"><Minus size={14} /></button>
          <button onClick={() => onDone(done + 1)} disabled={busy || (total > 0 && done >= total)}
            className="w-7 h-7 rounded-lg bg-orange-700 border border-orange-600 text-white disabled:opacity-30 flex items-center justify-center hover:bg-orange-600"><Plus size={14} /></button>
        </div>
      </div>
    </div>
  )
}
