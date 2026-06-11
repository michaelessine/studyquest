'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X, Loader2, Pin, PinOff, Trash2, ChevronUp, ChevronDown, BookOpen, Clock, AlertTriangle } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from './ToastProvider'

type NodeInfo = { name: string; subject: string; masteryLevel: number; status: string }
type Path = {
  id: string; name: string; subject: string; goalDescription: string
  topics: string[]; estimatedHours: Record<string, number>; pinned: boolean; completedAt: string | null
}

interface Props {
  initialPaths: Path[]
  nodeMap: Record<string, NodeInfo>
}

function MasteryBar({ level }: { level: number }) {
  const pct = (level / 5) * 100
  const color = level >= 5 ? 'bg-green-500' : level >= 3 ? 'bg-orange-500' : level >= 1 ? 'bg-blue-500' : 'bg-gray-600'
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden w-24">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function LearningPathsClient({ initialPaths, nodeMap }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [paths, setPaths] = useState<Path[]>(initialPaths)
  const [showModal, setShowModal] = useState(false)
  const [goal, setGoal] = useState('')
  const [subject, setSubject] = useState<Subject>('ComputerScience')
  const [weeks, setWeeks] = useState('12')
  const [generating, setGenerating] = useState(false)
  const [warnings, setWarnings] = useState<Record<string, string[]>>({})

  async function generatePath() {
    if (!goal.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/learning-path/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, subject, weeks: parseInt(weeks) || 12 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      showToast('info', `Created path: ${data.path.name}`)
      if (data.detail?.prerequisiteWarnings?.length) {
        setWarnings(w => ({ ...w, [data.path.id]: data.detail.prerequisiteWarnings }))
      }
      setShowModal(false); setGoal('')
      router.refresh()
      // Optimistically add
      setPaths(p => [{
        id: data.path.id, name: data.path.name, subject: data.path.subject,
        goalDescription: data.path.goalDescription,
        topics: data.detail.topics.map((t: { skillNodeId: string }) => t.skillNodeId),
        estimatedHours: Object.fromEntries(data.detail.topics.map((t: { skillNodeId: string; estimatedHours: number }) => [t.skillNodeId, t.estimatedHours])),
        pinned: false, completedAt: null,
      }, ...p])
    } catch (e) {
      showToast('info', e instanceof Error ? e.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function togglePin(path: Path) {
    const newPinned = !path.pinned
    setPaths(ps => ps.map(p => ({ ...p, pinned: p.id === path.id ? newPinned : false })))
    await fetch(`/api/learning-path/${path.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: newPinned }),
    })
    showToast('info', newPinned ? 'Path pinned to dashboard' : 'Path unpinned')
    router.refresh()
  }

  async function deletePath(id: string) {
    setPaths(ps => ps.filter(p => p.id !== id))
    await fetch(`/api/learning-path/${id}`, { method: 'DELETE' })
    showToast('info', 'Path deleted')
    router.refresh()
  }

  async function reorder(path: Path, index: number, dir: -1 | 1) {
    const newTopics = [...path.topics]
    const target = index + dir
    if (target < 0 || target >= newTopics.length) return
    ;[newTopics[index], newTopics[target]] = [newTopics[target], newTopics[index]]
    setPaths(ps => ps.map(p => p.id === path.id ? { ...p, topics: newTopics } : p))
    await fetch(`/api/learning-path/${path.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: newTopics }),
    })
  }

  async function removeTopic(path: Path, topicId: string) {
    const newTopics = path.topics.filter(t => t !== topicId)
    setPaths(ps => ps.map(p => p.id === path.id ? { ...p, topics: newTopics } : p))
    await fetch(`/api/learning-path/${path.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: newTopics }),
    })
  }

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Learning Paths</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-generated study roadmaps toward your goals.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors">
          <Plus size={15} /> New path
        </button>
      </div>

      {paths.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">No learning paths yet.</p>
          <p className="text-sm text-gray-600 mt-1">Generate one to get a personalized roadmap.</p>
        </div>
      )}

      <div className="space-y-5">
        {paths.map(path => {
          const totalHours = path.topics.reduce((sum, t) => sum + (path.estimatedHours[t] ?? 0), 0)
          const completed = path.topics.filter(t => (nodeMap[t]?.masteryLevel ?? 0) >= 5).length
          const pct = path.topics.length > 0 ? Math.round((completed / path.topics.length) * 100) : 0
          return (
            <div key={path.id} className={`card p-5 ${path.pinned ? 'border-orange-700/60' : ''}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-100">{path.name}</h2>
                    {path.pinned && <span className="text-[10px] px-2 py-0.5 bg-orange-900/50 border border-orange-700 rounded text-orange-300">Pinned</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{SUBJECT_LABEL[path.subject as Subject] ?? path.subject} · {path.topics.length} topics · ~{totalHours}h · {pct}% complete</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(path)} title={path.pinned ? 'Unpin' : 'Pin to dashboard'}
                    className="p-1.5 text-gray-500 hover:text-orange-400 transition-colors">
                    {path.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                  </button>
                  <button onClick={() => deletePath(path.id)} title="Delete"
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full" style={{ width: `${pct}%` }} />
              </div>

              {warnings[path.id]?.length > 0 && (
                <div className="mb-3 text-xs text-yellow-400 bg-yellow-950/20 border border-yellow-900/30 rounded-lg px-3 py-2 flex items-start gap-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <div>{warnings[path.id].join(' ')}</div>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-2">
                {path.topics.map((topicId, i) => {
                  const node = nodeMap[topicId]
                  if (!node) return null
                  const hours = path.estimatedHours[topicId] ?? 0
                  const isNext = node.masteryLevel < 5 && path.topics.slice(0, i).every(t => (nodeMap[t]?.masteryLevel ?? 0) >= 5)
                  return (
                    <div key={topicId} className={`flex items-center gap-3 rounded-lg p-3 border ${isNext ? 'bg-orange-950/30 border-orange-800/50' : 'bg-gray-800/40 border-gray-700/40'}`}>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => reorder(path, i, -1)} disabled={i === 0} className="text-gray-600 hover:text-gray-300 disabled:opacity-30"><ChevronUp size={12} /></button>
                        <button onClick={() => reorder(path, i, 1)} disabled={i === path.topics.length - 1} className="text-gray-600 hover:text-gray-300 disabled:opacity-30"><ChevronDown size={12} /></button>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-gray-400 shrink-0">{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-200 truncate flex items-center gap-2">
                          {node.name}
                          {isNext && <span className="text-[9px] px-1.5 py-0.5 bg-orange-700 text-white rounded">NEXT</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <MasteryBar level={node.masteryLevel} />
                          <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={9} />{hours}h</span>
                        </div>
                      </div>
                      <Link href={`/topics?subject=${node.subject}`}
                        className="text-[10px] px-2.5 py-1 bg-orange-900/40 border border-orange-800/50 text-orange-300 rounded hover:bg-orange-800/50 transition-colors shrink-0 flex items-center gap-1">
                        <BookOpen size={10} /> Study
                      </Link>
                      <button onClick={() => removeTopic(path, topicId)} className="text-gray-600 hover:text-red-400 shrink-0"><X size={13} /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* New path modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-100">New Learning Path</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">What&apos;s your goal?</label>
              <input value={goal} onChange={e => setGoal(e.target.value)}
                placeholder="e.g. master machine learning"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value as Subject)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600">
                  {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_LABEL[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Weeks available</label>
                <input type="number" value={weeks} onChange={e => setWeeks(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-orange-600" />
              </div>
            </div>
            <button onClick={generatePath} disabled={!goal.trim() || generating}
              className="w-full py-2.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-lg flex items-center justify-center gap-2">
              {generating ? <><Loader2 size={15} className="animate-spin" /> Generating path…</> : 'Generate Path'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
