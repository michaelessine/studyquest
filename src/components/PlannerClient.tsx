'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarClock, Plus, Trash2, Search, X, Loader2, AlertTriangle, CheckCircle2, Target, Bug } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from '@/components/ToastProvider'
import type { ExamPlan } from '@/lib/examPlan'

type Mistake = { id: string; title: string; topicName: string | null }
type Exam = { id: string; name: string; subject: string; examDate: string; plan: ExamPlan; mistakes: Mistake[] }
type Topic = { id: string; name: string; subject: string; masteryLevel: number; courseId: string | null }
type CourseOpt = { id: string; name: string; code: string | null; subject: string }

function subjLabel(s: string) { return SUBJECT_LABEL[s as Subject] ?? s }

function countdownLabel(days: number, overdue: boolean): string {
  if (overdue) return 'Past'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days} days`
}
function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - today.getTime()) / 86_400_000)
  const base = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  if (diff === 0) return `Today · ${base}`
  if (diff === 1) return `Tomorrow · ${base}`
  return base
}

export default function PlannerClient({ exams, topics, courses }: { exams: Exam[]; topics: Topic[]; courses: CourseOpt[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(exams.length === 0)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState<string>(SUBJECTS[0])
  const [date, setDate] = useState('')
  const [picked, setPicked] = useState<Topic[]>([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  function prefillFromCourse(courseId: string) {
    const course = courses.find(c => c.id === courseId)
    if (!course) return
    const linked = topics.filter(t => t.courseId === courseId)
    setSubject(course.subject)
    setPicked(linked)
    if (!name.trim()) setName(`${course.name} Exam`)
    showToast('info', linked.length > 0 ? `Loaded ${linked.length} topic${linked.length === 1 ? '' : 's'} from ${course.name}` : `${course.name} has no linked topics yet`)
  }

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim()
    const pickedIds = new Set(picked.map(p => p.id))
    return topics
      .filter(t => t.subject === subject && !pickedIds.has(t.id) && (q === '' || t.name.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [topics, subject, picked, query])

  async function addExam() {
    if (!name.trim() || !date) { showToast('info', 'Add a name and date'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/exams/upcoming', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, examDate: date, skillNodeIds: picked.map(p => p.id) }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      showToast('info', `Added "${name}"`)
      setName(''); setDate(''); setPicked([]); setQuery(''); setShowForm(false)
      router.refresh()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Failed to add')
    } finally { setSaving(false) }
  }

  async function remove(id: string, examName: string) {
    if (!confirm(`Delete "${examName}"?`)) return
    await fetch(`/api/exams/upcoming?id=${id}`, { method: 'DELETE' })
    showToast('info', 'Exam removed')
    router.refresh()
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <CalendarClock size={22} className="text-orange-400" /> Exam Planner
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Add upcoming exams and get a back-planned drill schedule for your weak covered topics.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg">
          <Plus size={15} /> Add exam
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-5 space-y-3">
          {courses.length > 0 && (
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Prefill from a course (optional)</label>
              <select defaultValue="" onChange={e => { if (e.target.value) prefillFromCourse(e.target.value); e.target.value = '' }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
                <option value="">— Pick a course to load its topics —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ` : ''}{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Exam name (e.g. Quantum Mechanics Final)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            <select value={subject} onChange={e => { setSubject(e.target.value); setPicked([]) }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
              {SUBJECTS.map(s => <option key={s} value={s}>{subjLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Exam date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600 [color-scheme:dark]" />
          </div>

          {/* Topic picker */}
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Covered topics ({picked.length} selected)</label>
            {picked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {picked.map(p => (
                  <span key={p.id} className="flex items-center gap-1 bg-orange-950/40 border border-orange-800/50 text-orange-200 text-xs rounded-full pl-2.5 pr-1 py-1">
                    {p.name}
                    <button onClick={() => setPicked(prev => prev.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-gray-200"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-500" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${subjLabel(subject)} topics…`}
                className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-gray-600" />
            </div>
            {query && matches.length > 0 && (
              <div className="mt-1 bg-gray-900 border border-gray-700 rounded-lg p-1 max-h-48 overflow-y-auto">
                {matches.map(m => (
                  <button key={m.id} onClick={() => { setPicked(prev => [...prev, m]); setQuery('') }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm rounded hover:bg-gray-800">
                    <span className="text-gray-300 truncate">{m.name}</span>
                    <span className="text-[10px] text-gray-600">{m.masteryLevel}★</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={addExam} disabled={saving}
            className="w-full py-2.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add to planner
          </button>
        </div>
      )}

      {/* Exam list */}
      {exams.length === 0 && !showForm ? (
        <div className="card p-10 text-center text-gray-500">No upcoming exams. Add one to get a drill schedule.</div>
      ) : (
        exams.map(e => <ExamCard key={e.id} exam={e} onDelete={() => remove(e.id, e.name)} />)
      )}
    </div>
  )
}

function ExamCard({ exam, onDelete }: { exam: Exam; onDelete: () => void }) {
  const { plan } = exam
  const urgent = !plan.overdue && plan.daysRemaining <= 7

  return (
    <div className={`card p-5 ${plan.overdue ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-100 truncate">{exam.name}</h2>
          <div className="text-xs text-gray-500 mt-0.5">
            {subjLabel(exam.subject)} · {new Date(exam.examDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            plan.overdue ? 'bg-gray-800 text-gray-500' : urgent ? 'bg-red-950/40 text-red-300 border border-red-800/50' : 'bg-orange-950/40 text-orange-300 border border-orange-800/50'
          }`}>
            {countdownLabel(plan.daysRemaining, plan.overdue)}
          </span>
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat icon={<Target size={13} className="text-gray-400" />} label="Topics" value={plan.coveredCount} />
        <Stat icon={<AlertTriangle size={13} className="text-orange-400" />} label="Need work" value={plan.weakCount} accent="text-orange-400" />
        <Stat icon={<CheckCircle2 size={13} className="text-green-400" />} label="Ready" value={plan.readyCount} accent="text-green-400" />
      </div>

      {plan.overdue ? (
        <p className="text-sm text-gray-500">This exam date has passed. Log it under Real Exam to record your grade.</p>
      ) : plan.coveredCount === 0 ? (
        <p className="text-sm text-gray-500">No topics linked. Edit to add covered topics and get a drill schedule.</p>
      ) : plan.weakCount === 0 ? (
        <p className="text-sm text-green-400/90 flex items-center gap-1.5"><CheckCircle2 size={15} /> All covered topics are at 3★+. You&apos;re in good shape — keep them warm with light review.</p>
      ) : (
        <div>
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Drill schedule</div>
          <div className="space-y-1.5">
            {plan.schedule.map((d, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-28 shrink-0 text-xs text-gray-500 pt-0.5">{dayLabel(d.date)}</div>
                <div className="flex-1 min-w-0">
                  {d.kind === 'review' ? (
                    <span className="text-orange-300">Full review + past papers / practice exam</span>
                  ) : d.topics.length === 0 ? (
                    <span className="text-gray-600">Buffer / light review</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {d.topics.map(t => (
                        <span key={t.id} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-300"
                          title={t.reason}>
                          {t.name} <span className="text-gray-600">{t.mastery}★</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logged mistakes to redo for this exam's topics */}
      {!plan.overdue && exam.mistakes.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-3">
          <div className="text-[11px] font-semibold text-red-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Bug size={12} /> Problems to redo ({exam.mistakes.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {exam.mistakes.slice(0, 12).map(m => (
              <span key={m.id} className="bg-red-950/20 border border-red-900/30 text-red-200/90 rounded px-2 py-0.5 text-xs" title={m.topicName ?? ''}>
                {m.title}
              </span>
            ))}
            {exam.mistakes.length > 12 && <span className="text-[11px] text-gray-600 self-center">+{exam.mistakes.length - 12} more</span>}
          </div>
          <Link href="/mistakes" className="inline-block mt-2 text-[11px] text-orange-400 hover:text-orange-300">Open Mistake Log →</Link>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value, accent = 'text-gray-200' }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="bg-gray-800/40 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-0.5">{icon} {label}</div>
      <div className={`text-xl font-black ${accent}`}>{value}</div>
    </div>
  )
}
