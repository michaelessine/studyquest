'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Node, Edge, NodeProps } from '@xyflow/react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { Loader2, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from './ToastProvider'

// ── Dynamic imports (no SSR — React Flow uses DOM APIs at initialisation) ─────
const ReactFlow = dynamic(
  () => import('@xyflow/react').then(m => m.ReactFlow),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <Loader2 size={30} className="animate-spin text-purple-500" />
        <span className="text-sm">Loading skill tree…</span>
      </div>
    ),
  }
)
const Background = dynamic(() => import('@xyflow/react').then(m => m.Background), { ssr: false })
const Controls   = dynamic(() => import('@xyflow/react').then(m => m.Controls),   { ssr: false })
const MiniMap    = dynamic(() => import('@xyflow/react').then(m => m.MiniMap),    { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────
type SkillNodeData = {
  label: string
  status: 'locked' | 'unlocked' | 'mastered'
  xpValue: number
  nodeId: string
}
type SubjectStat = { subject: string; total: number; mastered: number; unlocked: number }

interface Props {
  nodes: { id: string; name: string; subject: string; status: string; xpValue: number; courseId: string | null }[]
  deps: { prerequisiteId: string; dependentId: string }[]
  subjectStats: SubjectStat[]
}

const STATUS_STYLE: Record<string, string> = {
  locked:   'bg-gray-800 border-gray-600 text-gray-500',
  unlocked: 'bg-purple-900/70 border-purple-600 text-purple-200 shadow-[0_0_12px_rgba(124,58,237,0.3)]',
  mastered: 'bg-green-900/70 border-green-600 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.25)]',
}

function SkillNodeComponent({ data }: NodeProps) {
  const d = data as SkillNodeData
  return (
    <div className={`rounded-xl border-2 px-4 py-3 w-44 transition-all cursor-pointer hover:scale-105 ${STATUS_STYLE[d.status]}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-600 !border-gray-500" />
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-xs font-semibold leading-tight">{d.label}</span>
        {d.status === 'mastered' && <span className="text-green-400 shrink-0">✓</span>}
      </div>
      <div className="flex items-center gap-1 text-xs opacity-60">
        <Zap size={10} />
        <span>{d.xpValue} XP</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-600 !border-gray-500" />
    </div>
  )
}

const nodeTypes = { skillNode: SkillNodeComponent }

// Fit view after nodes change — must render inside <ReactFlow> to access context
function AutoFitView({ dep }: { dep: unknown }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const id = requestAnimationFrame(() => fitView({ padding: 0.15, maxZoom: 0.75 }))
    return () => cancelAnimationFrame(id)
  }, [dep, fitView])
  return null
}

function computeLayout(rawNodes: Props['nodes'], rawDeps: Props['deps']): { nodes: Node[]; edges: Edge[] } {
  const ids = rawNodes.map(n => n.id)
  const inDeg     = new Map<string, number>(ids.map(id => [id, 0]))
  const children  = new Map<string, string[]>(ids.map(id => [id, []]))

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
    const cur = queue[head++]
    const l = level.get(cur) ?? 0
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

  const W = 196, H = 90, GAP_X = 40, GAP_Y = 70
  const pos = new Map<string, { x: number; y: number }>()
  Array.from(byLevel.entries()).forEach(([l, nodeIds]) => {
    const totalW = nodeIds.length * W + (nodeIds.length - 1) * GAP_X
    const startX = -totalW / 2
    nodeIds.forEach((id, i) => pos.set(id, { x: startX + i * (W + GAP_X), y: l * (H + GAP_Y) }))
  })

  const rfNodes: Node[] = rawNodes.map(n => ({
    id: n.id, type: 'skillNode',
    position: pos.get(n.id) ?? { x: 0, y: 0 },
    data: { label: n.name, status: n.status, xpValue: n.xpValue, nodeId: n.id } as SkillNodeData,
  }))
  const rfEdges: Edge[] = rawDeps
    .filter(d => ids.includes(d.prerequisiteId) && ids.includes(d.dependentId))
    .map(d => ({
      id: `${d.prerequisiteId}->${d.dependentId}`,
      source: d.prerequisiteId, target: d.dependentId,
      animated: false, style: { stroke: '#4b5563', strokeWidth: 1.5 },
    }))

  return { nodes: rfNodes, edges: rfEdges }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SkillTreeClient({ nodes, deps, subjectStats }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [subject, setSubject] = useState<Subject>('Mathematics')
  const [updating, setUpdating] = useState<string | null>(null)
  const [flowReady, setFlowReady] = useState(false)

  // Reset ready state whenever subject changes so the spinner re-appears
  useEffect(() => { setFlowReady(false) }, [subject])

  const filteredNodes = useMemo(() => nodes.filter(n => n.subject === subject), [nodes, subject])
  const filteredDeps  = useMemo(
    () => deps.filter(d =>
      filteredNodes.some(n => n.id === d.prerequisiteId) &&
      filteredNodes.some(n => n.id === d.dependentId)
    ),
    [filteredNodes, deps]
  )
  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => computeLayout(filteredNodes, filteredDeps),
    [filteredNodes, filteredDeps]
  )

  const onNodeClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    const data = node.data as SkillNodeData
    const next: Record<string, string> = { locked: 'unlocked', unlocked: 'mastered', mastered: 'locked' }
    const newStatus = next[data.status]
    setUpdating(node.id)
    try {
      await fetch(`/api/topics/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, type: 'skillNode' }),
      })
      if (newStatus === 'mastered') showToast('info', `${data.label} marked done`)
      else if (newStatus === 'unlocked') showToast('info', `${data.label} unlocked`)
      router.refresh()
    } finally {
      setUpdating(null)
    }
  }, [router, showToast])

  const stat = subjectStats.find(s => s.subject === subject)

  return (
    <div className="flex flex-col h-full">
      {/* Subject tabs */}
      <div className="relative border-b border-gray-800 shrink-0">
        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-none">
          {SUBJECTS.map(s => {
            const st = subjectStats.find(x => x.subject === s)
            const active = s === subject
            return (
              <button
                key={s} onClick={() => setSubject(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors shrink-0 ${
                  active
                    ? 'bg-purple-900/60 border border-purple-700 text-purple-300'
                    : 'bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                {SUBJECT_LABEL[s]}
                {st && <span className="text-xs opacity-60">{st.mastered}/{st.total}</span>}
              </button>
            )
          })}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent" />
      </div>

      {/* Stats + legend row */}
      {stat && (
        <div className="flex flex-wrap items-center gap-4 px-5 py-2 text-xs border-b border-gray-800/50 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600 inline-block" />
            <span className="text-gray-500">Locked <span className="text-gray-400 font-semibold">{stat.total - stat.mastered - stat.unlocked}</span></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span className="text-gray-500">Unlocked <span className="text-purple-300 font-semibold">{stat.unlocked}</span></span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            <span className="text-gray-500">Mastered <span className="text-green-300 font-semibold">{stat.mastered}</span></span>
          </span>
          <span className="ml-auto text-gray-700">Click a node to cycle its status</span>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        {/* Loading overlay — shown until React Flow calls onInit */}
        {!flowReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/90 gap-3">
            <Loader2 size={30} className="animate-spin text-purple-500" />
            <span className="text-sm text-gray-500">Loading skill tree…</span>
          </div>
        )}

        {rfNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            No skill nodes for this subject
          </div>
        ) : (
          <ReactFlow
            key={subject}
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onInit={() => setFlowReady(true)}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1f2937" gap={24} size={1} />
            <Controls showInteractive={false} className="!bottom-4 !right-4 !left-auto" />
            <MiniMap
              nodeColor={n => {
                const d = n.data as SkillNodeData
                return d.status === 'mastered' ? '#16a34a' : d.status === 'unlocked' ? '#7c3aed' : '#374151'
              }}
              maskColor="rgba(0,0,0,0.6)"
              className="!bg-gray-900 !border-gray-700"
            />
            {/* Auto-fit when subject changes */}
            <AutoFitView dep={subject} />
          </ReactFlow>
        )}

        {updating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="text-sm text-purple-300 bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg">
              Updating…
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
