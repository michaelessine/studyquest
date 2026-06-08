'use client'
import { useState, useEffect } from 'react'
import { Loader2, Swords, GraduationCap, BookText, MessagesSquare, ExternalLink, FileSearch } from 'lucide-react'
import { useToast } from './ToastProvider'

interface Props {
  skillNodeId: string
  topicName: string
  subject: string
  currentMastery: number
  onMasteryUpdated: (ml: number) => void
}

type Tool = 'menu' | 'teach' | 'debate' | 'research' | 'socratic' | 'textbook'

// ── Teach mode ────────────────────────────────────────────────────────────────
function TeachMode({ skillNodeId, topicName, onMasteryUpdated, back }: { skillNodeId: string; topicName: string; onMasteryUpdated: (ml: number) => void; back: () => void }) {
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ clarity: number; completeness: number; misconceptions: { statement: string; correction: string }[]; overallScore: number; feedback: string; suggestedImprovements: string[] } | null>(null)

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/teach/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, explanation: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.evaluation)
      if (data.newMasteryLevel != null) { onMasteryUpdated(data.newMasteryLevel); showToast('info', `Mastery → ${data.newMasteryLevel}★`) }
    } catch { showToast('info', 'Evaluation failed') }
    finally { setLoading(false) }
  }

  if (result) {
    return (
      <div className="space-y-3">
        <div className="text-center py-2 bg-gray-800/60 rounded-xl">
          <div className={`text-2xl font-black ${result.overallScore >= 80 ? 'text-green-400' : 'text-gray-300'}`}>{result.overallScore}/100</div>
          <div className="text-[10px] text-gray-500">Clarity {result.clarity}/5 · Completeness {result.completeness}/5</div>
        </div>
        <p className="text-xs text-gray-400">{result.feedback}</p>
        {result.misconceptions.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-red-400 uppercase">Misconceptions</div>
            {result.misconceptions.map((m, i) => (
              <div key={i} className="text-xs bg-red-950/20 border border-red-900/30 rounded p-2">
                <div className="text-red-300 line-through">{m.statement}</div>
                <div className="text-gray-300 mt-0.5">→ {m.correction}</div>
              </div>
            ))}
          </div>
        )}
        {result.suggestedImprovements?.length > 0 && (
          <ul className="text-xs text-gray-400 list-disc list-inside space-y-0.5">
            {result.suggestedImprovements.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        )}
        <button onClick={back} className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back to tools</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Explain {topicName} as if teaching someone who knows the prerequisites. Be detailed.</p>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Start teaching…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-600" />
      <div className="flex gap-2">
        <button onClick={back} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Cancel</button>
        <button onClick={submit} disabled={!text.trim() || loading}
          className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg">
          {loading ? <Loader2 size={12} className="animate-spin" /> : null} Submit explanation
        </button>
      </div>
    </div>
  )
}

// ── Debate mode ───────────────────────────────────────────────────────────────
function DebateMode({ skillNodeId, topicName, mastery, onMasteryUpdated, back }: { skillNodeId: string; topicName: string; mastery: number; onMasteryUpdated: (ml: number) => void; back: () => void }) {
  const { showToast } = useToast()
  const [claim, setClaim] = useState('')
  const [started, setStarted] = useState(false)
  const [turns, setTurns] = useState<{ role: 'user' | 'claude'; text: string }[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [finalScore, setFinalScore] = useState<{ score: number; verdict: string; strengths: string[]; areasToImprove: string[] } | null>(null)

  const userTurns = turns.filter(t => t.role === 'user').length

  async function start() {
    if (!claim.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/debate/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicName, claim, turns: [], mastery }),
      })
      const data = await res.json()
      setTurns([{ role: 'claude', text: `${data.claudeResponse}\n\n${data.questionToUser}` }])
      setStarted(true)
    } catch { showToast('info', 'Failed to start debate') }
    finally { setLoading(false) }
  }

  async function sendReply() {
    if (!reply.trim()) return
    const newTurns = [...turns, { role: 'user' as const, text: reply }]
    setTurns(newTurns); setReply(''); setLoading(true)
    try {
      const res = await fetch('/api/debate/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicName, claim, turns: newTurns }),
      })
      const data = await res.json()
      setTurns([...newTurns, { role: 'claude', text: `${data.claudeResponse}\n\n${data.questionToUser}` }])
    } catch { showToast('info', 'Failed') }
    finally { setLoading(false) }
  }

  async function finish() {
    setLoading(true)
    try {
      const res = await fetch('/api/debate/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, claim, turns }),
      })
      const data = await res.json()
      setFinalScore(data)
      if (data.newMasteryLevel != null) { onMasteryUpdated(data.newMasteryLevel); showToast('info', `Mastery → ${data.newMasteryLevel}★`) }
    } catch { showToast('info', 'Scoring failed') }
    finally { setLoading(false) }
  }

  if (finalScore) {
    return (
      <div className="space-y-3">
        <div className="text-center py-2 bg-gray-800/60 rounded-xl">
          <div className={`text-2xl font-black ${finalScore.score >= 70 ? 'text-green-400' : 'text-gray-300'}`}>{finalScore.score}/100</div>
          <div className="text-[10px] text-gray-500 capitalize">{finalScore.verdict}</div>
        </div>
        {finalScore.strengths?.length > 0 && <div className="text-xs"><span className="text-green-400 font-semibold">Strengths:</span> <span className="text-gray-400">{finalScore.strengths.join(', ')}</span></div>}
        {finalScore.areasToImprove?.length > 0 && <div className="text-xs"><span className="text-yellow-400 font-semibold">Improve:</span> <span className="text-gray-400">{finalScore.areasToImprove.join(', ')}</span></div>}
        <button onClick={back} className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back to tools</button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">State a claim about {topicName} and defend it against Claude&apos;s challenges.</p>
        <textarea value={claim} onChange={e => setClaim(e.target.value)} rows={3} placeholder="e.g. Quantum entanglement proves non-locality…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-600" />
        <div className="flex gap-2">
          <button onClick={back} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Cancel</button>
          <button onClick={start} disabled={!claim.trim() || loading} className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg">
            {loading ? <Loader2 size={12} className="animate-spin" /> : null} Start debate
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className={`text-xs rounded-lg px-2.5 py-2 ${t.role === 'user' ? 'bg-purple-900/40 text-purple-100 ml-4' : 'bg-gray-800/60 text-gray-300 mr-4'}`}>
            <div className="whitespace-pre-wrap">{t.text}</div>
          </div>
        ))}
        {loading && <Loader2 size={14} className="animate-spin text-gray-500 mx-auto" />}
      </div>
      <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Your rebuttal…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-600" />
      <div className="flex gap-2">
        <button onClick={sendReply} disabled={!reply.trim() || loading} className="flex-1 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg">Reply</button>
        {userTurns >= 4 && <button onClick={finish} disabled={loading} className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg">Finish &amp; score</button>}
      </div>
      <div className="text-[10px] text-gray-600 text-center">{userTurns}/5 exchanges{userTurns < 4 ? ' · finish available after 4' : ''}</div>
    </div>
  )
}

// ── Research papers ───────────────────────────────────────────────────────────
function ResearchMode({ skillNodeId, topicName, back }: { skillNodeId: string; topicName: string; back: () => void }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [papers, setPapers] = useState<{ id?: string; title: string; url: string; authors: string; year: string; summary: string; source: string }[]>([])
  const [cached, setCached] = useState(false)

  useEffect(() => {
    fetch('/api/research/fetch-papers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skillNodeId, topicName }),
    }).then(r => r.json()).then(d => {
      if (d.papers) { setPapers(d.papers); setCached(d.cached) }
      else showToast('info', 'No papers found')
      setLoading(false)
    }).catch(() => { showToast('info', 'Failed to fetch papers'); setLoading(false) })
  }, [skillNodeId, topicName]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex flex-col items-center gap-2 py-6"><Loader2 size={22} className="animate-spin text-purple-500" /><span className="text-xs text-gray-500">Finding papers…</span></div>

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {papers.map((p, i) => (
          <div key={p.id ?? i} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-purple-300 hover:text-purple-200 flex items-start gap-1">
              <ExternalLink size={10} className="shrink-0 mt-0.5" /> {p.title}
            </a>
            <div className="text-[10px] text-gray-500 mt-0.5">{p.authors} · {p.year} · <span className="uppercase">{p.source}</span></div>
            <p className="text-[11px] text-gray-400 mt-1">{p.summary}</p>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-gray-600 text-center">{papers.length} papers found{cached ? ' (cached)' : ', cached for 6 months'}</div>
      <button onClick={back} className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back to tools</button>
    </div>
  )
}

// ── Socratic mode ─────────────────────────────────────────────────────────────
function SocraticMode({ skillNodeId, topicName, onMasteryUpdated, back }: { skillNodeId: string; topicName: string; onMasteryUpdated: (ml: number) => void; back: () => void }) {
  const { showToast } = useToast()
  const [turns, setTurns] = useState<{ role: 'user' | 'claude'; text: string }[]>([])
  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState<{ score: number; insights: string; gaps: string; nextStepRecommendation: string } | null>(null)

  async function next(newTurns: { role: 'user' | 'claude'; text: string }[]) {
    setLoading(true)
    try {
      const res = await fetch('/api/socratic/respond', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicName, turns: newTurns }),
      })
      const data = await res.json()
      setTurns([...newTurns, { role: 'claude', text: data.question }])
    } catch { showToast('info', 'Failed') }
    finally { setLoading(false) }
  }

  async function begin() { setStarted(true); await next([]) }

  async function send() {
    if (!input.trim()) return
    const nt = [...turns, { role: 'user' as const, text: input }]
    setTurns(nt); setInput(''); await next(nt)
  }

  async function end() {
    setLoading(true)
    try {
      const res = await fetch('/api/socratic/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, turns }),
      })
      const data = await res.json()
      setScore(data)
      if (data.newMasteryLevel != null) { onMasteryUpdated(data.newMasteryLevel); showToast('info', `Mastery → ${data.newMasteryLevel}★`) }
    } catch { showToast('info', 'Scoring failed') }
    finally { setLoading(false) }
  }

  if (score) {
    return (
      <div className="space-y-3">
        <div className="text-center py-2 bg-gray-800/60 rounded-xl">
          <div className={`text-2xl font-black ${score.score >= 70 ? 'text-green-400' : 'text-gray-300'}`}>{score.score}/100</div>
        </div>
        <div className="text-xs"><span className="text-green-400 font-semibold">Insights:</span> <span className="text-gray-400">{score.insights}</span></div>
        <div className="text-xs"><span className="text-yellow-400 font-semibold">Gaps:</span> <span className="text-gray-400">{score.gaps}</span></div>
        <div className="text-xs"><span className="text-purple-400 font-semibold">Next:</span> <span className="text-gray-400">{score.nextStepRecommendation}</span></div>
        <button onClick={back} className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back to tools</button>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">A Socratic tutor will guide you to understanding {topicName} through questions — not answers.</p>
        <div className="flex gap-2">
          <button onClick={back} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Cancel</button>
          <button onClick={begin} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg">
            {loading ? <Loader2 size={12} className="animate-spin" /> : null} Begin session
          </button>
        </div>
      </div>
    )
  }

  const userTurns = turns.filter(t => t.role === 'user').length
  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className={`text-xs rounded-lg px-2.5 py-2 ${t.role === 'user' ? 'bg-purple-900/40 text-purple-100 ml-4' : 'bg-gray-800/60 text-gray-300 mr-4'}`}>{t.text}</div>
        ))}
        {loading && <Loader2 size={14} className="animate-spin text-gray-500 mx-auto" />}
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)} rows={2} placeholder="Your answer…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 resize-none focus:outline-none focus:border-purple-600" />
      <div className="flex gap-2">
        <button onClick={send} disabled={!input.trim() || loading} className="flex-1 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg">Respond</button>
        <button onClick={end} disabled={loading || userTurns < 3} className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg">End session</button>
      </div>
    </div>
  )
}

// ── Textbook mode ─────────────────────────────────────────────────────────────
function TextbookMode({ skillNodeId, topicName, currentMastery, back }: { skillNodeId: string; topicName: string; currentMastery: number; back: () => void }) {
  const { showToast } = useToast()
  const [level, setLevel] = useState(Math.round(currentMastery))
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/textbook/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillNodeId, topicName, level }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContent(data.chapter.content)
    } catch { showToast('info', 'Generation failed') }
    finally { setLoading(false) }
  }

  function download() {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${topicName.replace(/\s+/g, '_')}.md`; a.click()
    URL.revokeObjectURL(url)
  }

  if (content) {
    return (
      <div className="space-y-3">
        <div className="max-h-72 overflow-y-auto text-xs text-gray-300 bg-gray-800/40 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{content}</div>
        <div className="flex gap-2">
          <button onClick={download} className="flex-1 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 text-white rounded-lg">Download (.md)</button>
          <button onClick={back} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Generate a personalized textbook chapter on {topicName} for your level.</p>
      <div>
        <label className="text-[10px] text-gray-500">Level: {level} {level <= 1 ? '(fundamentals)' : level >= 5 ? '(research)' : level >= 3 ? '(proofs & depth)' : '(intermediate)'}</label>
        <input type="range" min={0} max={5} step={1} value={level} onChange={e => setLevel(parseInt(e.target.value))} className="w-full accent-purple-600" />
      </div>
      <div className="flex gap-2">
        <button onClick={back} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700">Cancel</button>
        <button onClick={generate} disabled={loading} className="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded-lg">
          {loading ? <><Loader2 size={12} className="animate-spin" /> Writing chapter…</> : 'Generate chapter'}
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function LearningToolsPanel({ skillNodeId, topicName, subject, currentMastery, onMasteryUpdated }: Props) {
  const [tool, setTool] = useState<Tool>('menu')
  const back = () => setTool('menu')

  if (tool === 'teach')    return <TeachMode skillNodeId={skillNodeId} topicName={topicName} onMasteryUpdated={onMasteryUpdated} back={back} />
  if (tool === 'debate')   return <DebateMode skillNodeId={skillNodeId} topicName={topicName} mastery={currentMastery} onMasteryUpdated={onMasteryUpdated} back={back} />
  if (tool === 'research') return <ResearchMode skillNodeId={skillNodeId} topicName={topicName} back={back} />
  if (tool === 'socratic') return <SocraticMode skillNodeId={skillNodeId} topicName={topicName} onMasteryUpdated={onMasteryUpdated} back={back} />
  if (tool === 'textbook') return <TextbookMode skillNodeId={skillNodeId} topicName={topicName} currentMastery={currentMastery} back={back} />

  const tools: { id: Tool; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'teach',    label: 'Teach',    icon: <GraduationCap size={14} />, desc: 'Explain it back (+1.0★)' },
    { id: 'debate',   label: 'Debate',   icon: <Swords size={14} />,        desc: 'Defend a claim (+0.5★)' },
    { id: 'socratic', label: 'Socratic', icon: <MessagesSquare size={14} />,desc: 'Guided questions (+1.0★)' },
    { id: 'textbook', label: 'Chapter',  icon: <BookText size={14} />,      desc: 'Generate a textbook chapter' },
    { id: 'research', label: 'Research', icon: <FileSearch size={14} />,    desc: 'Find papers' },
  ]
  void subject

  return (
    <div className="grid grid-cols-1 gap-2">
      {tools.map(t => (
        <button key={t.id} onClick={() => setTool(t.id)}
          className="flex items-center gap-2.5 px-3 py-2 bg-gray-800/60 hover:bg-gray-700/60 border border-gray-700 rounded-lg text-left transition-colors">
          <span className="text-purple-400 shrink-0">{t.icon}</span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-200">{t.label}</div>
            <div className="text-[10px] text-gray-500">{t.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
