'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Loader2, Clock, Target, TrendingUp } from 'lucide-react'

type Summary = {
  totalHours: number; totalSessions: number
  overTime: { date: string; hours: number }[]
  heatmap: { day: string; mins: number }[]
  masteryDistribution: { level: string; count: number; color: string }[]
  perSubject: { subject: string; hours: number }[]
  semesterGoalHours: number; projection: number
}


export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-purple-500" /></div>
  }
  if (!data) {
    return <div className="p-8 text-center text-gray-500">Failed to load analytics.</div>
  }

  const pacePct = Math.min(100, Math.round((data.totalHours / data.semesterGoalHours) * 100))

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your study patterns and progress over time.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Clock size={13} /> Total time</div>
          <div className="text-3xl font-black text-purple-400">{data.totalHours}h</div>
          <div className="text-xs text-gray-600 mt-1">{data.totalSessions} sessions logged</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Target size={13} /> Semester goal</div>
          <div className="text-3xl font-black text-gray-200">{data.semesterGoalHours}h</div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pacePct}%` }} />
          </div>
          <div className="text-xs text-gray-600 mt-1">{pacePct}% of goal reached</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><TrendingUp size={13} /> Projected pace</div>
          <div className="text-3xl font-black text-green-400">{data.projection}h</div>
          <div className="text-xs text-gray-600 mt-1">
            {data.projection >= data.semesterGoalHours ? 'On pace to hit your goal!' : 'Pick up the pace to hit your goal'}
          </div>
        </div>
      </div>

      {/* Hours over time */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-4">Study Hours (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.overTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="date" stroke="#6b7280" fontSize={10} interval={4} />
            <YAxis stroke="#6b7280" fontSize={10} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="hours" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly heatmap (bar) */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-4">When You Study</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.heatmap}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={10} />
              <YAxis stroke="#6b7280" fontSize={10} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="mins" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mastery distribution (pie) */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-4">Mastery Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.masteryDistribution} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={80}>
                {data.masteryDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Manual legend */}
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {data.masteryDistribution.map(d => (
              <span key={d.level} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: d.color }} />
                {d.level} ({d.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Per-subject hours */}
      {data.perSubject.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-4">Hours by Subject</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.perSubject} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" stroke="#6b7280" fontSize={10} />
              <YAxis type="category" dataKey="subject" stroke="#6b7280" fontSize={10} width={110} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="hours" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
