'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, ExternalLink, Lock, RefreshCw, Loader2, FolderInput, Check, Plus, X, Link2, Unlink, Trash2 } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'
import StarRating from './StarRating'

type TopicNode = {
  id: string; name: string; subject: string; status: string
  tier: number; category: string; masteryLevel: number; prereqNames: string[]
  nextReviewAt: string | null
}

interface Props { nodes: TopicNode[] }

// Title-case a topic name: capitalize every word, but keep acronyms / intentional
// casing as-is (ODE, PDE, SQL, LLMs, PyTorch, C++, scikit-learn → Scikit-learn, etc.).
function toTitle(name: string): string {
  return name.split(/\s+/).map(w => (/[A-Z]/.test(w) ? w : w.replace(/[a-z]/, c => c.toUpperCase()))).join(' ')
}

// ── Expanded resource links (Fix 2) ──────────────────────────────────────────
function ResourceLinks({ name }: { name: string }) {
  const q = name.replace(/\s+/g, '+')
  const groups = [
    {
      label: 'Video',
      links: [
        { label: 'YouTube Lectures', url: `https://www.youtube.com/results?search_query=${q}+lecture`, color: 'text-red-400 hover:text-red-300' },
      ],
    },
    {
      label: 'Courses',
      links: [
        { label: 'MIT OpenCourseWare', url: `https://ocw.mit.edu/search/?q=${q}`, color: 'text-blue-400 hover:text-blue-300' },
        { label: 'Khan Academy',        url: `https://www.khanacademy.org/search?page_search_query=${q}`, color: 'text-green-400 hover:text-green-300' },
      ],
    },
    {
      label: 'Books (free PDFs)',
      links: [
        { label: 'Library Genesis', url: `https://libgen.is/search.php?req=${q}`, color: 'text-yellow-400 hover:text-yellow-300' },
        { label: 'Internet Archive', url: `https://archive.org/search?query=${q}`, color: 'text-orange-400 hover:text-orange-300' },
      ],
    },
    {
      label: 'Papers',
      links: [
        { label: 'arXiv',          url: `https://arxiv.org/search/?query=${q}&searchtype=all`, color: 'text-orange-400 hover:text-orange-300' },
        { label: 'Google Scholar', url: `https://scholar.google.com/scholar?q=${q}`, color: 'text-sky-400 hover:text-sky-300' },
      ],
    },
    {
      label: 'Lecture Notes',
      links: [
        { label: 'Scholar PDFs',  url: `https://scholar.google.com/scholar?q=${q}+lecture+notes+filetype:pdf`, color: 'text-teal-400 hover:text-teal-300' },
        { label: 'EDU search',    url: `https://www.google.com/search?q=${q}+lecture+notes+site:edu`, color: 'text-indigo-400 hover:text-indigo-300' },
      ],
    },
  ]

  return (
    <div className="border-t border-gray-800 px-4 py-3 space-y-2">
      {groups.map(g => (
        <div key={g.label}>
          <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1">{g.label}</div>
          <div className="flex flex-wrap gap-2">
            {g.links.map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1 text-xs font-medium transition-colors ${l.color}`}>
                <ExternalLink size={10} /> {l.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Mastery → card style ──────────────────────────────────────────────────────
function cardStyle(status: string, ml: number) {
  if (ml >= 5) return 'bg-green-950/20 border-green-900/40'
  if (ml >= 3) return 'bg-orange-950/20 border-orange-900/40'
  if (ml >= 1) return 'bg-blue-950/20 border-blue-900/30'
  if (status === 'unlocked') return 'bg-gray-900 border-gray-700 hover:border-orange-700/50'
  return 'bg-gray-900/50 border-gray-800 opacity-60'
}

function MoveTopicButton({ node, allNodes, onMoved }: {
  node: TopicNode
  allNodes: TopicNode[]
  onMoved: (id: string, subject: string, category: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Categories within the current subject (from all nodes)
  const localCategories = Array.from(new Set(
    allNodes.filter(n => n.subject === node.subject).map(n => n.category)
  )).sort()

  async function move(subject: string, category: string) {
    if (subject === node.subject && category === node.category) { setOpen(false); return }
    setBusy(true); setOpen(false)
    try {
      const body: Record<string, string> = { type: 'skillNode' }
      if (subject !== node.subject) body.subject = subject
      if (category !== node.category) body.category = category
      const res = await fetch(`/api/topics/${node.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      const label = subject !== node.subject
        ? `${SUBJECT_LABEL[subject as Subject] ?? subject} › ${category}`
        : category
      showToast('info', `Moved to ${label}`)
      onMoved(node.id, subject, category)
    } catch {
      showToast('info', 'Failed to move topic')
    } finally { setBusy(false) }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} disabled={busy}
        title="Move to another category or subject"
        className="p-1 text-gray-600 hover:text-blue-400 transition-colors">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <FolderInput size={12} />}
      </button>
      {open && (
        <div className="absolute right-0 top-6 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 z-20 max-h-72 overflow-y-auto">
          {/* Categories within current subject */}
          <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
            {SUBJECT_LABEL[node.subject as Subject]} — category
          </div>
          {localCategories.map(cat => (
            <button key={cat} onClick={() => move(node.subject, cat)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-800 transition-colors">
              <span className={cat === node.category ? 'text-orange-300 font-medium' : 'text-gray-300'}>{cat}</span>
              {cat === node.category && <Check size={10} className="text-orange-400 shrink-0" />}
            </button>
          ))}

          {/* Other subjects */}
          <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600 border-t border-gray-800 mt-1">
            Move to subject
          </div>
          {SUBJECTS.filter(s => s !== node.subject).map(s => (
            <button key={s} onClick={() => move(s, 'Custom')}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
              {SUBJECT_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ConnectionsPanel({ node, allNodes, onChanged }: {
  node: TopicNode; allNodes: TopicNode[]; onChanged: () => void
}) {
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const candidates = allNodes.filter(n =>
    n.id !== node.id &&
    !node.prereqNames.includes(n.name) &&
    n.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  async function addPrereq(prereq: TopicNode) {
    setBusy(prereq.id)
    try {
      const res = await fetch('/api/dependencies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prerequisiteId: prereq.id, dependentId: node.id }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      showToast('info', `Added: ${prereq.name} → ${node.name}`)
      onChanged()
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Failed to add link')
    } finally { setBusy(null); setQuery(''); setShowAdd(false) }
  }

  async function removePrereq(prereqName: string) {
    const prereq = allNodes.find(n => n.name === prereqName)
    if (!prereq) return
    setBusy(prereq.id)
    try {
      await fetch('/api/dependencies', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prerequisiteId: prereq.id, dependentId: node.id }),
      })
      showToast('info', `Removed: ${prereqName} → ${node.name}`)
      onChanged()
    } catch {
      showToast('info', 'Failed to remove link')
    } finally { setBusy(null) }
  }

  return (
    <div className="border-t border-gray-800 px-4 py-3 space-y-2">
      <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
        <Link2 size={10} /> Prerequisites
      </div>
      <div className="flex flex-wrap gap-1.5">
        {node.prereqNames.length === 0 && <span className="text-xs text-gray-600 italic">None</span>}
        {node.prereqNames.map(name => (
          <span key={name} className="flex items-center gap-1 text-[11px] px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-300">
            {toTitle(name)}
            <button onClick={() => removePrereq(name)} disabled={busy === allNodes.find(n => n.name === name)?.id}
              className="text-gray-600 hover:text-red-400 transition-colors ml-0.5">
              {busy === allNodes.find(n => n.name === name)?.id ? <Loader2 size={9} className="animate-spin" /> : <Unlink size={9} />}
            </button>
          </span>
        ))}
      </div>
      {showAdd ? (
        <div className="relative">
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search topic to add as prereq…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-orange-600" />
          {candidates.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 max-h-40 overflow-y-auto">
              {candidates.map(n => (
                <button key={n.id} onClick={() => addPrereq(n)} disabled={!!busy}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition-colors">
                  {toTitle(n.name)} <span className="text-gray-600">· {SUBJECT_LABEL[n.subject as Subject] ?? n.subject}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setShowAdd(false); setQuery('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-orange-400 transition-colors">
          <Plus size={10} /> Add prerequisite
        </button>
      )}
    </div>
  )
}

function TopicCard({ node, saving, onRate, onMoved, onDelete, allNodes, onRefresh }: {
  node: TopicNode; saving: string | null
  onRate: (id: string, ml: number) => void
  onMoved: (id: string, subject: string, category: string) => void
  onDelete: (id: string, name: string) => void
  allNodes: TopicNode[]
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showConnections, setShowConnections] = useState(false)
  const isLocked   = node.status === 'locked'
  const isSaving   = saving === node.id

  return (
    <div className={`border rounded-xl transition-colors ${cardStyle(node.status, node.masteryLevel)}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2 min-w-0">
            {isLocked && <Lock size={13} className="text-gray-600 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-200 leading-snug">{toTitle(node.name)}</div>
              {node.prereqNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {node.prereqNames.map(p => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-500 whitespace-nowrap">{toTitle(p)}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-0.5">
            <span className="text-[10px] text-gray-600 mr-1">Tier {node.tier}</span>
            <MoveTopicButton node={node} allNodes={allNodes} onMoved={onMoved} />
            <button onClick={() => onDelete(node.id, node.name)}
              title="Delete topic"
              className="p-1 text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Star rating — shown for unlocked/in_progress/mastered */}
        {!isLocked && (
          <div className="flex items-center justify-between">
            <StarRating
              value={node.masteryLevel}
              onChange={ml => onRate(node.id, ml)}
              size="sm"
            />
            {isSaving && <span className="text-[10px] text-gray-500">Saving…</span>}
          </div>
        )}

        {node.nextReviewAt && (
          <div className="mt-2 text-[10px] text-gray-600">
            Review: {new Date(node.nextReviewAt).toLocaleDateString()}
          </div>
        )}

        {/* Toggles row */}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Resources
          </button>
          <button onClick={() => setShowConnections(c => !c)}
            className={`flex items-center gap-1 text-xs transition-colors ${showConnections ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'}`}>
            <Link2 size={11} /> Connections {node.prereqNames.length > 0 && <span className="text-[10px] opacity-60">({node.prereqNames.length})</span>}
          </button>
        </div>
      </div>

      {expanded && <ResourceLinks name={node.name} />}
      {showConnections && <ConnectionsPanel node={node} allNodes={allNodes} onChanged={onRefresh} />}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TopicsClient({ nodes }: Props) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [subject, setSubject] = useState<Subject>(() => {
    const s = searchParams.get('subject')
    return (s && SUBJECTS.includes(s as Subject) ? s : 'Mathematics') as Subject
  })
  const [saving, setSaving]           = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [localMastery, setLocalMastery] = useState<Map<string, number>>(new Map())
  const [localSubject, setLocalSubject] = useState<Map<string, string>>(new Map())
  const [localCategory, setLocalCategory] = useState<Map<string, string>>(new Map())
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Custom')

  async function recalcUnlocks() {
    setRecalculating(true)
    try {
      const res = await fetch('/api/cascade-unlock', { method: 'POST' })
      const data = await res.json()
      showToast('info', `Recalculated — ${data.unlocked ?? 0} node(s) unlocked`)
      router.refresh()
    } catch {
      showToast('info', 'Recalculation failed')
    } finally {
      setRecalculating(false)
    }
  }

  // Clear optimistic state when server data refreshes
  useEffect(() => {
    setLocalMastery(prev => {
      const next = new Map(Array.from(prev.entries()).filter(([id, ml]) => {
        const n = nodes.find(n => n.id === id)
        return n && n.masteryLevel !== ml
      }))
      return next.size === prev.size ? prev : next
    })
  }, [nodes])

  const onRate = useCallback(async (id: string, ml: number) => {
    setLocalMastery(prev => new Map(Array.from(prev.entries()).concat([[id, ml]])))
    setSaving(id)
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'skillNode', masteryLevel: ml }),
      })
      const data = await res.json().catch(() => ({}))
      const name = nodes.find(n => n.id === id)?.name ?? 'Topic'
      if (ml >= 5) showToast('info', `★★★★★ ${name} mastered!`)
      else if (ml > 0) showToast('info', `Rated "${name}" ${ml}★`)
      const unlocked: string[] = data.unlockedNames ?? []
      if (unlocked.length > 0) showToast('info', `🔓 Unlocked: ${unlocked.slice(0, 4).join(', ')}${unlocked.length > 4 ? ` +${unlocked.length - 4} more` : ''}`)
      router.refresh()
    } catch {
      setLocalMastery(prev => { const m = new Map(prev); m.delete(id); return m })
      showToast('info', 'Failed to save — please try again')
    } finally {
      setSaving(null)
    }
  }, [nodes, router, showToast])

  async function deleteTopic(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes all its prerequisite links and mastery history.`)) return
    try {
      const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast('info', `Deleted "${name}"`)
      router.refresh()
    } catch {
      showToast('info', 'Failed to delete topic')
    }
  }

  async function createTopic() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/nodes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), subject, category: newCategory || 'Custom', tier: 0 }),
      })
      if (!res.ok) throw new Error()
      showToast('info', `Created "${newName.trim()}"`)
      setNewName(''); setNewCategory('Custom'); setShowCreate(false)
      router.refresh()
    } catch {
      showToast('info', 'Failed to create topic')
    } finally { setCreating(false) }
  }

  const onMoved = useCallback((id: string, newSubject: string, newCategory: string) => {
    setLocalSubject(prev => new Map(prev).set(id, newSubject))
    setLocalCategory(prev => new Map(prev).set(id, newCategory))
    router.refresh()
  }, [router])

  const subjectNodes = nodes
    .map(n => ({
      ...n,
      subject: localSubject.get(n.id) ?? n.subject,
      category: localCategory.get(n.id) ?? n.category,
    }))
    .filter(n => n.subject === subject)

  // Group by category, then show tier within each category section
  const categories = Array.from(new Set(subjectNodes.map(n => n.category))).sort()

  const stats = SUBJECTS.map(s => {
    const sn = nodes.filter(n => n.subject === s)
    return { subject: s, rated: sn.filter(n => n.masteryLevel >= 1).length, total: sn.length }
  })

  return (
    <div className="overflow-x-hidden">
      {/* Subject tabs + admin actions */}
      <div className="relative border-b border-gray-800 flex items-center">
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none flex-1">
          {SUBJECTS.map(s => {
            const st = stats.find(x => x.subject === s)!
            const active = s === subject
            return (
              <button key={s} onClick={() => setSubject(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 ${
                  active ? 'bg-orange-900/60 border border-orange-700 text-orange-300'
                         : 'bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-gray-200'
                }`}>
                {SUBJECT_LABEL[s]}
                <span className="text-xs opacity-60">{st.rated}/{st.total}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 mx-3 shrink-0">
          <button onClick={() => setShowCreate(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-900/50 hover:bg-orange-800/60 border border-orange-800/60 text-orange-300 rounded-lg transition-colors">
            <Plus size={12} /> New topic
          </button>
          <button onClick={recalcUnlocks} disabled={recalculating}
            title="Re-evaluate all locked nodes against their prerequisites"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800/60 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50">
            {recalculating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Recalculate
          </button>
        </div>
      </div>

      {/* Create topic form */}
      {showCreate && (
        <div className="mx-5 md:mx-8 mt-4 p-4 card border-orange-700/40 space-y-3">
          <div className="text-sm font-semibold text-gray-200">New topic in {SUBJECT_LABEL[subject]}</div>
          <div className="flex gap-2 flex-wrap">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTopic(); if (e.key === 'Escape') setShowCreate(false) }}
              placeholder="Topic name"
              className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)}
              placeholder="Category (e.g. Custom)"
              className="w-44 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            <button onClick={createTopic} disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-lg">
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-gray-500 hover:text-gray-300 text-sm"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Category groups */}
      <div className="p-5 md:p-8 space-y-10 w-full">
        {categories.map(cat => {
          const catNodes = subjectNodes.filter(n => n.category === cat)
          const rated = catNodes.filter(n => (localMastery.get(n.id) ?? n.masteryLevel) >= 1).length
          return (
            <section key={cat} className="w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-orange-400 shrink-0">{cat}</span>
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-600 shrink-0">{rated}/{catNodes.length} rated</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
                {catNodes.map(n => (
                  <TopicCard
                    key={n.id}
                    node={{ ...n, masteryLevel: localMastery.get(n.id) ?? n.masteryLevel }}
                    saving={saving}
                    onRate={onRate}
                    onMoved={onMoved}
                    onDelete={deleteTopic}
                    allNodes={nodes}
                    onRefresh={() => router.refresh()}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
