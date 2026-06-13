import Link from 'next/link'
import { Sparkles, AlertTriangle, CalendarClock, RefreshCw, Bug, GraduationCap, Hourglass, ChevronRight, CheckCircle2 } from 'lucide-react'

export type TodayItem = {
  score: number
  href: string
  tone: 'red' | 'orange' | 'yellow' | 'gray'
  kind: string
  title: string
  detail: string
}

export type TodayData = { items: TodayItem[] }

function kindIcon(kind: string) {
  if (kind === 'overdue') return <AlertTriangle size={15} />
  if (kind === 'exam')    return <GraduationCap size={15} />
  if (kind === 'due')     return <CalendarClock size={15} />
  if (kind === 'review')  return <RefreshCw size={15} />
  if (kind === 'stale')   return <Hourglass size={15} />
  return <Bug size={15} />
}

export default function TodayCenter({ data }: { data: TodayData }) {
  const { items } = data

  return (
    <div className="card p-5 border-orange-700/40">
      <h2 className="font-semibold text-gray-100 flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-orange-400" /> Today
      </h2>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <CheckCircle2 size={16} className="text-green-400" /> You&apos;re all caught up. Log a session or get ahead on an upcoming exam.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <Row key={i} href={item.href} tone={item.tone} icon={kindIcon(item.kind)} title={item.title} detail={item.detail} />
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ href, tone, icon, title, detail }: {
  href: string; tone: 'red' | 'orange' | 'yellow' | 'gray'; icon: React.ReactNode; title: string; detail: string
}) {
  const toneCls = { red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400', gray: 'text-gray-400' }[tone]
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/40 hover:bg-gray-800/70 transition-colors group">
      <span className={`shrink-0 ${toneCls}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-200">{title}</div>
        {detail && <div className="text-[11px] text-gray-500 truncate">{detail}</div>}
      </div>
      <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
    </Link>
  )
}
