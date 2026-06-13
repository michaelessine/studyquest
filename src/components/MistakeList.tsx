'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Loader2, Trash2, RotateCcw, CheckCircle2, Bug, ChevronDown, GraduationCap } from 'lucide-react'
import { useToast } from './ToastProvider'

export type Mistake = {
  id: string; title: string; details: string | null; reason: string | null; resolved: boolean
  source: string; sourceRef: string | null; courseId: string | null; skillNodeId: string | null
  courseName: string | null; topicName: string | null; createdAt: string
}
type TopicOpt = { id: string; name: string; courseId?: string | null }

export default function MistakeList({ courseId, skillNodeId, topics, heading, defaultTitle, source = 'manual', sourceRef, compact }: {
  courseId?: string
  skillNodeId?: string
  topics?: TopicOpt[]
  heading?: string
  defaultTitle?: string
  source?: string
  sourceRef?: string
  compact?: boolean
}) {
  const { showToast } = useToast()
  const [items, setItems] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // add form
  const [title, setTitle] = useState(defaultTitle ?? '')
  const [details, setDetails] = useState('')
  const [topicSel, setTopicSel] = useState(skillNodeId ?? '')

  const load = useCallback(() => {
    const qs = new URLSearchParams()
    if (courseId) qs.set('courseId', courseId)
    if (skillNodeId) qs.set('skillNodeId', skillNodeId)
    fetch(`/api/mistakes?${qs}`).then(r => r.json()).then(d => { setItems(d.items ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [courseId, skillNodeId])
  useEffect(() => { setLoading(true); load() }, [load])

  async function add() {
    if (!title.trim()) { showToast('info', 'Add a short title'); return }
    setBusy(true)
    try {
      const node = topics?.find(t => t.id === topicSel)
      await fetch('/api/mistakes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, details,
          skillNodeId: topicSel || skillNodeId || null,
          courseId: courseId || node?.courseId || null,
          source, sourceRef,
        }),
      })
      setTitle(''); setDetails('')
      showToast('info', 'Saved to your mistake log')
      load()
    } finally { setBusy(false) }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch('/api/mistakes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...data }) })
    load()
  }
  async function del(id: string) {
    await fetch(`/api/mistakes?id=${id}`, { method: 'DELETE' }); load()
  }

  const visible = items.filter(i => showResolved || !i.resolved)
  const openCount = items.filter(i => !i.resolved).length

  return (
    <div className="space-y-3">
      {heading && (
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><Bug size={15} className="text-orange-400" /> {heading}</h2>
          {items.some(i => i.resolved) && (
            <button onClick={() => setShowResolved(s => !s)} className="text-xs text-gray-500 hover:text-gray-300">
              {showResolved ? 'Hide' : 'Show'} resolved
            </button>
          )}
        </div>
      )}

      {/* Add form */}
      <div className="bg-gray-800/40 rounded-lg p-3 space-y-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Problem (e.g. “Problem 3 — Lagrangian duality”)"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-orange-600 placeholder-gray-600" />
        <div className="flex gap-2">
          {topics && topics.length > 0 && (
            <select value={topicSel} onChange={e => setTopicSel(e.target.value)}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-orange-600">
              <option value="">— topic (optional) —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button onClick={add} disabled={busy || !title.trim()} className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-xs rounded-lg flex items-center gap-1.5 shrink-0">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-orange-500" /></div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-600">{openCount === 0 && items.length > 0 ? 'All cleared — nothing left to redo. 🎉' : 'No failed problems logged here yet.'}</p>
      ) : (
        <div className="space-y-1.5">
          {!compact && <div className="text-[11px] text-gray-600">{openCount} to redo{items.length - openCount > 0 ? ` · ${items.length - openCount} resolved` : ''}</div>}
          {visible.map(m => (
            <div key={m.id} className={`rounded-lg border ${m.resolved ? 'bg-green-950/15 border-green-900/30' : 'bg-gray-800/50 border-gray-700/50'}`}>
              <div className="flex items-start gap-2 px-3 py-2">
                <button onClick={() => patch(m.id, { resolved: !m.resolved })} title={m.resolved ? 'Mark to redo' : 'Mark redone'}
                  className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${m.resolved ? 'bg-green-600 border-green-500' : 'border-gray-600 hover:border-orange-500'}`}>
                  {m.resolved && <CheckCircle2 size={11} className="text-white" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${m.resolved ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{m.title}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-gray-600">
                    {m.topicName && <span className="px-1.5 py-0.5 bg-gray-800 rounded">{m.topicName}</span>}
                    {m.courseName && <span className="px-1.5 py-0.5 bg-gray-800 rounded">{m.courseName}</span>}
                    {m.sourceRef && <span>{m.sourceRef}</span>}
                    {m.reason && <span className="text-orange-400/80">· has reason</span>}
                  </div>
                </div>
                <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} className="shrink-0 text-gray-500 hover:text-gray-300"><ChevronDown size={14} className={expanded === m.id ? 'rotate-180' : ''} /></button>
                <button onClick={() => del(m.id)} className="shrink-0 text-gray-600 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
              {expanded === m.id && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-gray-800/70">
                  {m.details && <div className="text-xs text-gray-400 whitespace-pre-wrap">{m.details}</div>}
                  <ReasonEditor initial={m.reason ?? ''} onSave={r => patch(m.id, { reason: r })} />
                  {m.skillNodeId && (
                    <Link href={`/practice/${m.skillNodeId}`}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-orange-900/40 border border-orange-800/50 text-orange-300 hover:bg-orange-800/40 rounded-lg transition-colors">
                      <GraduationCap size={13} /> Practice this topic
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReasonEditor({ initial, onSave }: { initial: string; onSave: (r: string) => void }) {
  const [val, setVal] = useState(initial)
  const [saved, setSaved] = useState(false)
  return (
    <div>
      <label className="text-[11px] text-gray-500 flex items-center gap-1 mb-1"><RotateCcw size={11} /> Why did I miss this? (logic flaw, weak point, missing concept)</label>
      <textarea value={val} onChange={e => { setVal(e.target.value); setSaved(false) }} rows={2}
        placeholder="e.g. Forgot to check the boundary case; didn't recognize it as a duality problem…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 resize-none focus:outline-none focus:border-orange-600 placeholder-gray-600" />
      <button onClick={() => { onSave(val); setSaved(true) }} className="mt-1.5 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[11px] rounded">
        {saved ? 'Saved ✓' : 'Save reason'}
      </button>
    </div>
  )
}
