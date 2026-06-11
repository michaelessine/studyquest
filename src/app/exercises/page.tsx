'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from '@/components/ToastProvider'

type Analysis = {
  topics: { skillNodeId: string; name: string; difficulty: string }[]
  problemCount: number
  types: string[]
  masteryGainAt80Percent: number
  masteryGainAt90Percent: number
  masteryGainAt100Percent: number
  summary: string
}

export default function ExercisesPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [subject, setSubject] = useState<Subject>('Mathematics')
  const [file, setFile]       = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis]   = useState<Analysis | null>(null)
  const [setId, setSetId]     = useState<string | null>(null)
  const [pct, setPct]         = useState(80)
  const [applying, setApplying] = useState(false)
  const [done, setDone]       = useState<{ skillNodeId: string; newMasteryLevel: number; capped: boolean }[] | null>(null)

  async function analyze() {
    if (!file) return
    setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('subject', subject)
      const res = await fetch('/api/exercise/analyze', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnalysis(data.analysis); setSetId(data.exerciseSetId)
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function apply() {
    if (!analysis) return
    setApplying(true)
    try {
      const res = await fetch('/api/exercise/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseSetId: setId, skillNodeIds: analysis.topics.map(t => t.skillNodeId), pctSolved: pct }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(data.applied)
      showToast('info', data.applied.length ? `Applied to ${data.applied.length} topic(s)` : 'No gain — solve ≥80% for credit')
      router.refresh()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Failed')
    } finally {
      setApplying(false)
    }
  }

  const nameById = new Map(analysis?.topics.map(t => [t.skillNodeId, t.name]) ?? [])

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><FileText size={22} className="text-purple-400" /> Exercise Sets</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a problem set; report how much you solved to earn mastery (80%→+0.5, 90%→+0.75, 100%→+1.0).</p>
      </div>

      {!analysis && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value as Subject)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600">
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
            </select>
          </div>
          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-purple-600 bg-purple-900/20' : 'border-gray-700 hover:border-gray-600'}`}>
              <Upload size={28} className="mx-auto mb-2 text-gray-500" />
              {file ? <p className="text-sm text-purple-300 font-medium">{file.name}</p>
                    : <p className="text-sm text-gray-400">Click to select a PDF or image</p>}
            </div>
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button onClick={analyze} disabled={!file || analyzing}
            className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 size={15} className="animate-spin" /> Analyzing with Claude…</> : 'Analyze Exercise Set'}
          </button>
        </div>
      )}

      {analysis && !done && (
        <div className="card p-5 space-y-4">
          <p className="text-sm text-gray-400">{analysis.summary}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span>{analysis.problemCount} problems</span>
            <span>·</span>
            <span>{analysis.types?.join(', ')}</span>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Detected topics</div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.topics.map(t => (
                <span key={t.skillNodeId} className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 rounded text-gray-300">{t.name} <span className="text-gray-600">({t.difficulty})</span></span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">How many problems did you solve correctly? <span className="text-purple-300 font-semibold">{pct}%</span></label>
            <input type="range" min={0} max={100} step={5} value={pct} onChange={e => setPct(parseInt(e.target.value))} className="w-full accent-purple-600" />
            <div className="text-[10px] text-gray-600 mt-1">
              Gain: {pct >= 100 ? '+1.0' : pct >= 90 ? '+0.75' : pct >= 80 ? '+0.5' : '0 (need ≥80%)'}★ per topic
            </div>
          </div>
          <button onClick={apply} disabled={applying}
            className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2">
            {applying ? <Loader2 size={15} className="animate-spin" /> : null} Apply Mastery Gain
          </button>
        </div>
      )}

      {done && (
        <div className="card p-5 space-y-2">
          <h2 className="font-semibold text-gray-200 mb-2">Applied</h2>
          {done.length === 0 ? <p className="text-sm text-gray-500">No gain — you need to solve at least 80%.</p> :
            done.map(a => (
              <div key={a.skillNodeId} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 flex items-center gap-2"><CheckCircle2 size={13} className="text-green-400" /> {nameById.get(a.skillNodeId) ?? a.skillNodeId}</span>
                <span className="text-purple-300 font-semibold">→ {a.newMasteryLevel}★ {a.capped && <span className="text-yellow-500 text-xs">(capped 4.0)</span>}</span>
              </div>
            ))}
          <button onClick={() => { setAnalysis(null); setDone(null); setFile(null); setSetId(null); setPct(80) }}
            className="mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm rounded-lg">
            Upload another
          </button>
        </div>
      )}
    </div>
  )
}
