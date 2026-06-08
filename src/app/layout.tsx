import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'
import BottomNav from '@/components/BottomNav'
import ClientProviders from '@/components/ClientProviders'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StudyQuest',
  description: 'Your personal learning hub — level up your knowledge',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <ClientProviders>
          <div className="flex min-h-screen">
            {/* Desktop sidebar — hidden on mobile */}
            <Nav />

            {/* Main content area; pb-16 gives room for the mobile bottom bar */}
            <main className="flex-1 pb-16 md:pb-0 md:ml-64 min-h-screen overflow-x-hidden">
              {children}
            </main>
          </div>

          {/* Mobile bottom tab bar — hidden on desktop */}
          <BottomNav />
        </ClientProviders>
      </body>
    </html>
  )
}
