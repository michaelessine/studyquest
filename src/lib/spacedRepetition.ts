// SM-2 spaced repetition — masteryLevel is Float (0–5 in 0.5 increments)
const INTERVAL_DAYS: Record<number, number> = { 0: 1, 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 }

/** Round mastery to nearest integer for interval lookup */
function intLevel(ml: number): number {
  return Math.min(5, Math.max(0, Math.floor(ml)))
}

export function getNextReviewDate(masteryLevel: number): Date {
  const days = INTERVAL_DAYS[intLevel(masteryLevel)] ?? 1
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export function getReviewIntervalDays(masteryLevel: number): number {
  return INTERVAL_DAYS[intLevel(masteryLevel)] ?? 1
}

/** Called when user clicks "Review done" — grows interval by 1.5×, capped at 60 days */
export function advanceInterval(currentIntervalDays: number): { nextReviewAt: Date; reviewIntervalDays: number } {
  const newInterval = Math.min(Math.round(currentIntervalDays * 1.5), 60)
  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)
  return { nextReviewAt, reviewIntervalDays: newInterval }
}

/** Increment mastery by delta, capped at 5 */
export function incrementMastery(current: number, delta: number): number {
  return Math.min(5, Math.round((current + delta) * 2) / 2)
}
