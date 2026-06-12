'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Clock, Search, X, Link as LinkIcon, NotebookPen } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'
import StarRating from './StarRating'

type Node = { id: string; name: string; subject: string; masteryLevel: number }
type Log = { id: string; durationMins: number; note: string | null; sourceUrl: string | null; startTime: string; topicName: string | null; subject: string | null }

function subj(s: string | null) { return s ? (SUBJECT_LABEL[s as Subject] ?? s) : '' }

export default function QuickLog() {
  const router = useRouter()
  const { showToast } = useToast()
  const [nodes, setNodes] = useState<Node[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Node | null>(null)
  const [showList, setShowList] = useState(false)
  const [mins, setMins] = useState('30')
  const [rate, setRate] = useState(false)
  const [rating, setRating] = useState(0)
  const [note, setNote] = useState('')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/skill-nodes').then(r => r.json()).then(d => setNodes(d.nodes ?? [])).catch(() => {})
    loadLogs()
  }, [])

  function loadLogs() { fetch('/api/log-study').then(r => r.json()).then(d => setLogs(d.logs ?? [])).catch(() => {}) }

  useEffect(() => {
    function onClick(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as unknown as globalThis.Node)) setShowList(false) }
    document.addEventListener('mousedown', onClick); return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const matches = query.trim().length > 0
    ? nodes.filter(n => n.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  async function submit() {
    if (!picked) { showToast('info', 'Pick a topic'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/log-study', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId: picked.id, durationMins: parseInt(mins) || 30, selfRating: rate ? rating : null, note, sourceUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('info', `Logged ${mins}m on ${picked.name}${data.newMasteryLevel != null ? ` · ${data.newMasteryLevel}★` : ''}`)
      const unlocked: string[] = data.unlockedNames ?? []
      if (unlocked.length > 0) showToast('info', `🔓 Unlocked: ${unlocked.slice(0, 4).join(', ')}${unlocked.length > 4 ? ` +${unlocked.length - 4} more` : ''}`)
      setPicked(null); setQuery(''); setMins('30'); setRate(false); setRating(0); setNote(''); setUrl('')
      loadLogs(); router.refresh()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Failed to log')
    } finally { setSaving(false) }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><NotebookPen size={15} className="text-orange-400" /> Quick Log</h2>

      {/* Topic picker */}
      <div ref={boxRef} className="relative mb-2">
        {picked ? (
          <div className="flex items-center justify-between bg-orange-950/30 border border-orange-800/50 rounded-lg px-3 py-2">
            <span className="text-sm text-orange-200 truncate">{picked.name} <span className="text-[10px] text-gray-500">{subj(picked.subject)} · {picked.masteryLevel}★</span></span>
            <button onClick={() => { setPicked(null); setQuery('') }} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <Search size={14} className="text-gray-500 shrink-0" />
              <input value={query} onChange={e => { setQuery(e.target.value); setShowList(true) }} onFocus={() => setShowList(true)}
                placeholder="Search a topic you studied…"
                className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-gray-600" />
            </div>
            {showList && matches.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-1">
                {matches.map(n => (
                  <button key={n.id} onClick={() => { setPicked(n); setShowList(false) }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm rounded hover:bg-gray-800">
                    <span className="text-gray-300 truncate">{n.name}</span>
                    <span className="text-[10px] text-gray-600 shrink-0">{subj(n.subject)} · {n.masteryLevel}★</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Minutes + self-rate toggle */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
          <Clock size={13} className="text-gray-500" />
          <input type="number" value={mins} onChange={e => setMins(e.target.value)} className="w-14 bg-transparent text-sm text-gray-200 focus:outline-none" />
          <span className="text-xs text-gray-500">min</span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={rate} onChange={e => setRate(e.target.checked)} className="accent-orange-600" />
          Update self-rating
        </label>
        {rate && <StarRating value={rating} onChange={setRating} size="sm" />}
      </div>

      {/* Note + source link */}
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Note: what did you study / learn? (optional)"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-orange-600 mb-2" />
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 mb-3">
        <LinkIcon size={13} className="text-gray-500 shrink-0" />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Source link (e.g. your ChatGPT conversation) — optional"
          className="flex-1 bg-transparent text-xs text-gray-200 focus:outline-none placeholder-gray-600" />
      </div>

      <button onClick={submit} disabled={saving || !picked}
        className="w-full py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Log study
      </button>

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-3">
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">Recent logs</div>
          <div className="space-y-1.5">
            {logs.map(l => (
              <div key={l.id} className="text-xs bg-gray-800/40 rounded-lg px-3 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 truncate">{l.topicName ?? 'General'}</span>
                  <span className="text-[10px] text-gray-600 shrink-0 ml-2">{l.durationMins}m · {new Date(l.startTime).toLocaleDateString()}</span>
                </div>
                {l.note && <div className="text-[11px] text-gray-500 mt-0.5">{l.note}</div>}
                {l.sourceUrl && <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-400 hover:text-orange-300">source ↗</a>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
