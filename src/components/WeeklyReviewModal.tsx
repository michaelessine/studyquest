'use client'
import { useState } from 'react'
import { Loader2, X, Sparkles } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function WeeklyReviewModal({ onClose }: Props) {
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError]       = useState('')

  async function submit() {
    if (!text.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewText: text }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResponse(data.response)
      // Save timestamp so we don't re-prompt this week
      localStorage.setItem('weeklyReviewDate', new Date().toISOString().split('T')[0])
    } catch {
      setError('Failed to get response — check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            Weekly Review
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
        </div>

        {!response ? (
          <>
            <p className="text-sm text-gray-400">What did you study this week? Any breakthroughs, struggles, or topics you want to revisit?</p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. I finished the Real Analysis lecture series and started Stochastic Processes. Struggled a bit with measure theory..."
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-600 resize-none"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!text.trim() || loading}
                className="flex-1 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 rounded-lg text-sm text-white flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Get Review
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
              {response}
            </div>
            <button onClick={onClose} className="w-full py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm text-white">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}
