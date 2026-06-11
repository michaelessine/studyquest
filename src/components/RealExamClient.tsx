'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, GraduationCap, Sparkles, AlertTriangle, CheckCircle2, Upload, Route } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'
import WeakSpotDiagnosis from './WeakSpotDiagnosis'

type Node = { id: string; name: string; subject: string }
type RecentExam = { id: string; examName: string; subject: string; grade: string; date: string; impactCount: number }
type Analysis = {
  topicMasteryGains: { skillNodeId: string; gain: number; estimatedScore?: number; reasoning: string }[]
  insight: string
  reviewTopics: string[]
}
type Consolidation = { pathId: string; headline: string; topics: { id: string; name: string; reason: string }[] }

// 1–5 grading scale (5 = excellent) plus an explicit Fail.
const GRADES = ['5', '4', '3', '2', '1', 'Fail']
const GRADE_LABEL: Record<string, string> = { '5': '5 — Excellent', '4': '4 — Very good', '3': '3 — Good', '2': '2 — Satisfactory', '1': '1 — Pass', 'Fail': 'Fail' }

export default function RealExamClient({ nodes, recentExams }: { nodes: Node[]; recentExams: RecentExam[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [examName, setExamName] = useState('')
  const [subject, setSubject]   = useState<Subject>('Mathematics')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [grade, setGrade]       = useState('5')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [mapping, setMapping]   = useState(false)
  const [result, setResult]     = useState<{ analysis: Analysis; applied: { skillNodeId: string; newMasteryLevel: number; capped: boolean }[]; consolidation: Consolidation | null } | null>(null)

  const subjectNodes = nodes.filter(n => n.subject === subject)
  const nameById = new Map(nodes.map(n => [n.id, n.name]))

  // Claude auto-maps which topics an uploaded exam covers, then pre-selects them.
  async function mapFromUpload(file: File) {
    setMapping(true)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('subject', subject)
      const res = await fetch('/api/exam/map-topics', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const ids: string[] = (data.topics ?? []).map((t: { skillNodeId: string }) => t.skillNodeId)
      if (ids.length === 0) { showToast('info', 'No topics detected — select manually'); return }
      setSelected(new Set(ids))
      if (data.examName && !examName.trim()) setExamName(data.examName)
      showToast('info', `Detected ${ids.length} topic(s) from the exam`)
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Could not read exam')
    } finally { setMapping(false) }
  }

  function toggle(id: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function submit() {
    if (!examName.trim() || selected.size === 0) { showToast('info', 'Add a name and select topics'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/exam/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examName, subject, skillNodeIds: Array.from(selected), grade, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult({ analysis: data.analysis, applied: data.applied, consolidation: data.consolidation ?? null })
      showToast('info', `Exam analyzed — ${data.applied.length} topic(s) updated`)
      router.refresh()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const lowGrade = ['1', 'Fail'].includes(grade)
    const belowPassing = ['1', '2', 'Fail'].includes(grade)
    const gradeScoreMap: Record<string, number> = { '5': 95, '4': 85, '3': 75, '2': 65, '1': 55, 'Fail': 45 }
    const firstSel = nodes.find(n => selected.has(n.id))
    return (
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-gray-100">Exam Analyzed</h1>
        {lowGrade && (
          <div className="bg-yellow-950/30 border border-yellow-800/50 text-yellow-300 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} /> Low grade — no mastery gain applied. Review the topics below.
          </div>
        )}

        {/* Post-exam consolidation path (topics scored < 80%) */}
        {result.consolidation && (
          <div className="card p-5 border-orange-700/50">
            <h2 className="font-semibold text-gray-200 mb-1 flex items-center gap-2"><Route size={15} className="text-orange-400" /> Post-exam consolidation</h2>
            <p className="text-sm text-gray-300">{result.consolidation.headline}</p>
            <div className="mt-3 space-y-1.5">
              {result.consolidation.topics.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-[10px] text-gray-400 flex items-center justify-center shrink-0">{i + 1}</span>
                  <Link href={`/topics?subject=${subject}`} className="flex-1 min-w-0 flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg px-2.5 py-1.5 hover:border-orange-700/50 transition-colors">
                    <span className="text-xs text-gray-200 truncate">{t.name}</span>
                    <span className="text-[10px] text-gray-500 shrink-0 ml-2">{t.reason}</span>
                  </Link>
                </div>
              ))}
            </div>
            <Link href="/learning-paths" className="inline-flex items-center gap-1 mt-3 text-xs px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-lg transition-colors">
              <CheckCircle2 size={12} /> Pinned to your dashboard — open path
            </Link>
          </div>
        )}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-2 flex items-center gap-2"><Sparkles size={15} className="text-orange-400" /> Insight</h2>
          <p className="text-sm text-gray-400">{result.analysis.insight}</p>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-3">Mastery Gains</h2>
          {result.applied.length === 0 ? (
            <p className="text-sm text-gray-500">No gains applied.</p>
          ) : (
            <div className="space-y-2">
              {result.applied.map(a => (
                <div key={a.skillNodeId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400" /> {nameById.get(a.skillNodeId) ?? a.skillNodeId}</span>
                  <span className="text-orange-300 font-semibold">
                    → {a.newMasteryLevel}★ {a.capped && <span className="text-yellow-500 text-xs">(capped at 4.0)</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {result.analysis.reviewTopics?.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-200 mb-2">Review Suggested</h2>
            <div className="flex flex-wrap gap-2">
              {result.analysis.reviewTopics.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300">{t}</span>
              ))}
            </div>
          </div>
        )}
        {/* Weak-spot diagnosis when the exam was below passing */}
        {belowPassing && firstSel && (
          <div className="card p-5">
            <WeakSpotDiagnosis
              skillNodeId={firstSel.id}
              topicName={firstSel.name}
              subject={firstSel.subject}
              score={gradeScoreMap[grade] ?? 50}
              source="exam"
              auto={false}
            />
          </div>
        )}
        <button onClick={() => { setResult(null); setSelected(new Set()); setExamName(''); setNotes('') }}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg">
          Log another exam
        </button>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><GraduationCap size={22} className="text-orange-400" /> Real Exam</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log a university exam (graded 1–5). Only a grade-5 exam can push a topic from 4.0 → 5.0 stars.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Exam name</label>
            <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Linear Algebra Final"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subject</label>
            <select value={subject} onChange={e => { setSubject(e.target.value as Subject); setSelected(new Set()) }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Grade (1–5 scale)</label>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)} title={GRADE_LABEL[g]}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${grade === g ? 'bg-orange-900/60 border-orange-700 text-orange-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}>
                {g}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-1">{GRADE_LABEL[grade]}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">Topics covered ({selected.size} selected)</label>
            <label className="text-[11px] flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg cursor-pointer transition-colors">
              {mapping ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {mapping ? 'Reading…' : 'Auto-detect from file'}
              <input type="file" accept=".pdf,image/*" className="hidden" disabled={mapping}
                onChange={e => { const f = e.target.files?.[0]; if (f) mapFromUpload(f) }} />
            </label>
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-800 rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {subjectNodes.map(n => (
              <button key={n.id} onClick={() => toggle(n.id)}
                className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${selected.has(n.id) ? 'bg-orange-900/50 text-orange-200' : 'text-gray-400 hover:bg-gray-800'}`}>
                {selected.has(n.id) ? '✓ ' : ''}{n.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Performance notes (optional, max 500 chars)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))} rows={3}
            placeholder="What did you solve well? What was hard?"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-orange-600" />
        </div>

        <button onClick={submit} disabled={loading}
          className="w-full py-2.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : 'Analyze Exam & Apply Gains'}
        </button>
      </div>

      {recentExams.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-3">Recent Exams</h2>
          <div className="space-y-2">
            {recentExams.map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-200">{e.examName}</span>
                  <span className="text-gray-600 text-xs ml-2">{SUBJECT_LABEL[e.subject as Subject] ?? e.subject} · {new Date(e.date).toLocaleDateString()}</span>
                </div>
                <span className="text-orange-300 font-semibold">{e.grade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
