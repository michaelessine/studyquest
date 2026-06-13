'use client'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Gauge, TrendingUp, TrendingDown, Minus, AlertCircle, Timer, Scale } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'
import type { Evaluation } from '@/lib/evaluate'

function subj(s: string) { return SUBJECT_LABEL[s as Subject] ?? s }

function TrendIcon({ t }: { t: 'up' | 'flat' | 'down' }) {
  if (t === 'up') return <TrendingUp size={13} className="text-green-400" />
  if (t === 'down') return <TrendingDown size={13} className="text-red-400" />
  return <Minus size={13} className="text-gray-500" />
}

export default function EvaluateClient({ evaluation, embedded }: { evaluation: Evaluation; embedded?: boolean }) {
  const { velocity, decayQueue, efficiency, calibration } = evaluation

  return (
    <div className={embedded ? 'space-y-6' : 'p-5 md:p-8 max-w-6xl mx-auto space-y-6'}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Performance Evaluation</h1>
          <p className="text-sm text-gray-500 mt-0.5">How fast you&apos;re progressing, what&apos;s fading, and how accurate your self-assessment is.</p>
        </div>
      )}

      {/* Velocity */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-200 flex items-center gap-2"><Gauge size={15} className="text-orange-400" /> Mastery Velocity</h2>
          <span className="text-xs text-gray-500"><span className="text-orange-300 font-semibold">{velocity.overallPerWeek}</span> stars/week (8-wk avg)</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={velocity.weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="week" stroke="#6b7280" fontSize={10} />
            <YAxis stroke="#6b7280" fontSize={10} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="stars" name="Stars/week" stroke="#ea580c" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        {velocity.bySubject.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
            {velocity.bySubject.map(s => (
              <div key={s.subject} className="bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="text-[11px] text-gray-400 truncate">{subj(s.subject)}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <TrendIcon t={s.trend} />
                  <span className="text-sm font-semibold text-gray-200">{s.recent}</span>
                  <span className="text-[10px] text-gray-600">vs {s.prior} prior 4wk</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Decay queue */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><AlertCircle size={15} className="text-yellow-400" /> Knowledge-Decay Queue</h2>
          {decayQueue.length === 0 ? (
            <p className="text-sm text-gray-600">Nothing overdue for review. Your knowledge is fresh.</p>
          ) : (
            <div className="space-y-1.5">
              {decayQueue.map(d => (
                <Link key={d.id} href={`/topics?subject=${d.subject}`}
                  className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 hover:border-yellow-700/50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-200 truncate">{d.name}</div>
                    <div className="text-[10px] text-gray-500">{subj(d.subject)} · {d.masteryLevel}★</div>
                  </div>
                  <span className="text-[10px] text-yellow-400 shrink-0 ml-2">{d.overdueDays}d overdue</span>
                </Link>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-600 mt-2">Ranked by risk (overdue days × mastery — the more you mastered, the more there is to lose).</p>
        </div>

        {/* Calibration */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Scale size={15} className="text-orange-400" /> Self-Rating Calibration</h2>
          {calibration.length === 0 ? (
            <p className="text-sm text-gray-600">Rate topics and take quizzes/exams to compare self-assessment vs results.</p>
          ) : (
            <div className="space-y-2.5">
              {calibration.map(c => (
                <div key={c.subject}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-300">{subj(c.subject)}</span>
                    <span className={`text-[10px] ${c.label === 'overrating' ? 'text-red-400' : c.label === 'underrating' ? 'text-blue-400' : c.label === 'well-calibrated' ? 'text-green-400' : 'text-gray-600'}`}>{c.label}</span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-[9px] text-gray-600 w-8">self</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-orange-500 rounded-full" style={{ width: `${c.selfPct}%` }} /></div>
                    <span className="text-[9px] text-gray-500 w-8 text-right">{c.selfPct}%</span>
                  </div>
                  <div className="flex gap-1 items-center mt-0.5">
                    <span className="text-[9px] text-gray-600 w-8">tested</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.testedPct}%` }} /></div>
                    <span className="text-[9px] text-gray-500 w-8 text-right">{c.testedPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Efficiency */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Timer size={15} className="text-orange-400" /> Time-vs-Gain Efficiency</h2>
        {!efficiency.hasData ? (
          <p className="text-sm text-gray-600">Log study sessions linked to topics (with the timer or manual log) to see which topics give the most mastery per hour.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(160, efficiency.topics.length * 28)}>
              <BarChart data={efficiency.topics} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#6b7280" fontSize={10} label={{ value: 'stars / hour', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={9} width={120} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="starsPerHour" name="stars/hour" radius={[0, 4, 4, 0]}>
                  {efficiency.topics.map((t, i) => <Cell key={i} fill={t.starsPerHour >= 0.5 ? '#16a34a' : t.starsPerHour >= 0.25 ? '#ea580c' : '#ca8a04'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-gray-600 mt-1">Higher = more mastery per study hour. Low bars are topics that are costing you time — consider a different method or resource.</p>
          </>
        )}
      </div>
    </div>
  )
}
