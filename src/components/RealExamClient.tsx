'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, GraduationCap, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'

type Node = { id: string; name: string; subject: string }
type RecentExam = { id: string; examName: string; subject: string; grade: string; date: string; impactCount: number }
type Analysis = {
  topicMasteryGains: { skillNodeId: string; gain: number; reasoning: string }[]
  insight: string
  reviewTopics: string[]
}

const GRADES = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

export default function RealExamClient({ nodes, recentExams }: { nodes: Node[]; recentExams: RecentExam[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [examName, setExamName] = useState('')
  const [subject, setSubject]   = useState<Subject>('Mathematics')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [grade, setGrade]       = useState('A')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ analysis: Analysis; applied: { skillNodeId: string; newMasteryLevel: number; capped: boolean }[] } | null>(null)

  const subjectNodes = nodes.filter(n => n.subject === subject)
  const nameById = new Map(nodes.map(n => [n.id, n.name]))

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
      setResult({ analysis: data.analysis, applied: data.applied })
      showToast('info', `Exam analyzed — ${data.applied.length} topic(s) updated`)
      router.refresh()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    const lowGrade = ['D', 'F'].includes(grade)
    return (
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-gray-100">Exam Analyzed</h1>
        {lowGrade && (
          <div className="bg-yellow-950/30 border border-yellow-800/50 text-yellow-300 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} /> Low grade — no mastery gain applied. Review the topics below.
          </div>
        )}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-2 flex items-center gap-2"><Sparkles size={15} className="text-purple-400" /> Insight</h2>
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
                  <span className="text-purple-300 font-semibold">
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
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><GraduationCap size={22} className="text-purple-400" /> Real Exam</h1>
        <p className="text-sm text-gray-500 mt-0.5">Log a university exam. Only A/A+ exams can push a topic from 4.0 → 5.0 stars.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Exam name</label>
            <input value={examName} onChange={e => setExamName(e.target.value)} placeholder="Linear Algebra Final"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subject</label>
            <select value={subject} onChange={e => { setSubject(e.target.value as Subject); setSelected(new Set()) }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600">
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Grade</label>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${grade === g ? 'bg-purple-900/60 border-purple-700 text-purple-200' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Topics covered ({selected.size} selected)</label>
          <div className="max-h-48 overflow-y-auto border border-gray-800 rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {subjectNodes.map(n => (
              <button key={n.id} onClick={() => toggle(n.id)}
                className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${selected.has(n.id) ? 'bg-purple-900/50 text-purple-200' : 'text-gray-400 hover:bg-gray-800'}`}>
                {selected.has(n.id) ? '✓ ' : ''}{n.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Performance notes (optional, max 500 chars)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))} rows={3}
            placeholder="What did you solve well? What was hard?"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-purple-600" />
        </div>

        <button onClick={submit} disabled={loading}
          className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2">
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
                <span className="text-purple-300 font-semibold">{e.grade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
