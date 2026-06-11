'use client'
import { useEffect, useState } from 'react'
import { Lightbulb, Loader2, Sparkles } from 'lucide-react'

type Suggestion = { name: string; why: string; applicationForThisTopic: string }

export default function TechniqueTips({ topic, level }: { topic: string; level: number }) {
  const [tips, setTips] = useState<Suggestion[] | null>(null)
  const [band, setBand] = useState('')
  const [loading, setLoading] = useState(true)
  const [personalizing, setPersonalizing] = useState(false)

  async function load(personalize = false) {
    if (personalize) setPersonalizing(true); else setLoading(true)
    try {
      const res = await fetch('/api/techniques/suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level, personalize }),
      })
      const data = await res.json()
      setTips(data.techniques ?? []); setBand(data.band ?? '')
    } catch {
      setTips([])
    } finally { setLoading(false); setPersonalizing(false) }
  }

  useEffect(() => { load(false) }, [topic, level]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center gap-2 text-xs text-gray-500 py-2"><Loader2 size={12} className="animate-spin" /> Loading techniques…</div>
  if (!tips || tips.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Suggested techniques {band && <span className="text-gray-600">· {band}</span>}</span>
        <button onClick={() => load(true)} disabled={personalizing}
          title="Personalize these tips with AI"
          className="text-[10px] flex items-center gap-1 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 rounded disabled:opacity-50">
          {personalizing ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />} Personalize
        </button>
      </div>
      {tips.map((t, i) => (
        <div key={i} className="bg-amber-950/15 border border-amber-900/25 rounded-lg p-2.5">
          <div className="flex items-start gap-1.5">
            <Lightbulb size={12} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-amber-200">{t.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{t.why}</div>
              <div className="text-[11px] text-gray-300 mt-1"><span className="text-gray-500">How: </span>{t.applicationForThisTopic}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
