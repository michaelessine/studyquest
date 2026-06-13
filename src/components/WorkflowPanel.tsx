'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Lightbulb, Trash2, Workflow } from 'lucide-react'
import { PHASES } from '@/lib/workflow'
import { useToast } from './ToastProvider'

type Trick = { id: string; note: string | null; timestamp: string }

export default function WorkflowPanel({ skillNodeId }: { skillNodeId: string }) {
  const { showToast } = useToast()
  const [counts, setCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 })
  const [tricks, setTricks] = useState<Trick[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [trick, setTrick] = useState('')

  const load = useCallback(() => {
    fetch(`/api/phase-log?skillNodeId=${skillNodeId}`)
      .then(r => r.json())
      .then(d => { setCounts(d.counts ?? { 1: 0, 2: 0, 3: 0, 4: 0 }); setTricks(d.tricks ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [skillNodeId])

  useEffect(() => { setLoading(true); load() }, [load])

  async function logPhase(phase: number, note?: string) {
    setBusy(true)
    try {
      await fetch('/api/phase-log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, phase, note }),
      })
      load()
    } finally { setBusy(false) }
  }

  async function addTrick() {
    if (!trick.trim()) return
    await logPhase(2, trick.trim())
    setTrick('')
    showToast('info', 'Core trick captured')
  }

  async function delTrick(id: string) {
    await fetch(`/api/phase-log?id=${id}`, { method: 'DELETE' })
    load()
  }

  if (loading) return <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-orange-500" /></div>

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 flex items-center gap-1.5">
        <Workflow size={13} className="text-orange-400" /> Studying Workflow
        <span className="text-gray-600">· tap each phase as you do it</span>
      </div>

      {/* Phase counters — repeatable */}
      <div className="grid grid-cols-2 gap-1.5">
        {PHASES.map(p => (
          <button key={p.n} onClick={() => logPhase(p.n)} disabled={busy} title={p.hint}
            className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-gray-800/60 border border-gray-700/60 hover:border-orange-700/50 disabled:opacity-50 transition-colors text-left">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-[11px] text-gray-300 truncate">{p.n}. {p.short}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              {counts[p.n] > 0 && <span className="text-[11px] font-bold text-gray-200 tabular-nums">{counts[p.n]}×</span>}
              <Plus size={12} className="text-gray-500" />
            </span>
          </button>
        ))}
      </div>

      {/* Core Trick capture (Phase 2 with a note) */}
      <div className="border-t border-gray-800 pt-3">
        <div className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mb-1.5"><Lightbulb size={12} className="text-purple-400" /> Core Tricks</div>
        <div className="flex gap-1.5">
          <input value={trick} onChange={e => setTrick(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTrick() }}
            placeholder="Name a proof's core trick…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-600 placeholder-gray-600" />
          <button onClick={addTrick} disabled={busy || !trick.trim()} className="px-2.5 py-1.5 bg-purple-800/70 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg"><Plus size={13} /></button>
        </div>
        {tricks.length > 0 && (
          <div className="mt-2 space-y-1">
            {tricks.map(t => (
              <div key={t.id} className="group flex items-start gap-1.5 text-xs text-gray-300 bg-purple-950/20 border border-purple-900/30 rounded px-2 py-1.5">
                <Lightbulb size={11} className="text-purple-400 shrink-0 mt-0.5" />
                <span className="flex-1">{t.note}</span>
                <button onClick={() => delTrick(t.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
