'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Briefcase, ChevronDown, Check, Target, Sparkles, TrendingUp, Plus, Loader2 } from 'lucide-react'
import { SUBJECT_LABEL, Subject } from '@/lib/xp'

type CareerProgress = {
  id: string; label: string; roles: string[]
  matched: { id: string; name: string; subject: string; masteryLevel: number; status: string }[]
  masteredTopics: { id: string; name: string; subject: string }[]
  recommendedNext: { id: string; name: string; subject: string; masteryLevel: number }[]
  allTopics: { name: string; id: string | null; subject: string | null; masteryLevel: number; inTree: boolean }[]
  relevance: number; readiness: number; gapText: string; totalTopics: number; requiredTopics: number
}

function topicChip(t: CareerProgress['allTopics'][number]) {
  if (!t.inTree) return 'bg-gray-900/40 border-dashed border-gray-700 text-gray-500'
  if (t.masteryLevel >= 4) return 'bg-green-950/40 border-green-800/40 text-green-300'
  if (t.masteryLevel >= 3) return 'bg-orange-950/40 border-orange-800/40 text-orange-300'
  if (t.masteryLevel >= 1) return 'bg-blue-950/40 border-blue-800/40 text-blue-300'
  return 'bg-gray-800/60 border-gray-700/50 text-gray-400'
}

function subjLabel(s: string) { return SUBJECT_LABEL[s as Subject] ?? s }

function Ring({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 26, c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#1f2937" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-100">{pct}%</div>
      </div>
      <span className="text-[10px] text-gray-500 mt-1">{label}</span>
    </div>
  )
}

function guessSubject(name: string): string {
  const t = name.toLowerCase()
  if (/\b(math|calc|algebra|analysis|topolog|geometr|statistic|probab|number theory|combinat|optimiz|differential|integral|fourier|measure|stochast|numeric|ode|pde)\b/.test(t)) return 'Mathematics'
  if (/\b(cs|csc|comput|algorithm|data struct|program|software|network|database|machine learn|artificial|cyber|web|cloud|docker|kubernetes|sql|python|git)\b/.test(t)) return 'ComputerScience'
  if (/\b(financ|invest|portfolio|asset|derivative|option|equity|risk|banking|capital|accounting|bond|hedge|valuation|trading)\b/.test(t)) return 'Finance'
  if (/\b(econ|micro|macro|gdp|trade|labour|labor|fiscal|monetary|game theory|market|strategy|consulting|business)\b/.test(t)) return 'Economics'
  if (/\b(quantum|physic|thermo|electro|optic|particle|nuclear|relativit|wave|atomic|solid state)\b/.test(t)) return 'QuantumMechanics'
  return 'Others'
}

export default function CareerClient({ progress, initialSelected }: { progress: CareerProgress[]; initialSelected: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected.length ? initialSelected : ['data-science']))
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function addToTree(name: string) {
    if (added.has(name) || adding.has(name)) return
    setAdding(prev => new Set(prev).add(name))
    try {
      await fetch('/api/nodes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject: guessSubject(name) }),
      })
      setAdded(prev => new Set(prev).add(name))
    } finally {
      setAdding(prev => { const n = new Set(prev); n.delete(name); return n })
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      // persist (fire and forget)
      fetch('/api/career', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interestAreas: Array.from(next) }) }).catch(() => {})
      return next
    })
  }

  const shown = progress.filter(p => selected.has(p.id)).sort((a, b) => b.readiness - a.readiness)

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2"><Briefcase size={22} className="text-orange-400" /> Career Alignment</h1>
        <p className="text-sm text-gray-500 mt-0.5">See how your mastered topics map to careers, and what to study next.</p>
      </div>

      {/* Multi-select dropdown */}
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 hover:border-gray-600">
          <span>{selected.size} career path{selected.size !== 1 ? 's' : ''} selected</span>
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-1">
            {progress.map(p => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm rounded hover:bg-gray-800">
                <span className="text-gray-300">{p.label}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-gray-600">{p.readiness}%</span>
                  {selected.has(p.id) && <Check size={14} className="text-orange-400" />}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 && <div className="card p-10 text-center text-gray-500">Select a career path to see your alignment.</div>}

      {/* Career cards */}
      <div className="space-y-5">
        {shown.map(p => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-100">{p.label}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{p.masteredTopics.length} of {p.totalTopics} mapped topics mastered</p>
              </div>
              <div className="flex gap-4 shrink-0">
                <Ring pct={p.relevance} label="Relevance" color="#ea580c" />
                <Ring pct={p.readiness} label="Readiness" color={p.readiness >= 80 ? '#16a34a' : p.readiness >= 50 ? '#ea580c' : '#eab308'} />
              </div>
            </div>

            {/* Example roles */}
            {p.roles?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.roles.map(r => (
                  <span key={r} className="text-[11px] px-2.5 py-1 rounded-full bg-orange-950/40 border border-orange-800/40 text-orange-300">{r}</span>
                ))}
              </div>
            )}

            {/* Gap analysis */}
            <div className="mt-3 text-sm text-gray-400 bg-gray-800/40 border border-gray-700/40 rounded-lg px-3 py-2 flex items-start gap-2">
              <Sparkles size={14} className="text-orange-400 shrink-0 mt-0.5" />
              <span>{p.gapText}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Mastered */}
              <div>
                <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Target size={12} /> Mastered</div>
                {p.masteredTopics.length === 0 ? <p className="text-xs text-gray-600">None yet — start with the recommendations.</p> : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.masteredTopics.map(t => (
                      <Link key={t.id} href={`/skills`} title={subjLabel(t.subject)}
                        className="text-[11px] px-2 py-0.5 bg-green-950/40 border border-green-800/40 text-green-300 rounded hover:bg-green-900/40 transition-colors">
                        {t.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              {/* Recommended next */}
              <div>
                <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1"><TrendingUp size={12} /> Study next</div>
                {p.recommendedNext.length === 0 ? <p className="text-xs text-gray-600">Unlock prerequisites to reveal next steps.</p> : (
                  <div className="space-y-1.5">
                    {p.recommendedNext.map(t => (
                      <Link key={t.id} href={`/topics?subject=${t.subject}`}
                        className="flex items-center justify-between text-xs bg-gray-800/60 border border-gray-700/50 rounded px-2 py-1.5 hover:border-orange-700/50 transition-colors">
                        <span className="text-gray-300 truncate">{t.name}</span>
                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">{subjLabel(t.subject)} · {t.masteryLevel}★</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* All required topics */}
            <div className="mt-4 border-t border-gray-800 pt-3">
              <button onClick={() => toggleExpand(p.id)} className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200">
                <span>All required topics ({p.requiredTopics})</span>
                <ChevronDown size={14} className={`transition-transform ${expanded.has(p.id) ? 'rotate-180' : ''}`} />
              </button>
              {expanded.has(p.id) && (
                <>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.allTopics.map((t, i) => {
                      const cls = `text-[11px] px-2 py-0.5 rounded border ${topicChip(t)}`
                      if (t.inTree && t.id) {
                        return (
                          <Link key={i} href="/skills" title={`${subjLabel(t.subject ?? '')} · ${t.masteryLevel}★`} className={`${cls} hover:opacity-80 transition-opacity`}>
                            {t.name}{t.masteryLevel > 0 && <span className="opacity-60"> {t.masteryLevel}★</span>}
                          </Link>
                        )
                      }
                      const isAdded = added.has(t.name)
                      const isAdding = adding.has(t.name)
                      return (
                        <span key={i} className={`${cls} inline-flex items-center gap-1 ${isAdded ? 'opacity-50' : ''}`} title={isAdded ? 'Added to your skill tree' : 'Not in your skill tree yet'}>
                          {t.name}
                          {!isAdded ? (
                            <button onClick={() => addToTree(t.name)} disabled={isAdding} className="ml-0.5 hover:text-orange-400 transition-colors" title="Add to skill tree">
                              {isAdding ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
                            </button>
                          ) : <Check size={9} className="text-green-400" />}
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Strong (4★+)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />3★</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />1–2★</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />Not started</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-dashed border-gray-600 inline-block" />Not in tree</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
