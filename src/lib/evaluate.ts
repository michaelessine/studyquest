// Performance evaluation — pure, deterministic computation (zero API cost).
import { SUBJECTS, Subject } from './xp'

export type EvalNode = { id: string; name: string; subject: string; masteryLevel: number; nextReviewAt: string | null }
export type EvalEvent = { skillNodeId: string; eventType: string; score: number; masteryGain: number; timestamp: string }
export type EvalSession = { skillNodeId: string | null; durationMins: number }

const DAY = 86_400_000

export interface Evaluation {
  velocity: {
    weekly: { week: string; stars: number }[]          // last 12 weeks, overall
    overallPerWeek: number                              // avg stars/week last 8 weeks
    bySubject: { subject: string; recent: number; prior: number; trend: 'up' | 'flat' | 'down' }[]
  }
  decayQueue: { id: string; name: string; subject: string; masteryLevel: number; overdueDays: number; risk: number }[]
  efficiency: {
    topics: { id: string; name: string; subject: string; hours: number; gain: number; starsPerHour: number }[]
    bySubject: { subject: string; hours: number; gain: number; starsPerHour: number }[]
    hasData: boolean
  }
  calibration: { subject: string; selfPct: number; testedPct: number; bias: number; label: string }[]
}

export function computeEvaluation(nodes: EvalNode[], events: EvalEvent[], sessions: EvalSession[]): Evaluation {
  const now = Date.now()
  const subjOf = new Map(nodes.map(n => [n.id, n.subject]))
  const nameOf = new Map(nodes.map(n => [n.id, n.name]))

  // ── Velocity ────────────────────────────────────────────────────────────────
  const weekly: { week: string; stars: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY
    const end = now - i * 7 * DAY
    const stars = events
      .filter(e => { const t = new Date(e.timestamp).getTime(); return t >= start && t < end })
      .reduce((s, e) => s + e.masteryGain, 0)
    const d = new Date(end)
    weekly.push({ week: `${d.getMonth() + 1}/${d.getDate()}`, stars: Math.round(stars * 4) / 4 })
  }
  const last8 = weekly.slice(-8).reduce((s, w) => s + w.stars, 0)
  const overallPerWeek = Math.round((last8 / 8) * 100) / 100

  const recentCut = now - 28 * DAY
  const priorCut = now - 56 * DAY
  const bySubject = SUBJECTS.map(subject => {
    const evs = events.filter(e => subjOf.get(e.skillNodeId) === subject)
    const recent = evs.filter(e => new Date(e.timestamp).getTime() >= recentCut).reduce((s, e) => s + e.masteryGain, 0)
    const prior = evs.filter(e => { const t = new Date(e.timestamp).getTime(); return t >= priorCut && t < recentCut }).reduce((s, e) => s + e.masteryGain, 0)
    const trend: 'up' | 'flat' | 'down' = recent > prior * 1.15 ? 'up' : recent < prior * 0.85 ? 'down' : 'flat'
    return { subject, recent: Math.round(recent * 4) / 4, prior: Math.round(prior * 4) / 4, trend }
  }).filter(s => s.recent > 0 || s.prior > 0)

  // ── Knowledge-decay queue ───────────────────────────────────────────────────
  const decayQueue = nodes
    .filter(n => n.nextReviewAt && new Date(n.nextReviewAt).getTime() <= now && n.masteryLevel > 0)
    .map(n => {
      const overdueDays = Math.max(0, Math.floor((now - new Date(n.nextReviewAt!).getTime()) / DAY))
      return { id: n.id, name: n.name, subject: n.subject, masteryLevel: n.masteryLevel, overdueDays, risk: Math.round(overdueDays * n.masteryLevel) }
    })
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 12)

  // ── Time-vs-gain efficiency ─────────────────────────────────────────────────
  const minsByNode = new Map<string, number>()
  for (const s of sessions) {
    if (!s.skillNodeId) continue
    minsByNode.set(s.skillNodeId, (minsByNode.get(s.skillNodeId) ?? 0) + s.durationMins)
  }
  const gainByNode = new Map<string, number>()
  for (const e of events) gainByNode.set(e.skillNodeId, (gainByNode.get(e.skillNodeId) ?? 0) + e.masteryGain)

  const topics = Array.from(minsByNode.entries())
    .filter(([, mins]) => mins > 0)
    .map(([id, mins]) => {
      const hours = Math.round((mins / 60) * 10) / 10
      const gain = Math.round((gainByNode.get(id) ?? 0) * 4) / 4
      return { id, name: nameOf.get(id) ?? id, subject: subjOf.get(id) ?? '', hours, gain, starsPerHour: hours > 0 ? Math.round((gain / hours) * 100) / 100 : 0 }
    })
    .filter(t => t.gain > 0)
    .sort((a, b) => b.starsPerHour - a.starsPerHour)

  const subjAgg = new Map<string, { hours: number; gain: number }>()
  for (const t of topics) {
    const cur = subjAgg.get(t.subject) ?? { hours: 0, gain: 0 }
    cur.hours += t.hours; cur.gain += t.gain; subjAgg.set(t.subject, cur)
  }
  const effBySubject = Array.from(subjAgg.entries()).map(([subject, v]) => ({
    subject, hours: Math.round(v.hours * 10) / 10, gain: Math.round(v.gain * 4) / 4,
    starsPerHour: v.hours > 0 ? Math.round((v.gain / v.hours) * 100) / 100 : 0,
  })).sort((a, b) => b.starsPerHour - a.starsPerHour)

  // ── Self-rating calibration ─────────────────────────────────────────────────
  const calibration = SUBJECTS.map(subject => {
    const subjNodes = nodes.filter(n => n.subject === subject && n.masteryLevel > 0)
    const selfPct = subjNodes.length ? Math.round((subjNodes.reduce((s, n) => s + n.masteryLevel, 0) / subjNodes.length / 5) * 100) : 0
    const tests = events.filter(e => subjOf.get(e.skillNodeId) === subject && ['quiz', 'real_exam', 'exercise'].includes(e.eventType))
    const testedPct = tests.length ? Math.round(tests.reduce((s, e) => s + e.score, 0) / tests.length) : 0
    const bias = selfPct - testedPct
    const label = tests.length === 0 ? 'no test data'
      : bias > 12 ? 'overrating' : bias < -12 ? 'underrating' : 'well-calibrated'
    return { subject, selfPct, testedPct, bias, label }
  }).filter(c => c.selfPct > 0 || c.testedPct > 0)

  return {
    velocity: { weekly, overallPerWeek, bySubject },
    decayQueue,
    efficiency: { topics: topics.slice(0, 10), bySubject: effBySubject, hasData: topics.length > 0 },
    calibration,
  }
}

export const SUBJECT_ORDER = SUBJECTS as readonly Subject[]
