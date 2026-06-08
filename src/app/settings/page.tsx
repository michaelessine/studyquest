'use client'
import { useEffect, useState } from 'react'
import { Loader2, DollarSign, Database, Save, AlertTriangle } from 'lucide-react'

type Summary = {
  estimatedMonthly: number
  totalCalls: number
  cacheHitRate: number
  promptCacheRatio: number
  routes: { route: string; calls: number; apiCalls: number; cacheHits: number; inputTokens: number; outputTokens: number; cost: number }[]
  cap: { spend: number; cap: number; pctUsed: number; overCap: boolean }
}

export default function SettingsPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [capInput, setCapInput] = useState('5')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/costs/summary')
    const d = await res.json()
    setData(d)
    setCapInput(String(d.cap?.cap ?? 5))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveCap() {
    setSaving(true)
    await fetch('/api/costs/cap', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyCapUsd: parseFloat(capInput) }),
    })
    await load()
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-purple-500" /></div>
  if (!data) return <div className="p-8 text-center text-gray-500">Failed to load.</div>

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings &amp; Costs</h1>
        <p className="text-sm text-gray-500 mt-0.5">API usage and cost monitoring (last 30 days).</p>
      </div>

      {/* Budget warning */}
      {data.cap.pctUsed >= 80 && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm border ${data.cap.overCap ? 'bg-red-950/30 border-red-800/50 text-red-300' : 'bg-yellow-950/30 border-yellow-800/50 text-yellow-300'}`}>
          <AlertTriangle size={15} className="shrink-0" />
          {data.cap.overCap
            ? `You've reached your monthly budget ($${data.cap.cap}). Expensive features are paused until next month.`
            : `You've used ${data.cap.pctUsed}% of your monthly budget. Expensive features pause at 100%.`}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><DollarSign size={13} /> Est. monthly spend</div>
          <div className="text-3xl font-black text-purple-400">${data.estimatedMonthly.toFixed(3)}</div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div className={`h-full rounded-full ${data.cap.overCap ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${Math.min(100, data.cap.pctUsed)}%` }} />
          </div>
          <div className="text-xs text-gray-600 mt-1">{data.cap.pctUsed}% of ${data.cap.cap} cap</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Database size={13} /> Total API calls</div>
          <div className="text-3xl font-black text-gray-200">{data.totalCalls}</div>
          <div className="text-xs text-gray-600 mt-1">{data.cacheHitRate}% served from response cache</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Database size={13} /> Prompt cache</div>
          <div className="text-3xl font-black text-green-400">{data.promptCacheRatio}%</div>
          <div className="text-xs text-gray-600 mt-1">of input tokens read from cache</div>
        </div>
      </div>

      {/* Cost per feature */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-4">Cost by Feature</h2>
        {data.routes.length === 0 ? (
          <p className="text-sm text-gray-600">No API calls logged yet. Use a feature to see costs here.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-[10px] text-gray-600 uppercase tracking-wider pb-1 border-b border-gray-800">
              <span className="col-span-5">Route</span>
              <span className="col-span-2 text-right">Calls</span>
              <span className="col-span-2 text-right">Cache hits</span>
              <span className="col-span-3 text-right">Cost</span>
            </div>
            {data.routes.map(r => (
              <div key={r.route} className="grid grid-cols-12 text-xs items-center py-1">
                <span className="col-span-5 text-gray-300 font-mono truncate">{r.route}</span>
                <span className="col-span-2 text-right text-gray-400">{r.calls}</span>
                <span className="col-span-2 text-right text-green-400">{r.cacheHits}</span>
                <span className="col-span-3 text-right text-purple-400 font-semibold">${r.cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly cap setting */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-3">Monthly Budget Cap</h2>
        <p className="text-xs text-gray-500 mb-3">When estimated monthly spend reaches this cap, expensive AI features (quiz/path/debate/textbook generation) are paused.</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input type="number" step="0.5" min="0" value={capInput} onChange={e => setCapInput(e.target.value)}
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg pl-6 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-600" />
          </div>
          <button onClick={saveCap} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm rounded-lg">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>
    </div>
  )
}
