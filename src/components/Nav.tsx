'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, GitBranch, List, Calendar, MessageCircle, Zap, FlaskConical } from 'lucide-react'

const links = [
  { href: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/courses',    label: 'Courses',    icon: BookOpen },
  { href: '/skills',     label: 'Skills',     icon: GitBranch },
  { href: '/topics',     label: 'Topics',     icon: List },
  { href: '/schedule',   label: 'Schedule',   icon: Calendar },
  { href: '/techniques', label: 'Techniques', icon: FlaskConical },
  { href: '/chat',       label: 'AI Chat',    icon: MessageCircle },
]

// Desktop sidebar — fixed left panel, 256px wide
export default function Nav() {
  const path = usePathname()

  return (
    <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur border-r border-gray-800 p-4 z-40">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-8 px-2 mt-2">
        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
          StudyQuest
        </span>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                active
                  ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />}
            </Link>
          )
        })}
      </div>

      {/* User identity */}
      <div className="mt-auto px-1 pb-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-gray-800/50 border border-gray-700/40">
          <div className="w-8 h-8 rounded-full bg-purple-800/70 border border-purple-700/50 flex items-center justify-center text-xs font-bold text-purple-200 shrink-0 select-none">
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
