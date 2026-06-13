'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, BookOpen, GitBranch, List, Calendar, MessageCircle, Zap, FlaskConical, GraduationCap, Route, BarChart3, Settings, FileText, Brain, ClipboardCheck, Briefcase, BookMarked, CalendarClock, ScrollText, Workflow } from 'lucide-react'

const links = [
  { href: '/',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/courses',        label: 'Courses',        icon: BookOpen },
  { href: '/skills',         label: 'Skills',         icon: GitBranch },
  { href: '/topics',         label: 'Topics',         icon: List },
  { href: '/library',        label: 'Library',        icon: BookMarked },
  { href: '/learning-paths', label: 'Learning Paths', icon: Route },
  { href: '/quiz',           label: 'Quiz',           icon: GraduationCap },
  { href: '/real-exam',      label: 'Real Exam',      icon: ClipboardCheck },
  { href: '/planner',        label: 'Exam Planner',   icon: CalendarClock },
  { href: '/exercises',      label: 'Exercises',      icon: FileText },
  { href: '/analytics',      label: 'Analytics',      icon: BarChart3 },
  { href: '/learning-ability', label: 'Learning Ability', icon: Brain },
  { href: '/career',         label: 'Career',         icon: Briefcase },
  { href: '/transcript',     label: 'Transcript',     icon: ScrollText },
  { href: '/schedule',       label: 'Schedule',       icon: Calendar },
  { href: '/workflow',       label: 'Studying Workflow', icon: Workflow },
  { href: '/techniques',     label: 'Techniques',     icon: FlaskConical },
  { href: '/chat',           label: 'AI Chat',        icon: MessageCircle },
  { href: '/settings',       label: 'Settings',       icon: Settings },
]

// Desktop sidebar — fixed left panel, 256px wide
export default function Nav() {
  const path = usePathname()
  const [dueCount, setDueCount] = useState(0)
  const [deadlineCount, setDeadlineCount] = useState(0)

  useEffect(() => {
    fetch('/api/reviews/due').then(r => r.json()).then(d => setDueCount(d.count ?? 0)).catch(() => {})
    fetch('/api/deadlines/due').then(r => r.json()).then(d => setDeadlineCount(d.count ?? 0)).catch(() => {})
  }, [path]) // re-check when navigating

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur border-r border-gray-800 p-4 z-40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-4 px-2 mt-1 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-orange-200 bg-clip-text text-transparent">
          StudyQuest
        </span>
      </div>

      {/* Nav links — scrollable so a long menu always fits */}
      <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href
          const reviewBadge = href === '/topics' && dueCount > 0
          const dlBadge = href === '/schedule' && deadlineCount > 0
          return (
            <div key={href} className="relative shrink-0">
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50 shadow-[0_0_12px_rgba(234,88,12,0.15)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="text-sm font-medium">{label}</span>
                {dlBadge && (
                  <span title={`${deadlineCount} deadline${deadlineCount === 1 ? '' : 's'} due within a week`}
                    className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
                    {deadlineCount > 99 ? '99+' : deadlineCount}
                  </span>
                )}
                {active && !reviewBadge && !dlBadge && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
              </Link>
              {reviewBadge && (
                <Link
                  href="/review"
                  title={`${dueCount} topic${dueCount === 1 ? '' : 's'} due for review — click to review`}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold leading-none transition-colors z-10"
                >
                  {dueCount > 99 ? '99+' : dueCount}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {/* User identity */}
      <div className="shrink-0 px-1 pt-2 pb-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-800/50 border border-gray-700/40">
          <div className="w-8 h-8 rounded-full bg-orange-800/70 border border-orange-700/50 flex items-center justify-center text-xs font-bold text-orange-200 shrink-0 select-none">
            ME
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">Michael Essine</div>
            <div className="text-[10px] text-gray-600">StudyQuest v0.1</div>
          </div>
        </div>
      </div>
    </nav>
  )
}
