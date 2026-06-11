'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronDown, ChevronUp, MessageCircle, X, RefreshCw } from 'lucide-react'
import { filterActiveConnections } from '@/lib/connections'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import WeeklyReviewModal from './WeeklyReviewModal'
import { useToast } from './ToastProvider'

type SlimNode = { id: string; name: string; subject: string; masteryLevel: number; nextReviewAt: string | null; reviewIntervalDays: number }

interface Props { skillNodes: SlimNode[] }

export default function DashboardClient({ skillNodes }: Props) {
  const router = useRouter()
  const { showToast } = useToast()
  const [showReview, setShowReview]         = useState(false)
  const [showBanner, setShowBanner]         = useState(false)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [reviewingNode, setReviewingNode]   = useState<string | null>(null)

  // Show weekly review banner every Sunday if not done this week
  useEffect(() => {
    const today = new Date()
    if (today.getDay() !== 0) return   // only Sunday (0)
    const lastReview = localStorage.getItem('weeklyReviewDate')
    const thisWeek   = today.toISOString().split('T')[0]
    if (lastReview !== thisWeek) setShowBanner(true)
  }, [])

  // Active connections
  const topicNames = new Set(skillNodes.map(n => n.name))
  const masteryMap = new Map(skillNodes.map(n => [n.name, n.masteryLevel]))
  const activeConns = filterActiveConnections(topicNames, masteryMap)

  // "Review Done" handler
  async function handleReviewDone(nodeId: string) {
    setReviewingNode(nodeId)
    try {
      await fetch('/api/review-done', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId }),
      })
      showToast('info', 'Review interval updated')
      router.refresh()
    } finally {
      setReviewingNode(null)
    }
  }

  // Due for review nodes
  const now = new Date()
  const dueNodes = skillNodes
    .filter(n => n.nextReviewAt && new Date(n.nextReviewAt) <= now && n.masteryLevel > 0)
    .sort((a, b) => (a.nextReviewAt! < b.nextReviewAt! ? -1 : 1))
    .slice(0, 8)

  return (
    <>
      {/* Weekly review banner */}
      {showBanner && (
        <div className="bg-orange-950/60 border border-orange-700/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-orange-200">
            <Sparkles size={15} className="text-orange-400 shrink-0" />
            <span>Time for your weekly review — what did you study this week?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setShowReview(true)}
              className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded-lg transition-colors">
              Start Review
            </button>
            <button onClick={() => setShowBanner(false)} className="text-gray-500 hover:text-gray-300"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Due for review interactive cards */}
      {dueNodes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {dueNodes.map(n => {
            const overdue = n.nextReviewAt ? Math.max(0, Math.floor((now.getTime() - new Date(n.nextReviewAt).getTime()) / 86_400_000)) : 0
            return (
              <div key={n.id} className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-2.5">
                <div className="text-xs font-medium text-gray-200 truncate">{n.name}</div>
                <div className="text-[10px] text-gray-500">{SUBJECT_LABEL[n.subject as Subject] ?? n.subject}</div>
                <div className="text-[10px] text-yellow-400 my-1">{'★'.repeat(Math.floor(n.masteryLevel))}{n.masteryLevel % 1 >= 0.5 ? '⯨' : ''}{'☆'.repeat(5 - Math.ceil(n.masteryLevel))}</div>
                {overdue > 0 && <div className="text-[10px] text-yellow-600">{overdue}d overdue</div>}
                <button
                  disabled={reviewingNode === n.id}
                  onClick={() => handleReviewDone(n.id)}
                  className="mt-2 w-full text-[10px] px-2 py-1 bg-yellow-900/40 hover:bg-yellow-800/50 border border-yellow-800/50 text-yellow-300 rounded disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                >
                  <RefreshCw size={9} className={reviewingNode === n.id ? 'animate-spin' : ''} />
                  Review done
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Cross-subject connections */}
      {activeConns.length > 0 && (
        <div className="card p-5">
          <button onClick={() => setConnectionsOpen(o => !o)}
            className="flex items-center justify-between w-full">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2">
              <MessageCircle size={15} className="text-orange-400" />
              Connections
              <span className="text-xs text-gray-500 font-normal">({activeConns.length} active)</span>
            </h2>
            {connectionsOpen ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
          </button>

          {connectionsOpen && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeConns.slice(0, 12).map((c, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700/40 rounded-lg p-3">
                  <div className="text-xs font-semibold text-gray-200 mb-1">
                    <span className="text-orange-400">{c.topicA}</span>
                    <span className="text-gray-600 mx-1">↔</span>
                    <span className="text-blue-400">{c.topicB}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-1">{c.subjectA} · {c.subjectB}</div>
                  <p className="text-xs text-gray-400 mb-2">{c.explanation}</p>
                  <a href={`/chat?prefill=${encodeURIComponent(`Explain the connection between ${c.topicA} and ${c.topicB} and how understanding one helps with the other.`)}`}
                    className="text-[10px] px-2 py-1 bg-orange-900/40 border border-orange-800/50 text-orange-300 rounded hover:bg-orange-800/50 transition-colors inline-block">
                    Study connection →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showReview && <WeeklyReviewModal onClose={() => { setShowReview(false); setShowBanner(false) }} />}
    </>
  )
}
