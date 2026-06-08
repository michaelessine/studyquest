'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, GitBranch, List, Calendar, MessageCircle, FlaskConical } from 'lucide-react'

const links = [
  { href: '/',           label: 'Home',       icon: LayoutDashboard },
  { href: '/topics',     label: 'Topics',     icon: List },
  { href: '/skills',     label: 'Skills',     icon: GitBranch },
  { href: '/schedule',   label: 'Schedule',   icon: Calendar },
  { href: '/techniques', label: 'Techniques', icon: FlaskConical },
  { href: '/chat',       label: 'Chat',       icon: MessageCircle },
]

// Mobile bottom tab bar — only shown on small screens
export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur border-t border-gray-800 flex items-center z-50">
      {links.map(({ href, label, icon: Icon }) => {
        const active = path === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
              active ? 'text-purple-400' : 'text-gray-500'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
