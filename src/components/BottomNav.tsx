'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, List, GraduationCap, NotebookPen, MoreHorizontal, X,
  BookOpen, GitBranch, FileText, Bug, Calendar, CalendarClock, ClipboardCheck,
  Route, Workflow, FlaskConical, BookMarked, BarChart3, Brain, Briefcase,
  ScrollText, MessageCircle, Settings, ChevronRight, Zap,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType }
type Section = { label: string; items: NavItem[] }

const sections: Section[] = [
  {
    label: 'Study',
    items: [
      { href: '/courses',   label: 'Courses',     icon: BookOpen },
      { href: '/skills',    label: 'Skills',      icon: GitBranch },
      { href: '/exercises', label: 'Exercises',   icon: FileText },
      { href: '/mistakes',  label: 'Mistake Log', icon: Bug },
    ],
  },
  {
    label: 'Plan',
    items: [
      { href: '/schedule',       label: 'Schedule',      icon: Calendar },
      { href: '/planner',        label: 'Exam Planner',  icon: CalendarClock },
      { href: '/real-exam',      label: 'Real Exam',     icon: ClipboardCheck },
      { href: '/learning-paths', label: 'Learning Paths',icon: Route },
    ],
  },
  {
    label: 'Practice',
    items: [
      { href: '/workflow',   label: 'Study Workflow', icon: Workflow },
      { href: '/techniques', label: 'Techniques',     icon: FlaskConical },
      { href: '/library',    label: 'Library',        icon: BookMarked },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/analytics',        label: 'Analytics',        icon: BarChart3 },
      { href: '/learning-ability', label: 'Learning Ability', icon: Brain },
      { href: '/career',           label: 'Career',           icon: Briefcase },
      { href: '/transcript',       label: 'Transcript',       icon: ScrollText },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/chat',     label: 'AI Chat',  icon: MessageCircle },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const BOTTOM_TABS: NavItem[] = [
  { href: '/',       label: 'Home',   icon: LayoutDashboard },
  { href: '/log',    label: 'Log',    icon: NotebookPen },
  { href: '/topics', label: 'Topics', icon: List },
  { href: '/quiz',   label: 'Quiz',   icon: GraduationCap },
]

export default function BottomNav() {
  const path = usePathname()
  const [dueCount, setDueCount] = useState(0)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/reviews/due').then(r => r.json()).then(d => setDueCount(d.count ?? 0)).catch(() => {})
    fetch('/api/mistakes/count').then(r => r.json()).then(d => setMistakeCount(d.count ?? 0)).catch(() => {})
  }, [path])

  // Close drawer on navigation
  useEffect(() => { setOpen(false) }, [path])

  const inMore = !BOTTOM_TABS.some(t => t.href === path)

  return (
    <>
      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex items-center z-50">
        {BOTTOM_TABS.map(({ href, label, icon: Icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${active ? 'text-orange-400' : 'text-gray-500'}`}>
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                {href === '/topics' && dueCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-orange-600 text-white text-[9px] font-bold leading-none">
                    {dueCount > 9 ? '9+' : dueCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}

        {/* More button */}
        <button onClick={() => setOpen(o => !o)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${open || inMore ? 'text-orange-400' : 'text-gray-500'}`}>
          <div className="relative">
            {open ? <X size={20} strokeWidth={2.5} /> : <MoreHorizontal size={20} strokeWidth={inMore ? 2.5 : 1.5} />}
            {!open && mistakeCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-gray-600 text-white text-[9px] font-bold leading-none">
                {mistakeCount > 9 ? '9+' : mistakeCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* More drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end" onClick={() => setOpen(false)}>
          <div className="bg-gray-900 border-t border-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto pb-20"
            onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-700" />
            </div>

            {/* Brand */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800">
              <div className="w-6 h-6 rounded-md bg-orange-600 flex items-center justify-center shrink-0">
                <Zap size={12} className="text-white" />
              </div>
              <span className="text-sm font-bold text-gray-200">StudyQuest</span>
            </div>

            {/* Sections */}
            {sections.map(section => (
              <div key={section.label} className="px-3 pt-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-2 mb-1">
                  {section.label}
                </div>
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = path === href
                  return (
                    <Link key={href} href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        active ? 'bg-orange-900/40 text-orange-300' : 'text-gray-300 hover:bg-gray-800'
                      }`}>
                      <Icon size={18} className="shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                      {active && <ChevronRight size={14} className="ml-auto text-orange-500" />}
                    </Link>
                  )
                })}
              </div>
            ))}
            <div className="h-4" />
          </div>
        </div>
      )}
    </>
  )
}
