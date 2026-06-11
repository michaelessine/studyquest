import prisma from './prisma'
import { cascadeUnlock } from './unlock'
import { getNextReviewDate, getReviewIntervalDays } from './spacedRepetition'

// PART 3 — strict, exam-driven mastery progression.
export type MasteryEventType = 'quiz' | 'exam' | 'real_exam' | 'exercise' | 'manual' | 'teach' | 'debate'

const SOFT_CAP = 4.0 // max reachable from quizzes/exercises/teach/debate alone

// ── Delta tables ──────────────────────────────────────────────────────────────
export function quizDelta(score: number): number {
  if (score >= 90) return 0.75
  if (score >= 80) return 0.5
  if (score >= 70) return 0.25
  return 0
}
export function exerciseDelta(pctSolved: number): number {
  if (pctSolved >= 100) return 1.0
  if (pctSolved >= 90)  return 0.75
  if (pctSolved >= 80)  return 0.5
  return 0
}
export function teachDebateDelta(score: number): number {
  if (score >= 90) return 1.0
  if (score >= 80) return 0.75
  if (score >= 70) return 0.5
  return 0
}

/** Map a university letter grade to a 0–100 score. */
export function gradeToScore(grade: string): number {
  const g = grade.trim().toUpperCase()
  const map: Record<string, number> = {
    'A+': 100, 'A': 95, 'A-': 91,
    'B+': 88, 'B': 83, 'B-': 80,
    'C+': 77, 'C': 73, 'C-': 70,
    'D': 63, 'F': 45,
  }
  return map[g] ?? 60
}

/** Round to the nearest 0.25 increment. */
function round25(n: number): number {
  return Math.round(n * 4) / 4
}

/**
 * Can this node reach 5.0?
 *   - a real_exam with grade A/A+ (score >= 90), OR
 *   - at least 3 sessions with 90%+ AND one real_exam with grade B+ or better (score >= 85)
 */
export async function qualifiesForFive(skillNodeId: string): Promise<boolean> {
  const events = await prisma.masteryEvent.findMany({ where: { skillNodeId }, select: { eventType: true, score: true } })
  const realExams = events.filter(e => e.eventType === 'real_exam')
  if (realExams.some(e => e.score >= 90)) return true
  const highSessions = events.filter(e => e.eventType !== 'real_exam' && e.score >= 90).length
  if (highSessions >= 3 && realExams.some(e => e.score >= 85)) return true
  return false
}

/**
 * Apply a mastery gain: records a MasteryEvent, enforces the 4.0 soft cap and
 * 5.0 qualification gate, updates the node, and cascades unlocks (>= 3.0).
 */
export async function applyMasteryGain(opts: {
  skillNodeId: string
  eventType: MasteryEventType
  score: number       // 0–100
  delta: number       // raw star gain before capping
}): Promise<{ newMasteryLevel: number; capped: boolean; gain: number }> {
  const node = await prisma.skillNode.findUnique({ where: { id: opts.skillNodeId }, select: { masteryLevel: true } })
  if (!node) return { newMasteryLevel: 0, capped: false, gain: 0 }

  // Always log the event (even zero-gain attempts, for history/qualification)
  await prisma.masteryEvent.create({
    data: { skillNodeId: opts.skillNodeId, eventType: opts.eventType, score: opts.score, masteryGain: opts.delta },
  })

  const current = node.masteryLevel
  let target = round25(Math.min(5, current + opts.delta))
  let capped = false

  // Gate the 4.0 → 5.0 climb behind real-exam qualification.
  if (target > SOFT_CAP) {
    const qualified = (opts.eventType === 'real_exam' && opts.score >= 90) || await qualifiesForFive(opts.skillNodeId)
    if (!qualified) {
      target = Math.max(current, SOFT_CAP) // cap at 4.0, never reduce
      capped = true
    }
  }

  const status = target >= 5 ? 'mastered' : target >= 1 ? 'in_progress' : 'unlocked'
  await prisma.skillNode.update({
    where: { id: opts.skillNodeId },
    data: {
      masteryLevel: target, status, masteryUpdatedAt: new Date(),
      nextReviewAt: getNextReviewDate(target), reviewIntervalDays: getReviewIntervalDays(target),
    },
  })
  await cascadeUnlock()

  return { newMasteryLevel: target, capped, gain: round25(target - current) }
}
