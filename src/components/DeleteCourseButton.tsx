'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { useToast } from './ToastProvider'

export default function DeleteCourseButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  async function del(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${name}"? This removes its deadlines and unlinks its topics (mastery is kept).`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast('info', `Deleted "${name}"`)
      router.refresh()
    } catch {
      showToast('info', 'Failed to delete course')
      setBusy(false)
    }
  }

  return (
    <button onClick={del} disabled={busy} title="Delete course"
      className="absolute bottom-2 right-2 z-10 p-1.5 rounded-lg bg-gray-900/70 text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
    </button>
  )
}
