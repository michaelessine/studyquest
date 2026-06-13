'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CalendarClock, CheckCircle2, ArrowRight } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import { useToast } from '@/components/ToastProvider'
import StarRating from '@/components/StarRating'

type DueTopic = { id: string; name: string; subject: string; masteryLevel: number; dueSince: string | null }

function subj(s: string) { return SUBJECT_LABEL[s as Subject] ?? s }
function agoLabel(iso: string | null): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'due today'
  if (days === 1) return 'due 1 day ago'
  return `due ${days} days ago`
}

export default function ReviewPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [topics, setTopics] = useState<DueTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [done, setDone] = useState(0)

  useEffect(() => {
    fetch('/api/reviews/due')
      .then(r => r.json())
      .then(d => { setTopics(d.topics ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function review(id: string, ml: number) {
    const topic = topics.find(t => t.id === id)
    const name = topic?.name ?? 'Topic'
    const unchanged = topic ? topic.masteryLevel === ml : false
    setSaving(id)
    try {
      if (unchanged) {
        // Same rating → grow the interval 1.5× (proper spaced repetition).
        await fetch('/api/review-done', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId: id }),
        })
        showToast('info', `Reviewed "${name}" — next review spaced out further`)
      } else {
        // Mastery changed → update it (reschedules from the new level).
        const res = await fetch(`/api/topics/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'skillNode', masteryLevel: ml }),
        })
        const data = await res.json().catch(() => ({}))
        showToast('info', `Updated "${name}" to ${ml}★ — next review scheduled`)
        const unlocked: string[] = data.unlockedNames ?? []
        if (unlocked.length > 0) showToast('info', `🔓 Unlocked: ${unlocked.slice(0, 4).join(', ')}`)
      }
      setTopics(prev => prev.filter(t => t.id !== id))
      setDone(d => d + 1)
      router.refresh() // updates the nav badge count
    } catch {
      showToast('info', 'Failed to save — please try again')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <CalendarClock size={22} className="text-orange-400" /> Review Queue
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Topics whose spaced-repetition interval has elapsed. Re-rate each to confirm your current mastery and schedule the next review.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-orange-500" /></div>
      ) : topics.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
          <div className="text-lg font-semibold text-gray-200">All caught up!</div>
          <p className="text-sm text-gray-500 mt-1">
            {done > 0 ? `You reviewed ${done} topic${done === 1 ? '' : 's'} just now. ` : ''}
            Nothing is due for review right now.
          </p>
          <Link href="/topics" className="inline-flex items-center gap-1.5 mt-4 text-sm text-orange-400 hover:text-orange-300">
            Browse all topics <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500">{topics.length} topic{topics.length === 1 ? '' : 's'} due</div>
          <div className="space-y-2">
            {topics.map(t => (
              <div key={t.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">{t.name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {subj(t.subject)} · <span className="text-orange-400/80">{agoLabel(t.dueSince)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {saving === t.id
                    ? <Loader2 size={16} className="animate-spin text-orange-500" />
                    : <StarRating value={t.masteryLevel} onChange={ml => review(t.id, ml)} size="sm" />}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-600">
            Tip: tap the same star count if you still know it — the next review gets spaced out further. Adjust the stars if your mastery has shifted.
          </p>
        </>
      )}
    </div>
  )
}
