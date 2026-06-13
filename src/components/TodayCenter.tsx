import Link from 'next/link'
import { Sparkles, AlertTriangle, CalendarClock, RefreshCw, Bug, GraduationCap, Hourglass, ChevronRight, CheckCircle2 } from 'lucide-react'

export type TodayData = {
  overdue: { id: string; title: string; course: string; daysOverdue: number }[]
  dueSoon: { id: string; title: string; course: string; daysLeft: number }[]
  reviewsDue: number
  openMistakes: number
  exams: { id: string; name: string; daysLeft: number; weakCount: number }[]
  stale: { id: string; name: string; subject: string; days: number }[]
}

export default function TodayCenter({ data }: { data: TodayData }) {
  const nothing =
    data.overdue.length === 0 && data.dueSoon.length === 0 && data.reviewsDue === 0 &&
    data.openMistakes === 0 && data.exams.length === 0 && data.stale.length === 0

  return (
    <div className="card p-5 border-orange-700/40">
      <h2 className="font-semibold text-gray-100 flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-orange-400" /> Today
      </h2>

      {nothing ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <CheckCircle2 size={16} className="text-green-400" /> You&apos;re all caught up. Log a session or get ahead on an upcoming exam.
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Overdue deadlines — highest priority */}
          {data.overdue.length > 0 && (
            <Row href="/schedule" tone="red" icon={<AlertTriangle size={15} />}
              title={`${data.overdue.length} overdue deadline${data.overdue.length === 1 ? '' : 's'}`}
              detail={data.overdue.slice(0, 3).map(d => `${d.title} (${d.daysOverdue}d)`).join(' · ')} />
          )}

          {/* Exams approaching with weak topics */}
          {data.exams.map(e => (
            <Row key={e.id} href="/planner" tone={e.daysLeft <= 7 ? 'red' : 'orange'} icon={<GraduationCap size={15} />}
              title={`${e.name} — ${e.daysLeft === 0 ? 'today' : e.daysLeft === 1 ? 'tomorrow' : `${e.daysLeft} days`}`}
              detail={e.weakCount > 0 ? `${e.weakCount} covered topic${e.weakCount === 1 ? '' : 's'} below 3★ to drill` : 'All covered topics ready'} />
          ))}

          {/* Deadlines due soon */}
          {data.dueSoon.length > 0 && (
            <Row href="/schedule" tone="orange" icon={<CalendarClock size={15} />}
              title={`${data.dueSoon.length} deadline${data.dueSoon.length === 1 ? '' : 's'} due soon`}
              detail={data.dueSoon.slice(0, 3).map(d => `${d.title} (${d.daysLeft === 0 ? 'today' : `${d.daysLeft}d`})`).join(' · ')} />
          )}

          {/* Reviews due */}
          {data.reviewsDue > 0 && (
            <Row href="/review" tone="orange" icon={<RefreshCw size={15} />}
              title={`${data.reviewsDue} topic${data.reviewsDue === 1 ? '' : 's'} due for review`}
              detail="Spaced-repetition — confirm what you still know" />
          )}

          {/* Stale topics */}
          {data.stale.length > 0 && (
            <Row href="/topics" tone="yellow" icon={<Hourglass size={15} />}
              title={`${data.stale.length} topic${data.stale.length === 1 ? '' : 's'} going stale`}
              detail={data.stale.slice(0, 3).map(s => `${s.name} (${s.days}d)`).join(' · ')} />
          )}

          {/* Mistakes to redo */}
          {data.openMistakes > 0 && (
            <Row href="/mistakes" tone="gray" icon={<Bug size={15} />}
              title={`${data.openMistakes} problem${data.openMistakes === 1 ? '' : 's'} to redo`}
              detail="Work through your logged mistakes" />
          )}
        </div>
      )}
    </div>
  )
}

function Row({ href, tone, icon, title, detail }: {
  href: string; tone: 'red' | 'orange' | 'yellow' | 'gray'; icon: React.ReactNode; title: string; detail: string
}) {
  const toneCls = {
    red: 'text-red-400', orange: 'text-orange-400', yellow: 'text-yellow-400', gray: 'text-gray-400',
  }[tone]
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
