'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Trophy, Zap, Info, X } from 'lucide-react'

export type ToastType = 'xp' | 'achievement' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  body?: string
}

interface ToastCtx {
  showToast: (type: ToastType, title: string, body?: string) => void
}

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const cfg = {
    xp:          { icon: <Zap size={15} />,     border: 'border-orange-600/60', bg: 'bg-orange-950/95', accent: 'text-orange-300' },
    achievement: { icon: <Trophy size={15} />,   border: 'border-yellow-500/60', bg: 'bg-yellow-950/95', accent: 'text-yellow-300' },
    info:        { icon: <Info size={15} />,      border: 'border-gray-600/60',  bg: 'bg-gray-900/95',   accent: 'text-gray-300'  },
  }[toast.type]

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl min-w-[240px] max-w-xs
        ${cfg.bg} ${cfg.border} toast-slide-in
      `}
    >
      <span className={`mt-0.5 shrink-0 ${cfg.accent}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${cfg.accent}`}>{toast.title}</div>
        {toast.body && <div className="text-xs text-gray-400 mt-0.5">{toast.body}</div>}
      </div>
      <button onClick={onDismiss} className="text-gray-600 hover:text-gray-400 shrink-0 mt-0.5">
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, title: string, body?: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, type, title, body }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
