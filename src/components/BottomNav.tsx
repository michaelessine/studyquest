'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, List, GraduationCap, NotebookPen, BarChart3 } from 'lucide-react'

const links = [
  { href: '/',          label: 'Home',   icon: LayoutDashboard },
  { href: '/log',       label: 'Log',    icon: NotebookPen },
  { href: '/topics',    label: 'Topics', icon: List },
  { href: '/quiz',      label: 'Quiz',   icon: GraduationCap },
  { href: '/analytics', label: 'Stats',  icon: BarChart3 },
]

// Mobile bottom tab bar — only shown on small screens
export default function BottomNav() {
  const path = usePathname()
  const [dueCount, setDueCount] = useState(0)

  useEffect(() => {
    fetch('/api/reviews/due').then(r => r.json()).then(d => setDueCount(d.count ?? 0)).catch(() => {})
  }, [path])

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex items-center z-50">
      {links.map(({ href, label, icon: Icon }) => {
        const active = path === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
              active ? 'text-orange-400' : 'text-gray-500'
            }`}
          >
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
    </nav>
  )
}
