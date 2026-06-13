'use client'
import { useEffect, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Loader2, Clock, Target, TrendingUp, TrendingDown, Flame, CalendarCheck, Hourglass, Star, Trophy, Workflow } from 'lucide-react'
import { PHASES } from '@/lib/workflow'

type Summary = {
  totalHours: number; totalSessions: number
  overTime: { date: string; hours: number }[]
  heatmap: { day: string; mins: number }[]
  masteryDistribution: { level: string; count: number; color: string }[]
  perSubject: { subject: string; hours: number }[]
  semesterGoalHours: number; projection: number
  currentStreak: number; longestStreak: number
  thisWeekHours: number; lastWeekHours: number; weekDeltaPct: number | null
  activeDays30: number; avgSessionMins: number; busiestDay: string | null
  starsEarned7: number; starsEarned30: number
  masteredCount: number; inProgressCount: number
  phaseTotals: Record<number, number>; phaseTotal: number
}

function Stat({ icon, label, value, sub, accent = 'text-gray-200' }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">{icon} {label}</div>
      <div className={`text-2xl font-black ${accent}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AnalyticsOverview() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-orange-500" /></div>
  }
  if (!data) {
    return <div className="p-8 text-center text-gray-500">Failed to load analytics.</div>
  }

  const pacePct = Math.min(100, Math.round((data.totalHours / data.semesterGoalHours) * 100))

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Clock size={13} /> Total time</div>
          <div className="text-3xl font-black text-orange-400">{data.totalHours}h</div>
          <div className="text-xs text-gray-600 mt-1">{data.totalSessions} sessions logged</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><Target size={13} /> Semester goal</div>
          <div className="text-3xl font-black text-gray-200">{data.semesterGoalHours}h</div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pacePct}%` }} />
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

      {/* At-a-glance stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={<Flame size={12} className="text-orange-400" />} label="Current streak"
          value={`${data.currentStreak}d`} sub={`best ${data.longestStreak}d`}
          accent={data.currentStreak > 0 ? 'text-orange-400' : 'text-gray-400'} />
        <Stat icon={data.weekDeltaPct != null && data.weekDeltaPct < 0 ? <TrendingDown size={12} className="text-red-400" /> : <TrendingUp size={12} className="text-green-400" />}
          label="This week"
          value={`${data.thisWeekHours}h`}
          sub={data.weekDeltaPct == null ? `vs ${data.lastWeekHours}h last wk` : `${data.weekDeltaPct >= 0 ? '+' : ''}${data.weekDeltaPct}% vs last wk`}
          accent={data.weekDeltaPct != null && data.weekDeltaPct < 0 ? 'text-red-400' : 'text-green-400'} />
        <Stat icon={<CalendarCheck size={12} className="text-blue-400" />} label="Active days"
          value={`${data.activeDays30}`} sub="of last 30" />
        <Stat icon={<Hourglass size={12} className="text-gray-400" />} label="Avg session"
          value={`${data.avgSessionMins}m`} sub={data.busiestDay ? `busiest: ${data.busiestDay}` : undefined} />
        <Stat icon={<Star size={12} className="text-yellow-400" />} label="Stars earned"
          value={`${data.starsEarned7}`} sub={`${data.starsEarned30} in 30d`} accent="text-yellow-400" />
        <Stat icon={<Trophy size={12} className="text-green-400" />} label="Mastered"
          value={`${data.masteredCount}`} sub={`${data.inProgressCount} in progress`} accent="text-green-400" />
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
            <Line type="monotone" dataKey="hours" stroke="#ea580c" strokeWidth={2} dot={false} />
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
              <Bar dataKey="mins" fill="#ea580c" radius={[4, 4, 0, 0]} />
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

      {/* Studying workflow balance — across all topics/subjects */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-1 flex items-center gap-2"><Workflow size={15} className="text-orange-400" /> Studying Workflow Balance</h2>
        <p className="text-[10px] text-gray-600 mb-4">How your logged effort splits across the four phases — a healthy practice keeps Active Recall from being neglected.</p>
        {data.phaseTotal === 0 ? (
          <p className="text-sm text-gray-500">No workflow phases logged yet. Tap phases on a topic&apos;s panel or tag a phase when you Quick Log.</p>
        ) : (
          (() => {
            const max = Math.max(1, ...PHASES.map(p => data.phaseTotals[p.n] ?? 0))
            const lowest = [...PHASES].sort((a, b) => (data.phaseTotals[a.n] ?? 0) - (data.phaseTotals[b.n] ?? 0))[0]
            const lowestPct = Math.round(((data.phaseTotals[lowest.n] ?? 0) / data.phaseTotal) * 100)
            return (
              <>
                <div className="space-y-2.5">
                  {PHASES.map(p => {
                    const c = data.phaseTotals[p.n] ?? 0
                    const pct = Math.round((c / data.phaseTotal) * 100)
                    return (
                      <div key={p.n} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 text-xs text-gray-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />{p.n}. {p.short}
                        </span>
                        <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(c / max) * 100}%`, background: p.color }} />
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs text-gray-400 tabular-nums">{c}× · {pct}%</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-400 bg-gray-800/40 rounded-lg px-3 py-2">
                  Your weakest phase is <span className="font-semibold" style={{ color: lowest.color }}>{lowest.label}</span> at just {lowestPct}% of logged effort.
                  {lowest.n === 4 ? ' Active recall is what exams actually test — schedule more blank-sheet passes.' : ` ${lowest.hint}`}
                </div>
              </>
            )
          })()
        )}
      </div>
    </div>
  )
}
