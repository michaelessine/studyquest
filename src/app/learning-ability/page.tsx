'use client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Brain, Target, BatteryCharging, HeartPulse, BookOpen, Flame, Apple, Sparkles, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'

// ── Static ability content ────────────────────────────────────────────────────
type ScoreField = 'neuroplasticityScore' | 'focusScore' | 'recoveryScore' | 'mentalHealthScore'
type AbilityDef = {
  key: 'neuro' | 'focus' | 'recovery' | 'mental'
  scoreField: ScoreField
  title: string; icon: React.ReactNode; info: string
  tips: string[]; habits: string; avoid: string[]
}

const ABILITIES: AbilityDef[] = [
  {
    key: 'neuro', scoreField: 'neuroplasticityScore',
    title: 'Neuroplasticity', icon: <Brain size={16} className="text-purple-400" />,
    info: "Neuroplasticity is your brain's ability to form new connections. Strong neuroplasticity lets you learn faster and recover from setbacks.",
    tips: ['Challenge yourself with novel topics', 'Learn multiple ways (multimodal)', 'Embrace mistakes as learning', 'Sleep 7-9 hours for consolidation', 'Exercise boosts BDNF (brain-derived neurotrophic factor)', 'Meditation increases gray matter'],
    habits: 'Weekly: try a new topic | Daily: 20-min meditation | 3x/week: 30-min exercise',
    avoid: ['Multitasking during study (kills consolidation)', 'All-nighters (prevents sleep consolidation)', 'Passive re-reading (low retention)', 'Comfort zone only (no neuroplasticity)', 'Stress without recovery (burns out plasticity)'],
  },
  {
    key: 'focus', scoreField: 'focusScore',
    title: 'Focus', icon: <Target size={16} className="text-blue-400" />,
    info: 'Deep focus enables high-quality learning. Protect your focus from distractions.',
    tips: ['Pomodoro technique (25 min focus + 5 min break)', 'Eliminate notifications and phone', 'Task batching (group similar work)', 'Environment matters (quiet, comfortable)', 'Caffeine timing (after 30 mins into session)', 'Start with hardest task first'],
    habits: 'Daily: 2-4 focused sessions | Weekly: block distraction-free time | Monthly: audit phone/app usage',
    avoid: ['Context switching (costs 15-25 min to refocus)', 'Social media during study', 'Open browser tabs', 'Studying in noisy environments', 'Studying on bed/couch (associate desk with work)'],
  },
  {
    key: 'recovery', scoreField: 'recoveryScore',
    title: 'Recovery', icon: <BatteryCharging size={16} className="text-green-400" />,
    info: "Recovery isn't laziness—it's when your brain consolidates learning. Prioritize sleep, rest days, and exercise.",
    tips: ['Sleep 7-9 hours (90-min sleep cycles)', 'Take 1-2 rest days per week', 'Exercise 3-5x/week (aerobic + strength)', 'Nutrition (protein, omega-3s, antioxidants)', 'Cold exposure can boost recovery', 'Massage and stretching'],
    habits: 'Bedtime: consistent sleep schedule | Weekly: 1 rest day | Daily: 30 min movement | Weekly: meal prep',
    avoid: ['All-nighters', 'Studying every day (no recovery)', 'Excessive caffeine (disrupts sleep)', 'Sedentary lifestyle', 'Eating processed food before sleep'],
  },
  {
    key: 'mental', scoreField: 'mentalHealthScore',
    title: 'Mental Health & Stress', icon: <HeartPulse size={16} className="text-red-400" />,
    info: 'Chronic stress impairs learning and memory. Manage stress proactively.',
    tips: ['Deep breathing (4-7-8 technique)', 'Journaling daily', 'Mindfulness meditation', 'Social connection (study groups)', 'Therapy or counseling if needed', 'Nature time', 'Gratitude practice'],
    habits: 'Daily: 5-min breathing | Journaling 3x/week | Weekly: social time | Monthly: therapy check-in',
    avoid: ['Isolating yourself', 'Bottling emotions', 'Comparing yourself to others', 'Overshooting deadlines', 'Perfectionism'],
  },
]

type Ability = { neuroplasticityScore: number; focusScore: number; recoveryScore: number; mentalHealthScore: number; stressLevel: number }
type Book = { title: string; author?: string; progress: number; notes?: string }
type Habit = { name: string; streak: number }
type Goals = { books: Book[]; disciplineHabits: Habit[]; healthHabits: string[]; spiritualGrowth: string[] }

function AbilityCard({ def, score, onChange }: { def: AbilityDef; score: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{def.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-100">{def.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{def.info}</p>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Self-rating</span><span className="text-purple-300 font-semibold">{score}/10</span>
            </div>
            <input type="range" min={1} max={10} value={score} onChange={e => onChange(parseInt(e.target.value))} className="w-full accent-purple-600" />
          </div>
          <button onClick={() => setOpen(o => !o)} className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Tips, habits & what to avoid
          </button>
          {open && (
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <div className="text-[10px] font-semibold text-green-400 uppercase mb-1">Tips to improve</div>
                <ul className="list-disc list-inside text-gray-400 space-y-0.5">{def.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-blue-400 uppercase mb-1">Habits to build</div>
                <p className="text-gray-400">{def.habits}</p>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-red-400 uppercase mb-1">What to avoid</div>
                <ul className="list-disc list-inside text-gray-400 space-y-0.5">{def.avoid.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
              {def.key === 'mental' && (
                <div className="text-gray-500 border-t border-gray-800 pt-2">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Crisis resources</div>
                  <p>If you&apos;re struggling: contact a crisis line (e.g. 988 in the US), try Headspace / Calm, or reach your university counseling service.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LearningAbilityPage() {
  const [loading, setLoading] = useState(true)
  const [ability, setAbility] = useState<Ability>({ neuroplasticityScore: 5, focusScore: 5, recoveryScore: 5, mentalHealthScore: 5, stressLevel: 5 })
  const [goals, setGoals] = useState<Goals>({ books: [], disciplineHabits: [], healthHabits: [], spiritualGrowth: [] })
  const [newBook, setNewBook] = useState({ title: '', author: '' })
  const [newHabit, setNewHabit] = useState('')
  const [newHealth, setNewHealth] = useState('')
  const [newSpiritual, setNewSpiritual] = useState('')

  useEffect(() => {
    Promise.all([fetch('/api/learning-ability').then(r => r.json()), fetch('/api/self-improvement').then(r => r.json())])
      .then(([a, g]) => {
        if (a.ability) setAbility({ neuroplasticityScore: a.ability.neuroplasticityScore, focusScore: a.ability.focusScore, recoveryScore: a.ability.recoveryScore, mentalHealthScore: a.ability.mentalHealthScore, stressLevel: a.ability.stressLevel })
        if (g.goals) setGoals({ books: g.goals.books ?? [], disciplineHabits: g.goals.disciplineHabits ?? [], healthHabits: g.goals.healthHabits ?? [], spiritualGrowth: g.goals.spiritualGrowth ?? [] })
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  const saveAbility = useCallback(async (next: Ability) => {
    await fetch('/api/learning-ability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  }, [])

  function setScore(field: AbilityDef['scoreField'], v: number) {
    const next = { ...ability, [field]: v }
    setAbility(next); saveAbility(next)
  }

  const saveGoals = useCallback(async (next: Goals) => {
    setGoals(next)
    await fetch('/api/self-improvement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  }, [])

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-purple-500" /></div>

  // Overall recommendation
  const { focusScore, recoveryScore, mentalHealthScore } = ability
  let recommendation = "You're balanced — keep a steady rhythm of focused work and real recovery."
  if (focusScore - recoveryScore >= 3) recommendation = `Your focus is ${focusScore}/10 but recovery is ${recoveryScore}/10. You're burning out. Add 1-2 rest days and improve sleep to consolidate what you're learning. A well-rested brain learns 30% faster.`
  else if (mentalHealthScore <= 4) recommendation = `Your mental health rating is ${mentalHealthScore}/10. Stress impairs memory — prioritize breathing, journaling, and social connection before pushing harder on study.`
  else if (recoveryScore <= 4) recommendation = `Recovery is low (${recoveryScore}/10). Sleep and rest days are when learning consolidates — protect them.`

  const booksRead = goals.books.filter(b => b.progress >= 100).length

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Learning Ability</h1>
        <p className="text-sm text-gray-500 mt-0.5">Rate yourself weekly. Optimize the conditions that make learning stick.</p>
      </div>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Learning Ability</h2>
        {ABILITIES.map(def => (
          <AbilityCard key={def.key} def={def} score={ability[def.scoreField]} onChange={v => setScore(def.scoreField, v)} />
        ))}
        <div className="card p-5 border-purple-700/40">
          <h3 className="font-semibold text-gray-200 mb-1 flex items-center gap-2"><Sparkles size={15} className="text-purple-400" /> Neuroplasticity System</h3>
          <p className="text-sm text-gray-400">{recommendation}</p>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Self-Improvement Goals</h2>

        {/* Books */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><BookOpen size={15} className="text-purple-400" /> Books</h3>
          {goals.books.length > 0 && <p className="text-xs text-gray-500 mb-3">You&apos;ve read {booksRead} of {goals.books.length} planned books. Keep going!</p>}
          <div className="space-y-2 mb-3">
            {goals.books.map((b, i) => (
              <div key={i} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><span className="text-sm text-gray-200">{b.title}</span>{b.author && <span className="text-xs text-gray-500 ml-2">{b.author}</span>}</div>
                  <button onClick={() => saveGoals({ ...goals, books: goals.books.filter((_, j) => j !== i) })} className="text-gray-600 hover:text-red-400"><X size={13} /></button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input type="range" min={0} max={100} step={5} value={b.progress}
                    onChange={e => { const books = [...goals.books]; books[i] = { ...b, progress: parseInt(e.target.value) }; saveGoals({ ...goals, books }) }}
                    className="flex-1 accent-purple-600" />
                  <span className="text-xs text-purple-300 w-10 text-right">{b.progress}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newBook.title} onChange={e => setNewBook(b => ({ ...b, title: e.target.value }))} placeholder="Title"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-600" />
            <input value={newBook.author} onChange={e => setNewBook(b => ({ ...b, author: e.target.value }))} placeholder="Author"
              className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-600" />
            <button onClick={() => { if (!newBook.title.trim()) return; saveGoals({ ...goals, books: [...goals.books, { title: newBook.title, author: newBook.author, progress: 0 }] }); setNewBook({ title: '', author: '' }) }}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg"><Plus size={13} /></button>
          </div>
        </div>

        {/* Discipline */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><Flame size={15} className="text-orange-400" /> Discipline</h3>
          <div className="space-y-2 mb-3">
            {goals.disciplineHabits.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-200">{h.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-400 font-semibold">{h.streak}-day streak 🔥</span>
                  <button onClick={() => { const hs = [...goals.disciplineHabits]; hs[i] = { ...h, streak: h.streak + 1 }; saveGoals({ ...goals, disciplineHabits: hs }) }}
                    className="text-[10px] px-2 py-0.5 bg-orange-900/40 border border-orange-800/50 text-orange-300 rounded">+1 day</button>
                  <button onClick={() => saveGoals({ ...goals, disciplineHabits: goals.disciplineHabits.filter((_, j) => j !== i) })} className="text-gray-600 hover:text-red-400"><X size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newHabit} onChange={e => setNewHabit(e.target.value)} placeholder="e.g. Cold showers, no phone before 9am"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-600" />
            <button onClick={() => { if (!newHabit.trim()) return; saveGoals({ ...goals, disciplineHabits: [...goals.disciplineHabits, { name: newHabit, streak: 0 }] }); setNewHabit('') }}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg"><Plus size={13} /></button>
          </div>
        </div>

        {/* Health & Spiritual — simple lists */}
        {([
          { title: 'Health Habits', icon: <Apple size={15} className="text-green-400" />, items: goals.healthHabits, val: newHealth, setVal: setNewHealth, key: 'healthHabits' as const, placeholder: 'e.g. 5 servings of vegetables daily' },
          { title: 'Spiritual Growth', icon: <Sparkles size={15} className="text-indigo-400" />, items: goals.spiritualGrowth, val: newSpiritual, setVal: setNewSpiritual, key: 'spiritualGrowth' as const, placeholder: 'e.g. Daily meditation, journaling' },
        ]).map(sec => (
          <div key={sec.key} className="card p-5">
            <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2">{sec.icon} {sec.title}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {sec.items.map((it, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-300">
                  {it}
                  <button onClick={() => saveGoals({ ...goals, [sec.key]: sec.items.filter((_, j) => j !== i) })} className="text-gray-600 hover:text-red-400"><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={sec.val} onChange={e => sec.setVal(e.target.value)} placeholder={sec.placeholder}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-600" />
              <button onClick={() => { if (!sec.val.trim()) return; saveGoals({ ...goals, [sec.key]: [...sec.items, sec.val] }); sec.setVal('') }}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg"><Plus size={13} /></button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
