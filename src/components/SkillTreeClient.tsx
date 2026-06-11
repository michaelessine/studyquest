'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Node, Edge, NodeProps } from '@xyflow/react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { Loader2, X, ExternalLink, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from './ToastProvider'
import StarRating from './StarRating'
import QuizPanel from './QuizPanel'
import LearningToolsPanel from './LearningToolsPanel'
import TechniqueTips from './TechniqueTips'

const ReactFlow  = dynamic(() => import('@xyflow/react').then(m => m.ReactFlow),  { ssr: false, loading: () => <div className="flex items-center justify-center h-full gap-3 text-gray-500"><Loader2 size={28} className="animate-spin text-orange-500" /><span className="text-sm">Loading…</span></div> })
const Background = dynamic(() => import('@xyflow/react').then(m => m.Background), { ssr: false })
const Controls   = dynamic(() => import('@xyflow/react').then(m => m.Controls),   { ssr: false })
const MiniMap    = dynamic(() => import('@xyflow/react').then(m => m.MiniMap),    { ssr: false })

type SkillNodeData = {
  label: string; status: string; masteryLevel: number
  category: string; xpValue: number; nodeId: string
}
type SubjectStat = { subject: string; total: number; mastered: number; unlocked: number }

interface Props {
  nodes: { id: string; name: string; subject: string; status: string; masteryLevel: number; tier: number; category: string; xpValue: number; courseId: string | null; nextReviewAt: string | null }[]
  deps: { prerequisiteId: string; dependentId: string }[]
  subjectStats: SubjectStat[]
}

// Mastery level → node visual style
function nodeStyle(ml: number, status: string): string {
  if (ml >= 5) return 'bg-green-900/70 border-green-600 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
  if (ml >= 3) return 'bg-orange-900/70 border-orange-600 text-orange-200 shadow-[0_0_12px_rgba(234,88,12,0.3)]'
  if (ml >= 1) return 'bg-blue-900/70 border-blue-600 text-blue-200 shadow-[0_0_8px_rgba(59,130,246,0.25)]'
  if (status === 'unlocked') return 'bg-gray-800/80 border-gray-500 text-gray-300'
  return 'bg-gray-800/50 border-gray-700 text-gray-600'
}

function SkillNodeComponent({ data }: NodeProps) {
  const d = data as SkillNodeData
  const stars = d.masteryLevel
  return (
    <div className={`rounded-xl border-2 px-3 py-2.5 w-44 transition-all cursor-pointer hover:scale-105 ${nodeStyle(d.masteryLevel, d.status)}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !border-gray-500" />
      <div className="text-xs font-semibold leading-tight mb-1">{d.label}</div>
      <div className="text-[9px] opacity-50 mb-1.5 truncate">{d.category}</div>
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <svg key={i} width={9} height={9} viewBox="0 0 24 24"
            fill={i <= stars ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
            className={i <= stars ? (stars>=5?'text-green-400':stars>=3?'text-orange-400':'text-blue-400') : 'text-gray-600'}>
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !border-gray-500" />
    </div>
  )
}

const nodeTypes = { skillNode: SkillNodeComponent }

function AutoFitView({ dep }: { dep: unknown }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const id = requestAnimationFrame(() => fitView({ padding: 0.15, maxZoom: 0.75 }))
    return () => cancelAnimationFrame(id)
  }, [dep, fitView])
  return null
}

function computeLayout(rawNodes: Props['nodes'], rawDeps: Props['deps']) {
  const ids = rawNodes.map(n => n.id)
  const inDeg    = new Map<string, number>(ids.map(id => [id, 0]))
  const children = new Map<string, string[]>(ids.map(id => [id, []]))
  for (const { prerequisiteId: src, dependentId: tgt } of rawDeps) {
    if (inDeg.has(tgt) && children.has(src)) {
      inDeg.set(tgt, (inDeg.get(tgt) ?? 0) + 1)
      children.get(src)!.push(tgt)
    }
  }
  const level = new Map<string, number>()
  const queue = ids.filter(id => inDeg.get(id) === 0)
  queue.forEach(id => level.set(id, 0))
  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]; const l = level.get(cur) ?? 0
    for (const child of children.get(cur) ?? []) {
      const ex = level.get(child) ?? -1
      if (ex < l + 1) { level.set(child, l + 1); queue.push(child) }
    }
  }
  const byLevel = new Map<number, string[]>()
  Array.from(level.entries()).forEach(([id, l]) => {
    if (!byLevel.has(l)) byLevel.set(l, [])
    byLevel.get(l)!.push(id)
  })
  const W = 196, H = 90, GAP_X = 40, GAP_Y = 60
  const pos = new Map<string, { x: number; y: number }>()
  Array.from(byLevel.entries()).forEach(([l, nids]) => {
    const totalW = nids.length * W + (nids.length - 1) * GAP_X
    const startX = -totalW / 2
    nids.forEach((id, i) => pos.set(id, { x: startX + i * (W + GAP_X), y: l * (H + GAP_Y) }))
  })
  const rfNodes: Node[] = rawNodes.map(n => ({
    id: n.id, type: 'skillNode',
    position: pos.get(n.id) ?? { x: 0, y: 0 },
    data: { label: n.name, status: n.status, masteryLevel: n.masteryLevel, category: n.category, xpValue: n.xpValue, nodeId: n.id } as SkillNodeData,
  }))
  const rfEdges: Edge[] = rawDeps.filter(d => ids.includes(d.prerequisiteId) && ids.includes(d.dependentId))
    .map(d => ({ id: `${d.prerequisiteId}->${d.dependentId}`, source: d.prerequisiteId, target: d.dependentId, animated: false, style: { stroke: '#374151', strokeWidth: 1.5 } }))
  return { nodes: rfNodes, edges: rfEdges }
}

// ── Side panel ────────────────────────────────────────────────────────────────
function SidePanel({ node, deps, allNodes, onRate, onClose, saving, onMasteryUpdated }: {
  node: Props['nodes'][0]
  deps: Props['deps']
  allNodes: Props['nodes']
  onRate: (id: string, ml: number) => void
  onClose: () => void
  saving: boolean
  onMasteryUpdated: (id: string, ml: number) => void
}) {
  const prereqIds = deps.filter(d => d.dependentId === node.id).map(d => d.prerequisiteId)
  const prereqNames = prereqIds.map(id => allNodes.find(n => n.id === id)?.name ?? '').filter(Boolean)
  const q = node.name.replace(/\s+/g, '+')

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-20 flex flex-col shadow-2xl overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <span className="font-semibold text-gray-100 text-sm truncate">{node.name}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 shrink-0 ml-2"><X size={16} /></button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Category + tier */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 bg-orange-900/40 border border-orange-800/50 rounded text-orange-300">{node.category}</span>
          <span className="text-[10px] px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">Tier {node.tier}</span>
        </div>

        {/* Star rating */}
        {node.status !== 'locked' ? (
          <div>
            <div className="text-xs text-gray-500 mb-2">Mastery level</div>
            <StarRating value={node.masteryLevel} onChange={ml => onRate(node.id, ml)} size="lg" />
            {saving && <p className="text-xs text-gray-500 mt-1">Saving…</p>}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Complete prerequisites to unlock</div>
        )}

        {/* Next review */}
        {node.nextReviewAt && (
          <div className="text-xs text-gray-500">
            Next review: <span className="text-gray-300">{new Date(node.nextReviewAt).toLocaleDateString()}</span>
          </div>
        )}

        {/* Prerequisites */}
        {prereqNames.length > 0 && (
          <div>
            <div className="text-xs text-gray-500 mb-2">Prerequisites</div>
            <div className="flex flex-wrap gap-1.5">
              {prereqNames.map(p => <span key={p} className="text-[10px] px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400">{p}</span>)}
            </div>
          </div>
        )}

        {/* Resource links */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Resources</div>
          <div className="space-y-2">
            {[
              { label: 'YouTube Lectures', url: `https://www.youtube.com/results?search_query=${q}+lecture`, color: 'text-red-400' },
              { label: 'MIT OCW',          url: `https://ocw.mit.edu/search/?q=${q}`,                       color: 'text-blue-400' },
              { label: 'Khan Academy',     url: `https://www.khanacademy.org/search?page_search_query=${q}`, color: 'text-green-400' },
              { label: 'arXiv',            url: `https://arxiv.org/search/?query=${q}&searchtype=all`,       color: 'text-orange-400' },
              { label: 'Library Genesis',  url: `https://libgen.is/search.php?req=${q}`,                    color: 'text-yellow-400' },
            ].map(l => (
              <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-1.5 text-xs ${l.color} hover:opacity-80 transition-opacity`}>
                <ExternalLink size={11} />{l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Study techniques (PART 10) */}
        {node.status !== 'locked' && (
          <div className="border-t border-gray-800 pt-4">
            <TechniqueTips key={node.id} topic={node.name} level={node.masteryLevel} />
          </div>
        )}

        {/* Quiz & practice */}
        {node.status !== 'locked' && (
          <div className="border-t border-gray-800 pt-4">
            <div className="text-xs text-gray-500 mb-2">Practice</div>
            <QuizPanel
              key={node.id}
              skillNodeId={node.id}
              topicName={node.name}
              subject={node.subject}
              currentMastery={node.masteryLevel}
              onMasteryUpdated={ml => onMasteryUpdated(node.id, ml)}
            />
          </div>
        )}

        {/* Deep learning tools */}
        {node.status !== 'locked' && (
          <div className="border-t border-gray-800 pt-4">
            <div className="text-xs text-gray-500 mb-2">Deep Learning Tools</div>
            <LearningToolsPanel
              key={node.id}
              skillNodeId={node.id}
              topicName={node.name}
              subject={node.subject}
              currentMastery={node.masteryLevel}
              onMasteryUpdated={ml => onMasteryUpdated(node.id, ml)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SkillTreeClient({ nodes, deps, subjectStats }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [subject, setSubject]     = useState<Subject>('Mathematics')
  const [saving, setSaving]       = useState(false)
  const [flowReady, setFlowReady] = useState(false)
  const [selected, setSelected]   = useState<Props['nodes'][0] | null>(null)

  useEffect(() => { setFlowReady(false); setSelected(null) }, [subject])

  const filteredNodes = useMemo(() => nodes.filter(n => n.subject === subject), [nodes, subject])
  const filteredDeps  = useMemo(
    () => deps.filter(d => filteredNodes.some(n => n.id === d.prerequisiteId) && filteredNodes.some(n => n.id === d.dependentId)),
    [filteredNodes, deps]
  )
  const { nodes: rfNodes, edges: rfEdges } = useMemo(() => computeLayout(filteredNodes, filteredDeps), [filteredNodes, filteredDeps])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const d = node.data as SkillNodeData
    const full = filteredNodes.find(n => n.id === d.nodeId) ?? null
    setSelected(full)
  }, [filteredNodes])

  const handleRate = useCallback(async (id: string, ml: number) => {
    setSaving(true)
    try {
      await fetch(`/api/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'skillNode', masteryLevel: ml }),
      })
      if (ml >= 5) showToast('info', 'Topic mastered! ★★★★★')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [router, showToast])

  const onMasteryUpdated = useCallback((id: string, ml: number) => {
    // Reflect quiz-driven mastery change locally and refresh server data
    setSelected(prev => (prev && prev.id === id ? { ...prev, masteryLevel: ml } : prev))
    router.refresh()
  }, [router])

  const stat = subjectStats.find(s => s.subject === subject)

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="relative border-b border-gray-800 shrink-0">
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none">
          {SUBJECTS.map(s => {
            const st = subjectStats.find(x => x.subject === s)
            return (
              <button key={s} onClick={() => setSubject(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 ${
                  s === subject ? 'bg-orange-900/60 border border-orange-700 text-orange-300' : 'bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-gray-200'
                }`}>
                {SUBJECT_LABEL[s]}
                {st && <span className="text-xs opacity-60">{st.mastered}/{st.total}</span>}
              </button>
            )
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent" />
      </div>

      {/* Legend row */}
      {stat && (
        <div className="flex flex-wrap items-center gap-4 px-5 py-2 text-xs border-b border-gray-800/50 shrink-0">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" />Locked</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />Unlocked</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />★1-2</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />★3-4</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />★5 Mastered</span>
          <Link href="/quiz" className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-orange-900/40 border border-orange-800/50 text-orange-300 rounded-lg hover:bg-orange-800/50 transition-colors">
            <GraduationCap size={12} /> Exam mode
          </Link>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        {!flowReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/90 gap-3">
            <Loader2 size={30} className="animate-spin text-orange-500" />
            <span className="text-sm text-gray-500">Loading skill tree…</span>
          </div>
        )}
        {rfNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">No skill nodes for this subject</div>
        ) : (
          <ReactFlow key={subject} nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes}
            onNodeClick={onNodeClick} onInit={() => setFlowReady(true)}
            minZoom={0.2} maxZoom={1.5} proOptions={{ hideAttribution: true }}>
            <Background color="#1f2937" gap={24} size={1} />
            <Controls showInteractive={false} className="!bottom-4 !right-4 !left-auto" />
            <MiniMap
              nodeColor={n => { const d = n.data as SkillNodeData; return d.masteryLevel>=5?'#16a34a':d.masteryLevel>=3?'#ea580c':d.masteryLevel>=1?'#3b82f6':'#374151' }}
              maskColor="rgba(0,0,0,0.6)" className="!bg-gray-900 !border-gray-700" />
            <AutoFitView dep={subject} />
          </ReactFlow>
        )}
        {selected && (
          <SidePanel
            node={selected}
            deps={filteredDeps}
            allNodes={filteredNodes}
            onRate={handleRate}
            onClose={() => setSelected(null)}
            saving={saving}
            onMasteryUpdated={onMasteryUpdated}
          />
        )}
      </div>
    </div>
  )
}
