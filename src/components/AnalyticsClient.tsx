'use client'
import { useState } from 'react'
import { BarChart3, TrendingUp, Gauge } from 'lucide-react'
import AnalyticsOverview from './AnalyticsOverview'
import ProgressClient from './ProgressClient'
import EvaluateClient from './EvaluateClient'
import type { Evaluation } from '@/lib/evaluate'

type ProgressProps = React.ComponentProps<typeof ProgressClient>

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'progress', label: 'Progress & Career', icon: TrendingUp },
  { id: 'evaluation', label: 'Evaluation', icon: Gauge },
] as const

export default function AnalyticsClient({ progress, evaluation }: { progress: ProgressProps; evaluation: Evaluation }) {
  const [tab, setTab] = useState<'overview' | 'progress' | 'evaluation'>('overview')

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Study patterns, mastery growth, and performance — all in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-800">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                active ? 'text-orange-300 border-orange-500 bg-orange-950/20' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <AnalyticsOverview />}
      {tab === 'progress' && <ProgressClient embedded {...progress} />}
      {tab === 'evaluation' && <EvaluateClient embedded evaluation={evaluation} />}
    </div>
  )
}
