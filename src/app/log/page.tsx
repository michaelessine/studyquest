'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, X, Check, Clock } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from '@/components/ToastProvider'

type Node = { id: string; name: string; subject: string; masteryLevel: number }
type Log = { id: string; durationMins: number; startTime: string; topicName: string | null }

function subj(s: string | null) { return s ? (SUBJECT_LABEL[s as Subject] ?? s) : '' }
const PRESETS = [15, 30, 45, 60, 90, 120]

export default function MobileLogPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [nodes, setNodes] = useState<Node[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Node | null>(null)
  const [showList, setShowList] = useState(false)
  const [mins, setMins] = useState(30)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/skill-nodes').then(r => r.json()).then(d => setNodes(d.nodes ?? [])).catch(() => {})
    loadLogs()
  }, [])
  function loadLogs() { fetch('/api/log-study?limit=5').then(r => r.json()).then(d => setLogs(d.logs ?? [])).catch(() => {}) }

  useEffect(() => {
    function onClick(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as unknown as globalThis.Node)) setShowList(false) }
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const matches = query.trim().length > 0
    ? nodes.filter(n => n.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  async function submit() {
    if (!picked) { showToast('info', 'Pick a topic first'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/log-study', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId: picked.id, durationMins: mins, note }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('info', `Logged ${mins}m on ${picked.name}`)
      setPicked(null); setQuery(''); setMins(30); setNote('')
      loadLogs(); router.refresh()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Failed to log')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen p-4 pb-24 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Quick Log</h1>
      <p className="text-sm text-gray-500 mb-5">Capture a study session in a few taps.</p>

      {/* Topic picker */}
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Topic</label>
      <div ref={boxRef} className="relative mb-5">
        {picked ? (
          <div className="flex items-center justify-between bg-orange-950/30 border border-orange-800/50 rounded-xl px-4 py-3.5">
            <span className="text-base text-orange-200 truncate">{picked.name}
              <span className="block text-[11px] text-gray-500">{subj(picked.subject)} · {picked.masteryLevel}★</span>
            </span>
            <button onClick={() => { setPicked(null); setQuery('') }} className="text-gray-400 p-1"><X size={20} /></button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5">
              <Search size={18} className="text-gray-500 shrink-0" />
              <input value={query} onChange={e => { setQuery(e.target.value); setShowList(true) }} onFocus={() => setShowList(true)}
                placeholder="Search a topic…" autoComplete="off"
                className="flex-1 bg-transparent text-base text-gray-200 focus:outline-none placeholder-gray-600" />
            </div>
            {showList && matches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-1">
                {matches.map(n => (
                  <button key={n.id} onClick={() => { setPicked(n); setShowList(false) }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left rounded-lg hover:bg-gray-800 active:bg-gray-800">
                    <span className="text-gray-200 truncate">{n.name}</span>
                    <span className="text-[11px] text-gray-600 shrink-0">{subj(n.subject)} · {n.masteryLevel}★</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Minutes — big preset buttons */}
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Time</label>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {PRESETS.map(p => (
          <button key={p} onClick={() => setMins(p)}
            className={`py-4 rounded-xl text-base font-semibold border transition-colors ${
              mins === p ? 'bg-orange-700 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 active:bg-gray-700'
            }`}>
            {p}m
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 mb-5">
        <Clock size={16} className="text-gray-500" />
        <input type="number" value={mins} onChange={e => setMins(Math.max(1, parseInt(e.target.value) || 0))}
          className="w-20 bg-transparent text-base text-gray-200 focus:outline-none" />
        <span className="text-sm text-gray-500">minutes (custom)</span>
      </div>

      {/* Note */}
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Note (optional)</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="What did you study / learn?"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-base text-gray-200 resize-none focus:outline-none focus:border-orange-600 mb-5" />

      <button onClick={submit} disabled={saving || !picked}
        className="w-full py-4 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2">
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Log session
      </button>

      {/* Recent */}
      {logs.length > 0 && (
        <div className="mt-7">
          <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Recent</div>
          <div className="space-y-1.5">
            {logs.map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm bg-gray-800/40 rounded-lg px-4 py-2.5">
                <span className="text-gray-300 truncate">{l.topicName ?? 'General'}</span>
                <span className="text-[11px] text-gray-600 shrink-0 ml-2">{l.durationMins}m · {new Date(l.startTime).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
