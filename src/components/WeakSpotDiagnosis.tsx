'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Stethoscope, Route, Check } from 'lucide-react'

type Step = { skillNodeId: string; topicName: string; action: 'review' | 'study' | 'quiz'; why: string }
type Weak = { skillNodeId: string; topicName: string; masteryLevel: number; why: string }
type Diagnosis = { weakPrerequisites: Weak[]; microPath: Step[]; reviewSuggestion: string }

interface Props {
  skillNodeId: string
  topicName: string
  subject: string
  score: number
  source: 'quiz' | 'exercise' | 'exam'
  wrongAnswers?: { question: string; userAnswer: string }[]
  auto?: boolean   // fetch on mount
}

const ACTION_STYLE: Record<string, string> = {
  review: 'bg-blue-900/40 border-blue-800/50 text-blue-300',
  study:  'bg-orange-900/40 border-orange-800/50 text-orange-300',
  quiz:   'bg-green-900/40 border-green-800/50 text-green-300',
}

export default function WeakSpotDiagnosis({ skillNodeId, topicName, subject, score, source, wrongAnswers, auto = true }: Props) {
  const [diag, setDiag] = useState<Diagnosis | null>(null)
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(auto)
  const [creating, setCreating] = useState(false)
  const [pinned, setPinned] = useState(false)

  async function run() {
    setStarted(true); setLoading(true)
    try {
      const res = await fetch('/api/weak-spots/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, subject, score, source, wrongAnswers }),
      })
      setDiag(await res.json())
    } catch { setDiag(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (auto) run() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createMicroPath() {
    if (!diag) return
    setCreating(true)
    try {
      // Reuse the diagnosis already on screen — no second Claude call.
      const res = await fetch('/api/weak-spots/diagnose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, subject, source, createPath: true, microPath: diag.microPath }),
      })
      const data = await res.json()
      if (data.pathId) {
        // pin it so it shows on the dashboard
        await fetch(`/api/learning-path/${data.pathId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: true }) }).catch(() => {})
        setPinned(true)
      }
    } finally { setCreating(false) }
  }

  if (!started) {
    return (
      <button onClick={run} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors">
        <Stethoscope size={12} /> Diagnose weak spots
      </button>
    )
  }
  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-500 py-2"><Loader2 size={12} className="animate-spin" /> Diagnosing weak spots…</div>
  if (!diag) return <div className="text-xs text-gray-600">Diagnosis unavailable.</div>

  return (
    <div className="space-y-3 bg-gray-900/40 border border-gray-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
        <Stethoscope size={13} className="text-orange-400" /> Weak-spot diagnosis
      </div>
      <p className="text-xs text-gray-400">{diag.reviewSuggestion}</p>

      {/* Micro-path */}
      {diag.microPath.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Micro-learning path</div>
          <div className="space-y-1.5">
            {diag.microPath.map((s, i) => (
              <div key={s.skillNodeId} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-[10px] text-gray-400 flex items-center justify-center shrink-0">{i + 1}</span>
                <Link href={`/topics?subject=${subject}`} className="flex-1 min-w-0 flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg px-2.5 py-1.5 hover:border-orange-700/50 transition-colors">
                  <span className="text-xs text-gray-200 truncate">{s.topicName}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ml-2 capitalize ${ACTION_STYLE[s.action] ?? 'bg-gray-800 border-gray-700 text-gray-400'}`}>{s.action}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {pinned ? (
        <div className="flex items-center gap-1.5 text-xs text-green-400"><Check size={13} /> Micro-path pinned to your dashboard</div>
      ) : (
        <button onClick={createMicroPath} disabled={creating || diag.microPath.length === 0}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors">
          {creating ? <Loader2 size={12} className="animate-spin" /> : <Route size={12} />} Create &amp; pin micro-path
        </button>
      )}
    </div>
  )
}
