'use client'
import { useEffect, useState, useCallback } from 'react'
import { Loader2, Brain, Target, BatteryCharging, HeartPulse, BookOpen, Flame, Apple, Sparkles, Plus, X, ChevronDown, ChevronRight, Moon, Utensils, Dumbbell } from 'lucide-react'

// ── Static, informational ability content ─────────────────────────────────────
type AbilityDef = {
  key: string
  title: string; icon: React.ReactNode; info: string; why: string
  tips: string[]; habits: string; avoid: string[]
}

const ABILITIES: AbilityDef[] = [
  {
    key: 'neuro',
    title: 'Neuroplasticity', icon: <Brain size={16} className="text-orange-400" />,
    info: "Neuroplasticity is your brain's ability to form and reorganize neural connections. Strong plasticity lets you learn faster and recover from setbacks.",
    why: 'Each time you struggle with something new, you trigger synaptic growth. Sleep and exercise then physically consolidate those connections — learning is a build-and-cement cycle.',
    tips: ['Challenge yourself with novel topics — difficulty drives growth', 'Learn the same idea multiple ways (read, watch, do, teach)', 'Embrace mistakes — error-correction is when wiring strengthens', 'Sleep 7-9 hours for memory consolidation', 'Exercise boosts BDNF (brain-derived neurotrophic factor)', 'Meditation measurably increases gray matter', 'Space practice over days rather than cramming'],
    habits: 'Weekly: try a genuinely new topic | Daily: 20-min meditation | 3x/week: 30-min exercise',
    avoid: ['Multitasking during study (kills consolidation)', 'All-nighters (block sleep consolidation)', 'Passive re-reading (low retention)', 'Staying in your comfort zone (no plasticity without challenge)', 'Chronic stress without recovery (burns out plasticity)'],
  },
  {
    key: 'focus',
    title: 'Focus & Deep Work', icon: <Target size={16} className="text-blue-400" />,
    info: 'Deep, undistracted focus is what turns study time into actual learning. Protect it ruthlessly.',
    why: 'It takes 15-25 minutes to fully re-enter deep focus after an interruption. A single phone check can quietly cost you half an hour of real work.',
    tips: ['Pomodoro: 25 min focus + 5 min break (or 50/10 for deep tasks)', 'Phone in another room, notifications off', 'Batch similar tasks to avoid context-switching', 'A consistent, quiet environment cues your brain to focus', 'Time caffeine ~30 min into a session, not before', 'Start with the hardest task while willpower is fresh', 'Define one clear outcome before you begin'],
    habits: 'Daily: 2-4 focused blocks | Weekly: schedule distraction-free deep-work time | Monthly: audit app/phone usage',
    avoid: ['Context switching (15-25 min refocus cost each time)', 'Social media during study', 'Dozens of open browser tabs', 'Noisy environments', 'Studying on a bed/couch (keep a dedicated work spot)'],
  },
  {
    key: 'recovery',
    title: 'Recovery & Rest', icon: <BatteryCharging size={16} className="text-green-400" />,
    info: "Recovery isn't laziness — it's when your brain consolidates everything you studied. Treat rest as part of the work.",
    why: 'Memories move from short-term to long-term storage largely during deep sleep and downtime. Skip recovery and you literally fail to keep what you learned.',
    tips: ['Sleep 7-9 hours, aligned to 90-min cycles', 'Take 1-2 full rest days per week', 'Exercise 3-5x/week (mix aerobic + strength)', 'Eat protein, omega-3s, and antioxidants', 'Sunlight early in the day sets your circadian rhythm', 'Short naps (10-20 min) restore focus', 'Stretch / light movement on rest days'],
    habits: 'Bedtime: consistent schedule | Weekly: 1 true rest day | Daily: 30 min movement | Weekly: meal prep',
    avoid: ['All-nighters', 'Studying every single day with no recovery', 'Excessive caffeine (disrupts sleep depth)', 'A sedentary lifestyle', 'Heavy/processed food right before sleep'],
  },
  {
    key: 'mental',
    title: 'Mental Health & Stress', icon: <HeartPulse size={16} className="text-red-400" />,
    info: 'Chronic stress shrinks memory capacity and impairs learning. Managing it is a study skill, not a distraction from one.',
    why: 'Cortisol from prolonged stress damages the hippocampus — the brain region central to forming new memories. Calm is a precondition for learning, not a luxury.',
    tips: ['Box / 4-7-8 breathing to down-regulate quickly', 'Journal to offload looping thoughts', 'Mindfulness meditation builds stress tolerance', 'Stay socially connected (study groups, friends)', 'Seek therapy or counseling when you need it', 'Time in nature lowers cortisol', 'Daily gratitude shifts baseline mood'],
    habits: 'Daily: 5-min breathing | Journaling 3x/week | Weekly: real social time | Monthly: mental-health check-in',
    avoid: ['Isolating yourself', 'Bottling up emotions', 'Comparing your progress to others', 'Chronically overcommitting', 'Perfectionism (done beats perfect)'],
  },
  {
    key: 'sleep',
    title: 'Sleep & Consolidation', icon: <Moon size={16} className="text-indigo-400" />,
    info: 'Sleep is the single highest-leverage thing you can do for learning — it is when knowledge is filed and skills are rehearsed.',
    why: 'Deep (slow-wave) sleep consolidates facts; REM sleep integrates and connects ideas. A night of good sleep after studying can improve recall by 20-40%.',
    tips: ['Keep a fixed wake time, even on weekends', 'No screens 30-60 min before bed (blue light delays melatonin)', 'Cool, dark, quiet room', 'Study or review right before sleep for better retention', "Avoid caffeine after ~2pm", 'Get morning sunlight to anchor your rhythm'],
    habits: 'Daily: same wake time | Nightly: wind-down routine | Pre-sleep: light review of the day’s material',
    avoid: ['Irregular sleep/wake times', 'Late caffeine or alcohol', 'Doomscrolling in bed', 'Sacrificing sleep to cram (it backfires)'],
  },
  {
    key: 'nutrition',
    title: 'Nutrition & Brain Fuel', icon: <Utensils size={16} className="text-amber-400" />,
    info: 'Your brain burns ~20% of your energy. What you eat directly affects focus, mood, and memory.',
    why: 'Stable blood sugar means stable attention. Omega-3s build neuron membranes; hydration and micronutrients keep signaling sharp.',
    tips: ['Protein + fiber meals for steady energy (avoid sugar spikes/crashes)', 'Omega-3s (fish, walnuts, flax) support neuron health', 'Stay hydrated — even mild dehydration hurts focus', 'Leafy greens & berries (antioxidants) protect the brain', 'Don’t study hungry or overly full', 'Limit ultra-processed food and excess sugar'],
    habits: 'Daily: protein at each meal, water on the desk | Weekly: meal prep | Limit: sugary snacks while studying',
    avoid: ['Sugary energy drinks (crash follows the spike)', 'Skipping meals then over-eating', 'Studying while very hungry', 'Relying on caffeine instead of food/sleep'],
  },
]

type Book = { title: string; author?: string; progress: number; notes?: string }
type Habit = { name: string; streak: number }
type Goals = { books: Book[]; disciplineHabits: Habit[]; healthHabits: string[]; spiritualGrowth: string[] }

// Info-only card (no self-rating)
function AbilityCard({ def }: { def: AbilityDef }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{def.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-100">{def.title}</h3>
          <p className="text-xs text-gray-400 mt-1">{def.info}</p>
          <p className="text-xs text-gray-500 mt-2 italic">{def.why}</p>
          <button onClick={() => setOpen(o => !o)} className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Tips, habits & what to avoid
          </button>
          {open && (
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <div className="text-[10px] font-semibold text-green-400 uppercase mb-1">Tips</div>
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
  const [goals, setGoals] = useState<Goals>({ books: [], disciplineHabits: [], healthHabits: [], spiritualGrowth: [] })
  const [newBook, setNewBook] = useState({ title: '', author: '' })
  const [newHabit, setNewHabit] = useState('')
  const [newHealth, setNewHealth] = useState('')
  const [newPersonal, setNewPersonal] = useState('')

  useEffect(() => {
    fetch('/api/self-improvement').then(r => r.json())
      .then(g => {
        if (g.goals) setGoals({ books: g.goals.books ?? [], disciplineHabits: g.goals.disciplineHabits ?? [], healthHabits: g.goals.healthHabits ?? [], spiritualGrowth: g.goals.spiritualGrowth ?? [] })
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [])

  const saveGoals = useCallback(async (next: Goals) => {
    setGoals(next)
    await fetch('/api/self-improvement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  }, [])

  if (loading) return <div className="flex justify-center py-24"><Loader2 size={28} className="animate-spin text-orange-500" /></div>

  const booksRead = goals.books.filter(b => b.progress >= 100).length

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Learning Ability</h1>
        <p className="text-sm text-gray-500 mt-0.5">The conditions that make learning stick — and the goals you&apos;re building toward.</p>
      </div>

      {/* Section 1 — informational */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">How Your Brain Learns Best</h2>
        <div className="card p-5 border-orange-700/40">
          <h3 className="font-semibold text-gray-200 mb-1 flex items-center gap-2"><Sparkles size={15} className="text-orange-400" /> The system in one line</h3>
          <p className="text-sm text-gray-400">Challenge your brain (neuroplasticity) → with deep focus → then recover (sleep, rest, nutrition) → while keeping stress low. Skip any link and learning leaks out. A well-rested, low-stress brain can learn ~30% faster.</p>
        </div>
        {ABILITIES.map(def => <AbilityCard key={def.key} def={def} />)}
      </section>

      {/* Section 2 — self-improvement (interactive, unchanged) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Self-Improvement Goals</h2>

        {/* Books */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-200 mb-3 flex items-center gap-2"><BookOpen size={15} className="text-orange-400" /> Books</h3>
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
                    className="flex-1 accent-orange-600" />
                  <span className="text-xs text-orange-300 w-10 text-right">{b.progress}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newBook.title} onChange={e => setNewBook(b => ({ ...b, title: e.target.value }))} placeholder="Title"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-orange-600" />
            <input value={newBook.author} onChange={e => setNewBook(b => ({ ...b, author: e.target.value }))} placeholder="Author"
              className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-orange-600" />
            <button onClick={() => { if (!newBook.title.trim()) return; saveGoals({ ...goals, books: [...goals.books, { title: newBook.title, author: newBook.author, progress: 0 }] }); setNewBook({ title: '', author: '' }) }}
              className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded-lg"><Plus size={13} /></button>
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
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-orange-600" />
            <button onClick={() => { if (!newHabit.trim()) return; saveGoals({ ...goals, disciplineHabits: [...goals.disciplineHabits, { name: newHabit, streak: 0 }] }); setNewHabit('') }}
              className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded-lg"><Plus size={13} /></button>
          </div>
        </div>

        {/* Health & Personal — simple lists */}
        {([
          { title: 'Health Habits', icon: <Apple size={15} className="text-green-400" />, items: goals.healthHabits, val: newHealth, setVal: setNewHealth, key: 'healthHabits' as const, placeholder: 'e.g. 5 servings of vegetables daily' },
          { title: 'Personal Growth', icon: <Dumbbell size={15} className="text-indigo-400" />, items: goals.spiritualGrowth, val: newPersonal, setVal: setNewPersonal, key: 'spiritualGrowth' as const, placeholder: 'e.g. Daily meditation, journaling, a new skill' },
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
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-orange-600" />
              <button onClick={() => { if (!sec.val.trim()) return; saveGoals({ ...goals, [sec.key]: [...sec.items, sec.val] }); sec.setVal('') }}
                className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded-lg"><Plus size={13} /></button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
