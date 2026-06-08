'use client'
import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Lock, Circle } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'

type TopicNode = {
  id: string
  name: string
  subject: string
  status: string
  tier: number
  prereqNames: string[]
}

interface Props {
  nodes: TopicNode[]
}

function resourceLinks(name: string) {
  const q = name.replace(/\s+/g, '+')
  return [
    { label: 'MIT OpenCourseWare', url: `https://ocw.mit.edu/search/?q=${q}`,                              color: 'text-red-400 hover:text-red-300'    },
    { label: 'Khan Academy',        url: `https://www.khanacademy.org/search?page_search_query=${q}`,        color: 'text-green-400 hover:text-green-300' },
    { label: 'YouTube Lectures',    url: `https://www.youtube.com/results?search_query=${q}+lecture`,        color: 'text-blue-400 hover:text-blue-300'   },
    { label: 'arXiv',               url: `https://arxiv.org/search/?query=${q}&searchtype=all`,              color: 'text-orange-400 hover:text-orange-300'},
  ]
}

const STATUS_CONFIG = {
  mastered: { label: 'Done',     badge: 'bg-green-900/50 text-green-300 border-green-800',    icon: <CheckCircle2 size={14} className="text-green-400" /> },
  unlocked: { label: 'Unlocked', badge: 'bg-purple-900/50 text-purple-300 border-purple-800', icon: <Circle      size={14} className="text-purple-400" /> },
  locked:   { label: 'Locked',   badge: 'bg-gray-800 text-gray-500 border-gray-700',          icon: <Lock        size={14} className="text-gray-600"   /> },
}

function TopicCard({ node, updating, optimisticDone, onMarkDone }: {
  node: TopicNode
  updating: string | null
  optimisticDone: Set<string>
  onMarkDone: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const effectiveStatus = optimisticDone.has(node.id) ? 'mastered' : node.status
  const cfg = STATUS_CONFIG[effectiveStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.locked
  const isUpdating = updating === node.id

  return (
    <div className={`border rounded-xl transition-colors ${
      effectiveStatus === 'mastered' ? 'bg-green-950/20 border-green-900/40' :
      effectiveStatus === 'unlocked' ? 'bg-gray-900 border-gray-700 hover:border-purple-700/50' :
      'bg-gray-900/50 border-gray-800 opacity-60'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <span className="mt-0.5 shrink-0">{cfg.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-200 leading-snug">{node.name}</div>
              {node.prereqNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {node.prereqNames.map(p => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-500 whitespace-nowrap">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            Resources
          </button>
          {effectiveStatus === 'unlocked' && (
            <button
              onClick={() => onMarkDone(node.id)}
              disabled={isUpdating}
              className="text-xs px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isUpdating ? 'Saving…' : 'Mark as done'}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-4 py-3 flex flex-wrap gap-3">
          {resourceLinks(node.name).map(link => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${link.color}`}
            >
              <ExternalLink size={11} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopicsClient({ nodes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  // Initialise subject from query param (?subject=Mathematics etc.)
  const [subject, setSubject] = useState<Subject>(() => {
    const s = searchParams.get('subject')
    return (s && SUBJECTS.includes(s as Subject) ? s : 'Mathematics') as Subject
  })

  const [updating, setUpdating]         = useState<string | null>(null)
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set())

  // Clear optimistic flags once server data confirms the update
  useEffect(() => {
    setOptimisticDone(prev => {
      if (prev.size === 0) return prev
      const next = new Set(Array.from(prev).filter(
        id => nodes.find(n => n.id === id)?.status !== 'mastered'
      ))
      return next.size === prev.size ? prev : next
    })
  }, [nodes])

  const subjectNodes = nodes.filter(n => n.subject === subject)
  const maxTier = subjectNodes.reduce((m, n) => Math.max(m, n.tier), 0)
  const tiers = Array.from({ length: maxTier + 1 }, (_, i) => ({
    tier: i,
    nodes: subjectNodes.filter(n => n.tier === i),
  }))

  const onMarkDone = useCallback(async (id: string) => {
    // Optimistic update — show done immediately
    setOptimisticDone(prev => new Set(Array.from(prev).concat(id)))
    setUpdating(id)
    try {
      await fetch(`/api/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'mastered', type: 'skillNode' }),
      })
      const name = nodes.find(n => n.id === id)?.name ?? 'Topic'
      showToast('info', `"${name}" marked as done`)
      router.refresh()
    } catch {
      // Revert optimistic update on error
      setOptimisticDone(prev => new Set(Array.from(prev).filter(x => x !== id)))
      showToast('info', 'Failed to update — please try again')
    } finally {
      setUpdating(null)
    }
  }, [nodes, router, showToast])

  const stats = SUBJECTS.map(s => {
    const sn = nodes.filter(n => n.subject === s)
    return {
      subject: s,
      done:  sn.filter(n => n.status === 'mastered' || optimisticDone.has(n.id)).length,
      total: sn.length,
    }
  })

  return (
    <div className="overflow-x-hidden">
      {/* Subject tabs with right-fade mask */}
      <div className="relative border-b border-gray-800">
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none">
          {SUBJECTS.map(s => {
            const st = stats.find(x => x.subject === s)!
            const active = s === subject
            return (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 ${
                  active
                    ? 'bg-purple-900/60 border border-purple-700 text-purple-300'
                    : 'bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                {SUBJECT_LABEL[s]}
                <span className="text-xs opacity-60">{st.done}/{st.total}</span>
              </button>
            )
          })}
        </div>
        {/* Right fade indicating scrollability */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent" />
      </div>

      {/* Tier groups */}
      <div className="p-5 md:p-8 space-y-8 w-full">
        {tiers.map(({ tier, nodes: tierNodes }) => (
          <section key={tier} className="w-full">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-400 shrink-0">
                Tier {tier}
              </span>
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600 shrink-0">
                {tierNodes.filter(n => n.status === 'mastered' || optimisticDone.has(n.id)).length}/{tierNodes.length} done
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
              {tierNodes.map(n => (
                <TopicCard
                  key={n.id}
                  node={n}
                  updating={updating}
                  optimisticDone={optimisticDone}
                  onMarkDone={onMarkDone}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
