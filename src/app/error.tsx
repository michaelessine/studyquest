'use client'
// Route-level error boundary — catches render/data errors (e.g. a transient
// database hiccup) and offers a retry instead of crashing the whole route.
import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Route error:', error) }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card p-8 max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-yellow-900/40 border border-yellow-800/50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-yellow-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-100">Something went wrong</h2>
        <p className="text-sm text-gray-500 mt-1">
          This page hit a snag loading its data. The database may have been waking up — try again.
        </p>
        <button onClick={() => reset()}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors">
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    </div>
  )
}
