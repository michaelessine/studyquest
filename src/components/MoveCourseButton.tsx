'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FolderInput, Check, Loader2 } from 'lucide-react'
import { SUBJECTS, SUBJECT_LABEL } from '@/lib/xp'
import { useToast } from './ToastProvider'

export default function MoveCourseButton({ id, currentSubject }: { id: string; currentSubject: string }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function move(e: React.MouseEvent, subject: string) {
    e.preventDefault(); e.stopPropagation()
    if (subject === currentSubject) { setOpen(false); return }
    setBusy(true); setOpen(false)
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      })
      if (!res.ok) throw new Error()
      showToast('info', `Moved to ${SUBJECT_LABEL[subject as keyof typeof SUBJECT_LABEL] ?? subject}`)
      router.refresh()
    } catch {
      showToast('info', 'Failed to move course')
    } finally { setBusy(false) }
  }

  return (
    <div ref={ref} className="absolute bottom-2 left-2 z-10">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        title="Move to another subject"
        className="p-1.5 rounded-lg bg-gray-900/70 text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FolderInput size={13} />}
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-1 z-20">
          {SUBJECTS.map(s => (
            <button key={s} onClick={e => move(e, s)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-gray-800 transition-colors">
              <span className={s === currentSubject ? 'text-orange-300 font-medium' : 'text-gray-300'}>
                {SUBJECT_LABEL[s]}
              </span>
              {s === currentSubject && <Check size={11} className="text-orange-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
