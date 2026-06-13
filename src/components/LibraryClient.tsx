'use client'
import { useState, useMemo } from 'react'
import { Search, Link as LinkIcon, NotebookPen, BookMarked, ChevronDown } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'

type Entry = {
  id: string; topicId: string | null; topicName: string; subject: string
  note: string | null; sourceUrl: string | null; date: string; durationMins: number
}
function subj(s: string) { return s ? (SUBJECT_LABEL[s as Subject] ?? s) : '' }

export default function LibraryClient({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return entries
    return entries.filter(e =>
      e.topicName.toLowerCase().includes(q) ||
      e.note?.toLowerCase().includes(q) ||
      e.sourceUrl?.toLowerCase().includes(q) ||
      subj(e.subject).toLowerCase().includes(q))
  }, [entries, query])

  // Group by topic, preserving recency order
  const groups = useMemo(() => {
    const map = new Map<string, { topicName: string; subject: string; items: Entry[] }>()
    for (const e of filtered) {
      const key = e.topicId ?? e.topicName
      if (!map.has(key)) map.set(key, { topicName: e.topicName, subject: e.subject, items: [] })
      map.get(key)!.items.push(e)
    }
    return Array.from(map.entries())
  }, [filtered])

  const totalNotes = entries.filter(e => e.note).length
  const totalLinks = entries.filter(e => e.sourceUrl).length

  function toggle(key: string) {
    setCollapsed(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <BookMarked size={22} className="text-orange-400" /> Knowledge Library
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Every note and resource link you&apos;ve saved while studying, grouped by topic — {totalNotes} note{totalNotes === 1 ? '' : 's'}, {totalLinks} link{totalLinks === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 sticky top-2 z-10">
        <Search size={15} className="text-gray-500 shrink-0" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search notes, topics, links…"
          className="flex-1 bg-transparent text-sm text-gray-200 focus:outline-none placeholder-gray-600" />
      </div>

      {groups.length === 0 ? (
        <div className="card p-10 text-center text-gray-500">
          {entries.length === 0
            ? 'No notes or links yet. Add a note or source link when you log a study session and it will show up here.'
            : 'No matches for your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(([key, g]) => {
            const isCollapsed = collapsed.has(key)
            return (
              <div key={key} className="card overflow-hidden">
                <button onClick={() => toggle(key)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-800/40">
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-200">{g.topicName}</span>
                    {g.subject && <span className="ml-2 text-[11px] text-gray-600">{subj(g.subject)}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-600">{g.items.length}</span>
                    <ChevronDown size={15} className={`text-gray-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </div>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-gray-800 divide-y divide-gray-800/70">
                    {g.items.map(e => (
                      <div key={e.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-1">
                          {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span>· {e.durationMins}m</span>
                        </div>
                        {e.note && <div className="text-sm text-gray-300 whitespace-pre-wrap flex gap-1.5"><NotebookPen size={13} className="text-gray-600 mt-0.5 shrink-0" />{e.note}</div>}
                        {e.sourceUrl && (
                          <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 mt-1.5 break-all">
                            <LinkIcon size={12} className="shrink-0" /> {e.sourceUrl}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
