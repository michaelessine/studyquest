'use client'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { Trophy, TrendingUp, Target, Sparkles } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL, Subject } from '@/lib/xp'
import { format } from 'date-fns'

type Mastered = { id: string; name: string; subject: string; date: string }
type InProgress = { id: string; name: string; subject: string; masteryLevel: number }
type Next = { id: string; name: string; subject: string; masteryLevel: number }

interface Props {
  masteredThisMonth: Mastered[]
  inProgress: InProgress[]
  growth: { date: string; total: number }[]
  radar: { career: string; readiness: number }[]
  advancement: { label: string; count: number }[]
  topCareerLabel: string
  nextRecommended: Next[]
}

// Shorten long career labels for radar axes
function shortLabel(s: string): string {
  return s.replace(/ &.*$/, '').replace(/\(.*\)/, '').replace(/Artificial Intelligence/, 'AI').trim().slice(0, 18)
}

export default function ProgressClient({ masteredThisMonth, inProgress, growth, radar, advancement, topCareerLabel, nextRecommended }: Props) {
  const radarData = radar.map(r => ({ axis: shortLabel(r.career), readiness: r.readiness }))

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Progress</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your mastery growth and career trajectory.</p>
      </div>

      {/* This week's advancement */}
      {advancement.length > 0 && (
        <div className="card p-5 border-orange-700/40">
          <h2 className="font-semibold text-gray-200 mb-2 flex items-center gap-2"><Sparkles size={15} className="text-orange-400" /> This Week&apos;s Advancement</h2>
          <p className="text-sm text-gray-300">
            You advanced toward {advancement.map((a, i) => (
              <span key={a.label}>
                <span className="text-orange-300 font-medium">{a.label}</span> (+{a.count} topic{a.count !== 1 ? 's' : ''}){i < advancement.length - 1 ? (i === advancement.length - 2 ? ', and ' : ', ') : ''}
              </span>
            ))}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mastery growth */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><TrendingUp size={15} className="text-orange-400" /> Mastery Growth (90 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={10} interval={14} />
              <YAxis stroke="#6b7280" fontSize={10} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="total" name="Cumulative stars" stroke="#ea580c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-600 mt-1">Total mastery stars earned over time (all topics).</p>
        </div>

        {/* Career radar */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><Target size={15} className="text-orange-400" /> Career Readiness</h2>
          {radarData.length === 0 ? <p className="text-sm text-gray-600">No career data yet.</p> : (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData} outerRadius={85}>
                <PolarGrid stroke="#1f2937" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#4b5563', fontSize: 8 }} angle={90} />
                <Radar name="Readiness" dataKey="readiness" stroke="#ea580c" fill="#ea580c" fillOpacity={0.35} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Next recommended (aligned with top career) */}
      {nextRecommended.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-200">Recommended Next</h2>
            <span className="text-xs text-gray-500">aligned with {topCareerLabel}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {nextRecommended.map(t => (
              <Link key={t.id} href={`/topics?subject=${t.subject}`}
                className="flex items-center justify-between text-sm bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 hover:border-orange-700/50 transition-colors">
                <span className="text-gray-200 truncate">{t.name}</span>
                <span className="text-[10px] text-gray-500 shrink-0 ml-2">{t.masteryLevel}★</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mastered this month */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Trophy size={15} className="text-green-400" /> Mastered This Month</h2>
        {masteredThisMonth.length === 0 ? <p className="text-sm text-gray-600">No topics fully mastered this month yet — keep going!</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {masteredThisMonth.map(t => (
              <div key={t.id} className="bg-green-950/20 border border-green-900/30 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-200 truncate">{t.name}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{SUBJECT_LABEL[t.subject as Subject] ?? t.subject} · {format(new Date(t.date), 'MMM d')}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In progress by subject */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-3">In Progress</h2>
        {inProgress.length === 0 ? <p className="text-sm text-gray-600">Nothing in progress — rate a topic or take a quiz to begin.</p> : (
          <div className="space-y-4">
            {SUBJECTS.map(subj => {
              const items = inProgress.filter(n => n.subject === subj).sort((a, b) => b.masteryLevel - a.masteryLevel)
              if (items.length === 0) return null
              return (
                <div key={subj}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{SUBJECT_LABEL[subj]}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map(t => (
                      <div key={t.id} className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-200 truncate">{t.name}</span>
                          <span className="text-[10px] text-orange-300 shrink-0 ml-2">{t.masteryLevel}★</span>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden mt-1.5">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(t.masteryLevel / 5) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
