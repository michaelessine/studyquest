'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, ExternalLink, Lock, RefreshCw, Loader2 } from 'lucide-react'
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

function TopicCard({ node, saving, onRate }: {
  node: TopicNode; saving: string | null; onRate: (id: string, ml: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
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
          <div className="shrink-0 text-right">
            <span className="text-[10px] text-gray-600">Tier {node.tier}</span>
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

        {/* Resource toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Resources
        </button>
      </div>

      {expanded && <ResourceLinks name={node.name} />}
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

  const subjectNodes = nodes.filter(n => n.subject === subject)

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
        <button onClick={recalcUnlocks} disabled={recalculating}
          title="Re-evaluate all locked nodes against their prerequisites"
          className="shrink-0 flex items-center gap-1.5 mx-3 px-3 py-1.5 text-xs bg-gray-800/60 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50">
          {recalculating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Recalculate unlocks
        </button>
      </div>

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
